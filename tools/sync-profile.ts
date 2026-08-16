/**
 * sync-profile — pipeline de dependencia: profile-data (SSOT) → src/data/profile.generated.ts
 *
 * SPEC: docs/SPEC.md §5.1 (Fase 1). La fuente factual del CV vive en el workspace privado
 * profile-data (content/*.yaml, contrato schema/profile.schema.json v1 del motor
 * profile-as-code). Este script la lee SOLO en build local / agente (D1, D14):
 * CI verifica paridad con el archivo commiteado (profile.generated.test.ts) sin acceso
 * al repo privado.
 *
 * Uso:
 *   npm run sync:profile             # genera src/data/profile.generated.ts (determinista)
 *   npm run sync:profile -- --report # además imprime warnings (ES faltante, pubs sin DOI, …)
 *
 * Contrato de determinismo (komuno VI/X): mismo input → mismo output byte a byte.
 * Orden canónico de keys en cada objeto; langMaps normalizadas a [en, es]; sin red.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import { parse } from "yaml";
import Ajv2020 from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

/* ──────────────────────────────────────────────
   Tipos (CV data model — SPEC §5.2)
────────────────────────────────────────────── */

export interface LangText {
  en: string;
  es?: string;
}

export interface Link {
  platform: string;
  label: string;
  url: string;
}

export interface ExperienceItem {
  role: LangText;
  org: LangText;
  start: string;
  end: string;
  highlights?: { en: string[]; es?: string[] };
}

export interface ProjectItem {
  name: string;
  status?: string;
  description?: LangText;
  links: string[];
  keywords: string[];
  evidence: { claim: LangText; source: string; verified?: string }[];
}

export interface PublicationItem {
  title: string;
  venue: string;
  year: number;
  doi?: string;
  orcidId?: string;
  /** Derivado: https://doi.org/<doi> si hay DOI; "" si no (v1.1 añade url explícita). */
  url: string;
}

export interface SkillItem {
  name: string;
  level?: string;
  keywords: string[];
  geoKeywords?: string[];
  platformWeights?: Record<string, number>;
}

export interface CVProfile {
  identity: {
    name: string;
    givenName: string;
    familyName: string;
    location?: string;
    photo?: string;
    links: Link[];
  };
  positioning: {
    statement: LangText;
    audiences: Record<string, LangText>;
    geo?: {
      semanticAssociations?: string[];
      citationsGoal?: LangText;
    };
  };
  headlines: { platform: string; lang: string; text: string }[];
  experience: ExperienceItem[];
  /** v1: vacío (la formación v1 vive en experience[] con role = título). v1.1: campo explícito. */
  education: { role: LangText; org: LangText; start: string; end: string }[];
  projects: ProjectItem[];
  publications: PublicationItem[];
  skills: SkillItem[];
  /** v1: vacío (los idiomas viven como comentario en skills.yaml). v1.1: [{ code, level }]. */
  languages: { code: string; level: string }[];
  keywords: {
    seo: Record<string, string[]>;
    geo: { associations: string[]; claims: string[] };
  };
  /** Procedencia del sync (GEO / auditabilidad). */
  source: { repo: string; commit: string; syncedAt: string };
}

/* ──────────────────────────────────────────────
   Config (parametrización — komuno XI; D14)
────────────────────────────────────────────── */

const DEFAULT_SCHEMA_REL = "../profile-as-code/schema/profile.schema.json";

function loadDotEnv(file: string): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

export function resolvePaths(cwd = process.cwd()) {
  loadDotEnv(resolve(cwd, ".env"));
  const workspace = process.env.PROFILE_DATA_PATH;
  const schemaPath =
    process.env.PROFILE_SCHEMA_PATH ??
    (workspace ? resolve(workspace, DEFAULT_SCHEMA_REL) : "");
  return { workspace, schemaPath };
}

/* ──────────────────────────────────────────────
   Lectura + validación del workspace
────────────────────────────────────────────── */

const CONTENT_FILES = [
  "identity",
  "positioning",
  "bios",
  "headlines",
  "skills",
  "experience",
  "projects",
  "publications",
  "keywords"
] as const;

/** Lee content/<file>.yaml y lo mergea por root property (mismo mapping que pac load). */
export function readWorkspace(workspace: string): Record<string, unknown> {
  const profile: Record<string, unknown> = {};
  for (const f of CONTENT_FILES) {
    const file = join(workspace, "content", `${f}.yaml`);
    if (!existsSync(file)) continue;
    profile[f] = parse(readFileSync(file, "utf8"));
  }
  return profile;
}

export function compileValidator(schemaPath: string): ValidateFunction {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

export interface SyncReport {
  missingEs: string[];
  publicationsWithoutLink: string[];
  urlsOutsideIdentity: string[];
}

/** Validación de hechos no expresables en JSON Schema (drift-lite, D12: warn no fail).
 *  Reglas (SPEC §4): projects[].links ⊆ identity.links; pub sin DOI → aviso.
 *  Excepciones documentadas: identity.photo (asset) y evidence[].source (fuente de
 *  verificación externa) NO se chequean contra links canónicos. */
export function driftReport(profile: Record<string, unknown>): SyncReport {
  const report: SyncReport = { missingEs: [], publicationsWithoutLink: [], urlsOutsideIdentity: [] };
  const identity = profile.identity as { links?: { url: string }[] } | undefined;
  const known = new Set((identity?.links ?? []).map((l) => l.url));

  const walkLang = (prefix: string, v: unknown): void => {
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.en === "string" && !o.es && o.en.length > 0) {
        report.missingEs.push(prefix);
      }
      for (const [k, val] of Object.entries(o)) walkLang(`${prefix}.${k}`, val);
    }
  };
  for (const [root, value] of Object.entries(profile)) walkLang(root, value);

  const projects = profile.projects as { name?: string; links?: string[] }[] | undefined;
  for (const [i, p] of (projects ?? []).entries()) {
    for (const url of p.links ?? []) {
      if (!known.has(url)) report.urlsOutsideIdentity.push(`projects.${i}.links = ${url}`);
    }
  }

  const pubs = profile.publications as { title: string; doi?: string }[] | undefined;
  for (const p of pubs ?? []) {
    if (!p.doi) report.publicationsWithoutLink.push(p.title);
  }
  return report;
}

/* ──────────────────────────────────────────────
   Normalización v1 → CV data model (SPEC §5.2)
   Dual-shape: soporta v1 (strings) y v1.1 (langMaps/arrays) sin bloqueo.
────────────────────────────────────────────── */

function toLang(v: unknown, path: string, report: SyncReport): LangText {
  if (v && typeof v === "object" && typeof (v as LangText).en === "string") return v as LangText;
  if (typeof v === "string") {
    if (v.length) report.missingEs.push(path);
    return { en: v };
  }
  return { en: String(v ?? "") };
}

/** v1: highlights = string langMap con frases separadas por ". " (el "·" agrupa sub-items
 *  dentro de una frase, como renderiza el CV). v1.1: array de strings ya. */
export function highlightsToArray(v: unknown): { en: string[]; es?: string[] } | undefined {
  if (!v || typeof v !== "object") return undefined;
  const out = {} as { en: string[]; es?: string[] };
  const map = v as Record<string, unknown>;
  for (const lang of ["en", "es"] as const) {
    const val = map[lang];
    if (typeof val === "string") {
      out[lang] = val
        .split(/\.\s+/)
        .map((s) => s.trim().replace(/\.$/, ""))
        .filter((s) => s.length > 0);
    } else if (Array.isArray(val)) {
      out[lang] = val.map((s) => String(s).trim()).filter((s) => s.length > 0);
    }
  }
  if (!out.en) return undefined;
  return out;
}

function splitName(name: string): { givenName: string; familyName: string } {
  const parts = name.trim().split(/\s+/);
  return { givenName: parts[0] ?? "", familyName: parts.slice(1).join(" ") };
}

export function normalize(raw: Record<string, unknown>, report: SyncReport): CVProfile {
  const identity = (raw.identity ?? {}) as Record<string, unknown>;
  const { givenName, familyName } = splitName(String(identity.name ?? ""));

  const experience: ExperienceItem[] = ((raw.experience as Record<string, unknown>[]) ?? []).map(
    (e) => ({
      role: toLang(e.role, "experience.role", report),
      org: toLang(e.org, "experience.org", report),
      start: String(e.start ?? ""),
      end: String(e.end ?? "present"),
      ...(e.highlights ? { highlights: highlightsToArray(e.highlights) } : {})
    })
  );

  const projects: ProjectItem[] = ((raw.projects as Record<string, unknown>[]) ?? []).map((p) => ({
    name: String(p.name ?? ""),
    ...(p.status ? { status: String(p.status) } : {}),
    ...(p.description ? { description: p.description as LangText } : {}),
    links: ((p.links as string[]) ?? []).map(String),
    keywords: ((p.keywords as string[]) ?? []).map(String),
    evidence: ((p.evidence as Record<string, unknown>[]) ?? []).map((ev) => ({
      claim: ev.claim as LangText,
      source: String(ev.source ?? ""),
      ...(ev.verified ? { verified: String(ev.verified) } : {})
    }))
  }));

  const publications: PublicationItem[] = ((raw.publications as Record<string, unknown>[]) ?? []).map(
    (p) => {
      const doi = typeof p.doi === "string" ? p.doi : undefined;
      return {
        title: String(p.title ?? ""),
        venue: String(p.venue ?? ""),
        year: Number(p.year ?? 0),
        ...(doi ? { doi } : {}),
        ...(typeof p.orcidId === "string" ? { orcidId: p.orcidId } : {}),
        url: doi ? `https://doi.org/${doi}` : ""
      };
    }
  );

  const skills: SkillItem[] = ((raw.skills as Record<string, unknown>[]) ?? []).map((s) => ({
    name: String(s.name ?? ""),
    ...(s.level ? { level: String(s.level) } : {}),
    keywords: ((s.keywords as string[]) ?? []).map(String),
    ...(s.geoKeywords ? { geoKeywords: (s.geoKeywords as string[]).map(String) } : {}),
    ...(s.platformWeights
      ? { platformWeights: s.platformWeights as Record<string, number> }
      : {})
  }));

  const positioning = (raw.positioning ?? {}) as Record<string, unknown>;
  const geo = (positioning.geo ?? {}) as Record<string, unknown>;

  return {
    identity: {
      name: String(identity.name ?? ""),
      givenName,
      familyName,
      ...(identity.location ? { location: String(identity.location) } : {}),
      ...(identity.photo ? { photo: String(identity.photo) } : {}),
      links: ((identity.links as Record<string, unknown>[]) ?? []).map((l) => ({
        platform: String(l.platform ?? ""),
        label: String(l.label ?? ""),
        url: String(l.url ?? "")
      }))
    },
    positioning: {
      statement: positioning.statement as LangText,
      audiences: (positioning.audiences ?? {}) as Record<string, LangText>,
      ...(Object.keys(geo).length
        ? {
            geo: {
              ...(geo.semanticAssociations
                ? { semanticAssociations: geo.semanticAssociations as string[] }
                : {}),
              ...(geo.citationsGoal ? { citationsGoal: geo.citationsGoal as LangText } : {})
            }
          }
        : {})
    },
    headlines: ((raw.headlines as Record<string, unknown>[]) ?? []).map((h) => ({
      platform: String(h.platform ?? ""),
      lang: String(h.lang ?? ""),
      text: String(h.text ?? "")
    })),
    experience,
    education: [],
    projects,
    publications,
    skills,
    languages: [],
    keywords: (raw.keywords ?? {}) as CVProfile["keywords"],
    source: {
      repo: "",
      commit: "",
      syncedAt: ""
    }
  };
}

/* ──────────────────────────────────────────────
   Emisión (render) — byte-estable
────────────────────────────────────────────── */

export function renderSource(profile: CVProfile, workspace: string): string {
  const header = [
    "// AUTO-GENERATED by tools/sync-profile.ts — DO NOT EDIT.",
    `// source: profile-data @ ${profile.source.commit || "?"} · synced ${profile.source.syncedAt}`,
    "// Regenerate: npm run sync:profile  (docs/SPEC.md Fase 1 — editar hechos = editar profile-data)"
  ].join("\n");
  return `${header}
export const PROFILE = ${JSON.stringify(profile, null, 2)} as const;
`;
}

function gitInfo(workspace: string): { repo: string; commit: string } {
  try {
    const commit = execSync(`git -C "${workspace}" rev-parse HEAD`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    let repo = "";
    try {
      repo = execSync(`git -C "${workspace}" remote get-url origin`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      }).trim();
    } catch {
      /* sin remote — ok */
    }
    return { repo, commit };
  } catch {
    return { repo: "", commit: "" };
  }
}

/** Pipeline completo: read → validate → drift → normalize → render. */
export function generateAll(opts?: { workspace?: string; schemaPath?: string; now?: Date }) {
  const { workspace: ws, schemaPath: sp } = resolvePaths();
  const workspace = opts?.workspace ?? ws;
  const schemaPath = opts?.schemaPath ?? sp;
  const now = opts?.now ?? new Date();
  if (!workspace) throw new Error("PROFILE_DATA_PATH no está definido (ver .env.example)");
  if (!schemaPath || !existsSync(schemaPath))
    throw new Error(`Schema no encontrado en PROFILE_SCHEMA_PATH: ${schemaPath || "(vacío)"}`);

  const raw = readWorkspace(workspace);
  const validate = compileValidator(schemaPath);
  if (!validate(raw)) {
    const detail = (validate.errors ?? [])
      .map((e) => `${e.instancePath || "(root)"} ${e.message}`)
      .join("\n  ");
    throw new Error(`profile-data no valida contra el contrato (schema v1):\n  ${detail}`);
  }

  const report = driftReport(raw);
  const profile = normalize(raw, report);
  const { repo, commit } = gitInfo(workspace);
  profile.source = { repo, commit, syncedAt: now.toISOString() };

  return { source: renderSource(profile, workspace), report, profile };
}

/* ──────────────────────────────────────────────
   CLI
────────────────────────────────────────────── */

const OUT = resolve(process.cwd(), "src", "data", "profile.generated.ts");

async function main(): Promise<void> {
  const reportFlag = process.argv.includes("--report");
  const { source, report } = generateAll();
  mkdirSync(join(process.cwd(), "src", "data"), { recursive: true });
  writeFileSync(OUT, source, "utf8");
  console.log(`✅ profile.generated.ts generado (${source.length} bytes) → ${OUT}`);
  if (reportFlag) {
    if (report.missingEs.length)
      console.log(`⚠️  sin traducción ES (${report.missingEs.length}):\n  ${report.missingEs.join("\n  ")}`);
    if (report.publicationsWithoutLink.length)
      console.log(`⚠️  publicaciones sin DOI/link (${report.publicationsWithoutLink.length}):\n  ${report.publicationsWithoutLink.join("\n  ")}`);
    if (report.urlsOutsideIdentity.length)
      console.log(`⚠️  URLs fuera de identity.links (${report.urlsOutsideIdentity.length}):\n  ${report.urlsOutsideIdentity.join("\n  ")}`);
    if (!report.missingEs.length && !report.publicationsWithoutLink.length && !report.urlsOutsideIdentity.length)
      console.log("✅ report limpio: sin warnings de drift.");
  }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  });
}
