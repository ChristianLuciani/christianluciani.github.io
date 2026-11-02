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
  /** Proper noun — invariant across languages: the schema declares `org` as a plain
   *  string, never a langMap (SPEC §11/§15.6). Passing it through toLang() emitted
   *  one false "falta ES" per experience row. */
  org: string;
  start: string;
  end: string;
  highlights?: { en: string[]; es?: string[] };
}

/** v1.1/v1.3: formal education (root `education[]`), keep inside experience[] on v1. */
export interface EducationItem {
  id?: string;
  degree: LangText;
  /** Proper noun — institutions are never translated (schema: plain string). */
  institution: string;
  field?: LangText;
  start: string;
  end?: string;
  note?: LangText;
}

/** v1.1: spoken languages (root `languages[]`). */
export interface LanguageItem {
  code: string;
  level: string;
}

/** v1.4 (D17/§18): third-party attestations — the proof registry, not "evidence". */
export interface CredentialItem {
  id: string;
  kind: string;
  title: string;
  issuer: string;
  credentialId?: string;
  verifyUrl?: string;
  issued?: string;
  expires?: string;
}

/** v1.4 (D17/§18): works/media registry, pointer-first (`locator` XOR url|path). */
export interface ArtifactItem {
  id: string;
  kind: string;
  title: string;
  description?: LangText;
  locator: { url?: string; path?: string };
  checksum?: string;
  license?: string;
  tags?: string[];
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
  /** `url` explícita del SSOT (v1.1) o fallback derivado https://doi.org/<doi>;
   *  "" si no hay ninguna de las dos. */
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
  /** v1.1: explicit root `education[]` (v1 legacy kept it in experience[] role = título). */
  education: EducationItem[];
  projects: ProjectItem[];
  publications: PublicationItem[];
  skills: SkillItem[];
  /** v1.1: [{ code, level }] from root `languages[]`. */
  languages: LanguageItem[];
  /** v1.4/§18: registry roots; only `visibility: public` entries reach this public snapshot. */
  credentials: CredentialItem[];
  artifacts: ArtifactItem[];
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
  "education",
  "languages",
  "projects",
  "publications",
  "credentials",
  "artifacts",
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

  const pubs = profile.publications as { title: string; doi?: string; url?: string }[] | undefined;
  for (const p of pubs ?? []) {
    // Una `url` explícita (v1.1) resuelve el link igual que un DOI: sin ninguna de
    // las dos no hay ancla citable (preprints RG / abstracts sin DOI).
    if (!p.doi && !p.url) report.publicationsWithoutLink.push(p.title);
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

/**
 * Normalización v1 → CV data model (SPEC §5.2).
 *
 * DECISIÓN DE CONSUMIDOR (declarada 2026-11-02, deuda abierta — #101):
 * profile-as-code SPEC §7.5 dice que `visibility` es renderer-owned y que el
 * perfil normalizado ES el SSOT, no una superficie renderizada. Acá el filtro
 * vive en la capa de datos porque `profile.generated.ts` se COMMITEA en un repo
 * público: no hay renderer aguas abajo que pueda filtrar antes de publicar.
 * El filtro alcanza entradas (credentials/artifacts) y REFERENCIAS (§18.5
 * `no-private-in-public-output`): `projects[].links` y `evidence[].source` que
 * apunten a un locator/verifyUrl no público se descartan. Deuda: cuando el
 * engine exponga una noción de salida pública, el filtro se muda al consumidor
 * y este normalizador vuelve a ser fiel al SSOT.
 */
export function normalize(raw: Record<string, unknown>, report: SyncReport): CVProfile {
  const identity = (raw.identity ?? {}) as Record<string, unknown>;
  const { givenName, familyName } = splitName(String(identity.name ?? ""));

  // §18.5 (profile-as-code SPEC): un render público emite SOLO `visibility: public`
  // (ausente = public, $defs.visibility). Este archivo se commitea en un repo
  // público, así que private/unlisted no salen del workspace — ni como entradas
  // ni como referencias (fuga de PII, de obras privadas y de sus punteros).
  const isPublic = (entry: Record<string, unknown>): boolean =>
    (entry.visibility ?? "public") === "public";

  /** Targets que sólo pueden vivir en el workspace privado. Cualquier referencia
   *  desde otras raíces (`projects[].links`, `projects[].evidence[].source`) se
   *  descarta: la privacidad de la entrada no equivale a la del hecho que la cita. */
  const privateTargets = new Set<string>();
  for (const a of (raw.artifacts as Record<string, unknown>[]) ?? []) {
    if (isPublic(a)) continue;
    const locator = (a.locator ?? {}) as Record<string, unknown>;
    if (typeof locator.url === "string") privateTargets.add(locator.url);
    if (typeof locator.path === "string") privateTargets.add(locator.path);
  }
  for (const c of (raw.credentials as Record<string, unknown>[]) ?? []) {
    if (isPublic(c)) continue;
    if (typeof c.verifyUrl === "string") privateTargets.add(c.verifyUrl);
  }

  const experience: ExperienceItem[] = ((raw.experience as Record<string, unknown>[]) ?? []).map(
    (e) => ({
      role: toLang(e.role, "experience.role", report),
      // `org` es nombre propio invariante en el contrato: string, jamás langMap.
      org: String(e.org ?? ""),
      start: String(e.start ?? ""),
      end: String(e.end ?? "present"),
      ...(e.highlights ? { highlights: highlightsToArray(e.highlights) } : {})
    })
  );

  const education: EducationItem[] = ((raw.education as Record<string, unknown>[]) ?? []).map((e) => ({
    ...(e.id ? { id: String(e.id) } : {}),
    degree: toLang(e.degree, "education.degree", report),
    institution: String(e.institution ?? ""),
    ...(e.field != null ? { field: toLang(e.field, "education.field", report) } : {}),
    start: String(e.start ?? ""),
    ...(e.end != null ? { end: String(e.end) } : {}),
    ...(e.note != null ? { note: toLang(e.note, "education.note", report) } : {})
  }));

  const languages: LanguageItem[] = ((raw.languages as Record<string, unknown>[]) ?? []).map((l) => ({
    code: String(l.code ?? ""),
    level: String(l.level ?? "")
  }));

  const projects: ProjectItem[] = ((raw.projects as Record<string, unknown>[]) ?? []).map((p) => ({
    name: String(p.name ?? ""),
    ...(p.status ? { status: String(p.status) } : {}),
    ...(p.description ? { description: p.description as LangText } : {}),
    // Los punteros a un artifact/credential no público no se emiten (§18.5):
    // la entrada privada ya se filtró, pero el hecho que la referencia seguía
    // publicando su URL (p. ej. evidence.source → repo privado).
    links: ((p.links as string[]) ?? []).map(String).filter((u) => !privateTargets.has(u)),
    keywords: ((p.keywords as string[]) ?? []).map(String),
    evidence: ((p.evidence as Record<string, unknown>[]) ?? [])
      .map((ev) => ({
        claim: ev.claim as LangText,
        source: String(ev.source ?? ""),
        ...(ev.verified ? { verified: String(ev.verified) } : {})
      }))
      .filter((ev) => !privateTargets.has(ev.source))
  }));

  const publications: PublicationItem[] = ((raw.publications as Record<string, unknown>[]) ?? []).map(
    (p) => {
      const doi = typeof p.doi === "string" ? p.doi : undefined;
      // La `url` explícita del SSOT (v1.1) manda; el DOI solo es fallback.
      const explicitUrl =
        typeof p.url === "string" && p.url.trim().length > 0 ? p.url.trim() : undefined;
      return {
        title: String(p.title ?? ""),
        venue: String(p.venue ?? ""),
        year: Number(p.year ?? 0),
        ...(doi ? { doi } : {}),
        ...(typeof p.orcidId === "string" ? { orcidId: p.orcidId } : {}),
        url: explicitUrl ?? (doi ? `https://doi.org/${doi}` : "")
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

  const credentials: CredentialItem[] = ((raw.credentials as Record<string, unknown>[]) ?? [])
    .filter(isPublic)
    .map((c) => ({
      id: String(c.id ?? ""),
      kind: String(c.kind ?? ""),
      title: String(c.title ?? ""),
      issuer: String(c.issuer ?? ""),
      ...(c.credentialId ? { credentialId: String(c.credentialId) } : {}),
      ...(c.verifyUrl ? { verifyUrl: String(c.verifyUrl) } : {}),
      ...(c.issued ? { issued: String(c.issued) } : {}),
      ...(c.expires ? { expires: String(c.expires) } : {})
    }));

  const artifacts: ArtifactItem[] = ((raw.artifacts as Record<string, unknown>[]) ?? [])
    .filter(isPublic)
    .map((a) => {
      const locator = (a.locator ?? {}) as Record<string, unknown>;
      return {
        id: String(a.id ?? ""),
        kind: String(a.kind ?? ""),
        title: String(a.title ?? ""),
        ...(a.description != null
          ? { description: toLang(a.description, "artifacts.description", report) }
          : {}),
        locator: {
          ...(locator.url ? { url: String(locator.url) } : {}),
          ...(locator.path ? { path: String(locator.path) } : {})
        },
        ...(a.checksum ? { checksum: String(a.checksum) } : {}),
        ...(a.license ? { license: String(a.license) } : {}),
        ...(a.tags ? { tags: (a.tags as string[]).map(String) } : {})
      };
    });

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
    education,
    projects,
    publications,
    skills,
    languages,
    credentials,
    artifacts,
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
