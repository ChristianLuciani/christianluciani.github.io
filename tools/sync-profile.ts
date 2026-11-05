/**
 * sync-profile — pipeline de dependencia: profile-data (SSOT) → src/data/profile.generated.ts
 *
 * SPEC: docs/SPEC.md §5.1. La fuente factual del CV vive en el workspace privado
 * profile-data (content/*.yaml, contrato schema/profile.schema.json del motor
 * profile-as-code). La ÚNICA lectura de ese workspace es el contrato de export del
 * engine: `pasco export profile --json` (profile-as-code SPEC §7.5, #348). Este script
 * ya NO parsea YAML, NO valida con Ajv y NO reimplementa el normalizador del motor:
 * proyecta el `LoadedProfile` compilado (CvProfile, §5.2) — proyección explícita, no dump.
 *
 * CI verifica paridad con el archivo commiteado (profile.generated.test.ts) sin acceso
 * al repo privado. El build local / agente sí necesita el engine instalado y el workspace.
 *
 * Uso:
 *   npm run sync:profile                        # genera src/data/profile.generated.ts (determinista)
 *   npm run sync:profile -- --report            # además imprime warnings (ES faltante, pubs sin link, …)
 *   npm run sync:profile -- --now <iso8601>     # fija source.generatedAt (default: null)
 *
 * Contrato de determinismo (komuno VI/X): mismo input → mismo output byte a byte.
 * Sin `--now` el reloj no entra: `source.generatedAt` = null.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  ArtifactItem,
  CredentialItem,
  CvProfile,
  CvSource,
  EducationItem,
  ExperienceItem,
  LangText,
  LanguageItem,
  Link,
  ProjectItem,
  PublicationItem,
  SkillItem
} from "../src/data/profile.types";

/* ──────────────────────────────────────────────
   Config del engine (parametrización — D14)
────────────────────────────────────────────── */

/** Mínimo del contrato de export: `pasco export profile` + `doctor --json` (SPEC §7.6). */
const MIN_ENGINE_VERSION = "0.3.7";
const ENGINE_INSTALL = "npm install -g @profile-as-code/cli@0.3.7";
const ENGINE_HINT = `Instalá/actualizá el engine:\n  ${ENGINE_INSTALL}`;

function loadDotEnv(file: string): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

export function resolvePaths(cwd = process.cwd()): { workspace?: string } {
  loadDotEnv(resolve(cwd, ".env"));
  return { workspace: process.env.PROFILE_DATA_PATH };
}

/* ──────────────────────────────────────────────
   Engine: `pasco export profile --json` (contrato #348)
────────────────────────────────────────────── */

interface ExportEnvelope {
  command: string;
  ok: boolean;
  exitCode: number;
  data?: {
    schemaVersion: string;
    engine: { name: string; version: string };
    source: { commit: string; generatedAt: string | null };
    profile: Record<string, unknown>;
  };
}

function pasco(args: string[]): string {
  try {
    return execFileSync("pasco", args, {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    const e = err as {
      code?: string;
      status?: number;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
    };
    if (e.code === "ENOENT") {
      throw new Error(`pasco no está instalado. ${ENGINE_HINT}`);
    }
    const out = [e.stdout, e.stderr]
      .map((v) => (v == null ? "" : String(v)))
      .filter((s) => s.trim().length > 0)
      .join("\n")
      .trim();
    throw new Error(
      `pasco ${args.slice(0, 2).join(" ")} falló (exit ${e.status ?? "?"})${out ? `:\n${out}` : ""}\n` +
        `${ENGINE_HINT}`
    );
  }
}

function parseSemver(v: string): [number, number, number] {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
}

function semverLt(a: string, b: string): boolean {
  const av = parseSemver(a);
  const bv = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (av[i] !== bv[i]) return av[i] < bv[i];
  }
  return false;
}

function assertEngineVersion(version: string): void {
  if (semverLt(version, MIN_ENGINE_VERSION)) {
    throw new Error(
      `pasco ${version} es anterior al mínimo ${MIN_ENGINE_VERSION}. ${ENGINE_HINT}`
    );
  }
}

/** Major del payload de export que este consumidor entiende (SPEC §7.5 del engine:
 *  «a consumer refuses a version it does not know rather than guessing»). */
const SUPPORTED_SCHEMA_VERSION = "1";

/** FAIL (no warning) ante una versión de contrato desconocida: proyectar un payload
 *  de otra generación con los supuestos viejos es el drift que #107 quiere cerrar. */
export function assertSchemaVersion(version: string): void {
  if (version !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `pasco export profile: schemaVersion "${version || "(ausente)"}" desconocida; ` +
        `este consumidor sólo entiende v${SUPPORTED_SCHEMA_VERSION} (profile-as-code SPEC §7.5). ` +
        `Actualizá el consumidor o fijá el engine con el que se genera el snapshot.`
    );
  }
}

/** El perfil compilado + metadata del contrato (SPEC §7.5). */
export function exportProfile(
  workspace: string,
  now?: string
): {
  engine: { name: string; version: string };
  schemaVersion: string;
  commit: string;
  generatedAt: string | null;
  profile: Record<string, unknown>;
} {
  const args = ["export", "profile", "--json", "--workspace", workspace];
  if (now) args.push("--now", now);
  let envelope: ExportEnvelope;
  try {
    envelope = JSON.parse(pasco(args)) as ExportEnvelope;
  } catch (err) {
    if (err instanceof SyntaxError) throw new Error(`pasco export profile: JSON inválido (${err.message})`);
    throw err;
  }
  if (!envelope.ok || !envelope.data) {
    throw new Error(`pasco export profile no devolvió ok (exit ${envelope.exitCode})`);
  }
  const { engine, source, profile, schemaVersion } = envelope.data;
  assertEngineVersion(String(engine?.version ?? ""));
  assertSchemaVersion(String(schemaVersion ?? ""));
  return {
    engine,
    schemaVersion,
    commit: source?.commit ?? "",
    generatedAt: source?.generatedAt ?? null,
    profile
  };
}

/** `pasco doctor --json` reporta el CONTRATO que el engine valida (`schema.version`).
 *  El export de 0.3.7 sólo trae el major (`schemaVersion: "1"`); el header del CV
 *  necesita la etiqueta completa (v1.15). Metadata del engine, no datos del perfil. */
export function schemaLabel(workspace: string): string {
  const envelope = JSON.parse(pasco(["doctor", "--json", "--workspace", workspace])) as {
    ok?: boolean;
    data?: { schema?: { version?: string } };
  };
  const version = envelope.data?.schema?.version;
  if (!version) throw new Error("pasco doctor no reportó la versión del contrato (schema.version).");
  return version;
}

/* ──────────────────────────────────────────────
   Proyección pública (CvProfile — SPEC §5.2)
────────────────────────────────────────────── */

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x))
    : [];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/**
 * Dual-shape v1 → langMap (SPEC §5.2): el engine NO normaliza las uniones
 * `string | langMap` del schema (su `normalizeProfile()` sólo defaultea roots-lista),
 * así que un workspace schema-válido puede traer `role: "Engineer"`. La proyección
 * normaliza acá (string → `{ en: valor }`) y lo DECLARA en el reporte: nunca degrada
 * a `{ en: "" }` en silencio.
 */
function lang(v: unknown, path: string, report: SyncReport): LangText {
  if (typeof v === "string") {
    if (v.length) report.unexpectedShape.push(`${path}: string (shape v1) → langMap {en}`);
    return { en: v };
  }
  const o = asRecord(v);
  if (typeof o.en === "string") {
    return { en: o.en, ...(typeof o.es === "string" ? { es: o.es } : {}) };
  }
  if (v != null) report.unexpectedShape.push(`${path}: sin {en: string}`);
  return { en: "" };
}

/** Highlights dual-shape: v1.1 ya es `{ en: string[], es?: string[] }`; el v1 legacy
 *  es un string de frases separadas por ". " (el "·" agrupa sub-items dentro de una
 *  frase, como renderiza el CV). Devuelve `undefined` sólo si no hay EN. */
function pickHighlights(
  v: unknown,
  path: string,
  report: SyncReport
): { en: string[]; es?: string[] } | undefined {
  if (!v || typeof v !== "object") {
    if (v != null) report.unexpectedShape.push(`${path}: forma desconocida (${typeof v})`);
    return undefined;
  }
  const o = asRecord(v);
  let sawV1 = false;
  const split = (value: unknown): string[] | undefined => {
    if (typeof value === "string") {
      sawV1 = true;
      return value
        .split(/\.\s+/)
        .map((s) => s.trim().replace(/\.$/, ""))
        .filter((s) => s.length > 0);
    }
    if (Array.isArray(value)) return value.map(str).filter((s) => s.length > 0);
    return undefined;
  };
  const en = split(o.en);
  if (!en) {
    report.unexpectedShape.push(`${path}: sin highlights.en`);
    return undefined;
  }
  const es = split(o.es);
  if (sawV1) report.unexpectedShape.push(`${path}: string (shape v1) → array de bullets`);
  return { en, ...(es ? { es } : {}) };
}

function splitName(name: string): { givenName: string; familyName: string } {
  const parts = name.trim().split(/\s+/);
  return { givenName: parts[0] ?? "", familyName: parts.slice(1).join(" ") };
}

/**
 * Proyección pública `LoadedProfile → CvProfile` (SPEC §5.2).
 *
 * DECISIÓN DE CONSUMIDOR (declarada 2026-11-02, deuda abierta — #101):
 * profile-as-code SPEC §7.5 dice que `visibility` es renderer-owned y que el perfil
 * normalizado ES el SSOT, no una superficie renderizada. Acá el filtro vive en la capa
 * de datos porque `profile.generated.ts` se COMMITEA en un repo público: no hay renderer
 * aguas abajo que pueda filtrar antes de publicar. El filtro alcanza entradas
 * (credentials/artifacts) y REFERENCIAS (§18.5 `no-private-in-public-output`):
 * `projects[].links` y `evidence[].source` que apunten a un locator/verifyUrl no público
 * se descartan. Deuda: cuando el engine exponga una noción de salida pública, el filtro
 * se muda al consumidor y esta proyección vuelve a ser fiel al SSOT.
 *
 * Proyección explícita, NO dump: sólo los roots/fields que el CV usa. Fuera del archivo
 * commiteado quedan `bios`, `faq`, `flavor`, `deployments`, `checks`, `socialHandles`,
 * `press`, `releases`, `active`, `email`, `handle`, `timezone`, `nationality`, `authors`,
 * `kind`, `artifactRefs` e ids de fila que el contrato del CV no declara.
 */
export function projectProfile(
  raw: Record<string, unknown>,
  source: CvSource = { repo: "", commit: "", commitDate: null, generatedAt: null },
  report: SyncReport = emptyReport()
): CvProfile {
  const identity = asRecord(raw.identity);
  const name = str(identity.name);
  const { givenName, familyName } = splitName(name);

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
  for (const a of asArray(raw.artifacts)) {
    if (isPublic(a)) continue;
    const locator = asRecord(a.locator);
    if (typeof locator.url === "string") privateTargets.add(locator.url);
    if (typeof locator.path === "string") privateTargets.add(locator.path);
  }
  for (const c of asArray(raw.credentials)) {
    if (isPublic(c)) continue;
    if (typeof c.verifyUrl === "string") privateTargets.add(c.verifyUrl);
  }

  /** Ids de artifacts PÚBLICOS con `locator.url`: el conjunto contra el que
   *  `projects[].artifactRefs` decide "publicado" (#109). Visibilidad ausente =
   *  public ($defs.visibility, §18.5). */
  const publicArtifactIds = new Set<string>();
  for (const a of asArray(raw.artifacts)) {
    if (!isPublic(a)) continue;
    const locator = asRecord(a.locator);
    if (typeof a.id === "string" && a.id && typeof locator.url === "string" && locator.url) {
      publicArtifactIds.add(a.id);
    }
  }

  const links: Link[] = asArray(identity.links).map((l) => ({
    platform: str(l.platform),
    label: str(l.label),
    url: str(l.url)
  }));

  const positioning = asRecord(raw.positioning);
  const geo = asRecord(positioning.geo);

  const experience: ExperienceItem[] = asArray(raw.experience).map((e) => {
    const highlights = pickHighlights(e.highlights, "experience.highlights", report);
    return {
      role: lang(e.role, "experience.role", report),
      // `org` es nombre propio invariante en el contrato: string, jamás langMap.
      org: str(e.org),
      start: str(e.start),
      end: str(e.end) || "present",
      ...(highlights ? { highlights } : {})
    };
  });

  const education: EducationItem[] = asArray(raw.education).map((e) => ({
    ...(e.id ? { id: str(e.id) } : {}),
    degree: lang(e.degree, "education.degree", report),
    institution: str(e.institution),
    ...(e.field != null ? { field: lang(e.field, "education.field", report) } : {}),
    start: str(e.start),
    ...(e.end != null ? { end: str(e.end) } : {}),
    ...(e.note != null ? { note: lang(e.note, "education.note", report) } : {})
  }));

  const languages: LanguageItem[] = asArray(raw.languages).map((l) => ({
    code: str(l.code),
    level: str(l.level)
  }));

  const projects: ProjectItem[] = asArray(raw.projects).map((p) => ({
    name: str(p.name),
    ...(p.status ? { status: str(p.status) } : {}),
    ...(p.description != null ? { description: lang(p.description, "projects.description", report) } : {}),
    // Predicado de "publicado": ref a un artifact público con locator.url.
    // El id crudo NO se emite (podría apuntar a un artifact privado).
    published: (Array.isArray(p.artifactRefs) ? p.artifactRefs.map(str) : []).some((id) =>
      publicArtifactIds.has(id)
    ),
    // Los punteros a un artifact/credential no público no se emiten (§18.5):
    // la entrada privada ya se filtró, pero el hecho que la referencia seguía
    // publicando su URL (p. ej. evidence.source → repo privado).
    links: (Array.isArray(p.links) ? p.links.map(str) : []).filter((u) => !privateTargets.has(u)),
    keywords: Array.isArray(p.keywords) ? p.keywords.map(str) : [],
    evidence: asArray(p.evidence)
      .map((ev) => ({
        claim: lang(ev.claim, "projects.evidence.claim", report),
        source: str(ev.source),
        ...(ev.verified ? { verified: str(ev.verified) } : {})
      }))
      .filter((ev) => !privateTargets.has(ev.source))
  }));

  const publications: PublicationItem[] = asArray(raw.publications).map((p) => {
    const doi = typeof p.doi === "string" && p.doi.length > 0 ? p.doi : undefined;
    // La `url` explícita del SSOT (v1.1) manda; el DOI solo es fallback.
    const explicitUrl = typeof p.url === "string" && p.url.trim().length > 0 ? p.url.trim() : undefined;
    return {
      title: str(p.title),
      venue: str(p.venue),
      year: Number(p.year ?? 0),
      ...(doi ? { doi } : {}),
      ...(typeof p.orcidId === "string" ? { orcidId: p.orcidId } : {}),
      url: explicitUrl ?? (doi ? `https://doi.org/${doi}` : "")
    };
  });

  const skills: SkillItem[] = asArray(raw.skills).map((s) => ({
    name: str(s.name),
    ...(s.level ? { level: str(s.level) } : {}),
    keywords: Array.isArray(s.keywords) ? s.keywords.map(str) : [],
    ...(Array.isArray(s.geoKeywords) ? { geoKeywords: s.geoKeywords.map(str) } : {}),
    ...(s.platformWeights ? { platformWeights: s.platformWeights as Record<string, number> } : {})
  }));

  const credentials: CredentialItem[] = asArray(raw.credentials)
    .filter(isPublic)
    .map((c) => ({
      id: str(c.id),
      kind: str(c.kind),
      title: str(c.title),
      issuer: str(c.issuer),
      ...(c.credentialId ? { credentialId: str(c.credentialId) } : {}),
      ...(c.verifyUrl ? { verifyUrl: str(c.verifyUrl) } : {}),
      ...(c.issued ? { issued: str(c.issued) } : {}),
      ...(c.expires ? { expires: str(c.expires) } : {})
    }));

  const artifacts: ArtifactItem[] = asArray(raw.artifacts)
    .filter(isPublic)
    .map((a) => {
      const locator = asRecord(a.locator);
      return {
        id: str(a.id),
        kind: str(a.kind),
        title: str(a.title),
        ...(a.description != null ? { description: lang(a.description, "artifacts.description", report) } : {}),
        locator: {
          ...(locator.url ? { url: str(locator.url) } : {}),
          ...(locator.path ? { path: str(locator.path) } : {})
        },
        ...(a.checksum ? { checksum: str(a.checksum) } : {}),
        ...(a.license ? { license: str(a.license) } : {}),
        ...(Array.isArray(a.tags) ? { tags: a.tags.map(str) } : {})
      };
    });

  return {
    identity: {
      name,
      givenName,
      familyName,
      ...(identity.location ? { location: str(identity.location) } : {}),
      ...(identity.photo ? { photo: str(identity.photo) } : {}),
      links
    },
    positioning: {
      statement: lang(positioning.statement, "positioning.statement", report),
      audiences: Object.fromEntries(
        Object.entries(asRecord(positioning.audiences)).map(([k, v]) => [
          k,
          lang(v, `positioning.audiences.${k}`, report)
        ])
      ),
      ...(Object.keys(geo).length
        ? {
            geo: {
              ...(Array.isArray(geo.semanticAssociations)
                ? { semanticAssociations: geo.semanticAssociations.map(str) }
                : {}),
              ...(geo.citationsGoal != null ? { citationsGoal: lang(geo.citationsGoal, "positioning.geo.citationsGoal", report) } : {})
            }
          }
        : {})
    },
    headlines: asArray(raw.headlines).map((h) => ({
      platform: str(h.platform),
      lang: str(h.lang),
      text: str(h.text)
    })),
    experience,
    education,
    projects,
    publications,
    skills,
    languages,
    credentials,
    artifacts,
    keywords: {
      seo: Object.fromEntries(
        Object.entries(asRecord(asRecord(raw.keywords).seo)).map(([k, v]) => [
          k,
          Array.isArray(v) ? v.map(str) : []
        ])
      ),
      geo: {
        associations: Array.isArray(asRecord(asRecord(raw.keywords).geo).associations)
          ? (asRecord(asRecord(raw.keywords).geo).associations as unknown[]).map(str)
          : [],
        claims: Array.isArray(asRecord(asRecord(raw.keywords).geo).claims)
          ? (asRecord(asRecord(raw.keywords).geo).claims as unknown[]).map(str)
          : []
      }
    },
    source
  };
}

/* ──────────────────────────────────────────────
   Drift-lite (D12: warn no fail) — sobre la proyección
────────────────────────────────────────────── */

export interface SyncReport {
  missingEs: string[];
  publicationsWithoutLink: string[];
  urlsOutsideIdentity: string[];
  /** Formas que no son las esperadas por el contrato del CV (p. ej. dual-shape v1
   *  del engine): la proyección las normaliza y las declara acá — nunca en silencio. */
  unexpectedShape: string[];
}

export function emptyReport(): SyncReport {
  return { missingEs: [], publicationsWithoutLink: [], urlsOutsideIdentity: [], unexpectedShape: [] };
}

/** Validación de hechos no expresables en JSON Schema (drift-lite, D12: warn no fail).
 *  Reglas (SPEC §4): projects[].links ⊆ identity.links; pub sin DOI → aviso.
 *  Excepciones documentadas: identity.photo (asset) y evidence[].source (fuente de
 *  verificación externa) NO se chequean contra links canónicos. */
export function driftReport(profile: CvProfile): SyncReport {
  const report = emptyReport();
  const known = new Set(profile.identity.links.map((l) => l.url));

  const walkLang = (prefix: string, v: unknown): void => {
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.en === "string" && !o.es && o.en.length > 0) report.missingEs.push(prefix);
      for (const [k, val] of Object.entries(o)) walkLang(`${prefix}.${k}`, val);
    }
  };
  walkLang("profile", profile);

  for (const [i, p] of profile.projects.entries()) {
    for (const url of p.links) {
      if (!known.has(url)) report.urlsOutsideIdentity.push(`projects.${i}.links = ${url}`);
    }
  }

  // Una `url` explícita (v1.1) resuelve el link igual que un DOI: sin ninguna de
  // las dos no hay ancla citable (preprints RG / abstracts sin DOI).
  for (const p of profile.publications) {
    if (!p.doi && !p.url) report.publicationsWithoutLink.push(p.title);
  }
  return report;
}

/* ──────────────────────────────────────────────
   Emisión (render) — byte-estable
────────────────────────────────────────────── */

export function renderSource(
  profile: CvProfile,
  engine: string,
  schema: string
): string {
  const header = [
    "// AUTO-GENERATED by tools/sync-profile.ts — DO NOT EDIT.",
    `// source: profile-data @ ${profile.source.commit || "?"} · generatedAt ${JSON.stringify(profile.source.generatedAt ?? null)}`,
    `// engine @ ${engine} · schema v${schema}`,
    "// Regenerate: npm run sync:profile  (docs/SPEC.md §5.1 — editar hechos = editar profile-data)"
  ].join("\n");
  return `${header}
export const PROFILE = ${JSON.stringify(profile, null, 2)} as const;
`;
}

function gitInfo(workspace: string): { repo: string; commit: string; commitDate: string | null } {
  try {
    const commit = execFileSync("git", ["-C", workspace, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    // Fecha del commit del SSOT: determinista y siempre presente (a diferencia de
    // `generatedAt`, que es null salvo `--now`). La consume el footer del print (#108).
    let commitDate: string | null = null;
    try {
      commitDate =
        execFileSync("git", ["-C", workspace, "show", "-s", "--format=%cs", "HEAD"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"]
        }).trim() || null;
    } catch {
      /* sin fecha — el footer declara la ausencia */
    }
    let repo = "";
    try {
      repo = execFileSync("git", ["-C", workspace, "remote", "get-url", "origin"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      }).trim();
    } catch {
      /* sin remote — ok */
    }
    return { repo, commit, commitDate };
  } catch {
    return { repo: "", commit: "", commitDate: null };
  }
}

/** Pipeline completo: `pasco export profile` → proyección → render. */
export function generateAll(opts?: { workspace?: string; now?: string }) {
  const { workspace: ws } = resolvePaths();
  const workspace = opts?.workspace ?? ws;
  if (!workspace) throw new Error("PROFILE_DATA_PATH no está definido (ver .env.example)");

  const compiled = exportProfile(workspace, opts?.now);
  const schema = schemaLabel(workspace);
  const git = gitInfo(workspace);
  const source: CvSource = {
    repo: git.repo,
    commit: compiled.commit || git.commit,
    commitDate: git.commitDate,
    generatedAt: compiled.generatedAt
  };
  const report = emptyReport();
  const profile = projectProfile(compiled.profile, source, report);
  const drift = driftReport(profile);
  report.missingEs.push(...drift.missingEs);
  report.publicationsWithoutLink.push(...drift.publicationsWithoutLink);
  report.urlsOutsideIdentity.push(...drift.urlsOutsideIdentity);

  return {
    source: renderSource(profile, compiled.engine.version, schema),
    report,
    profile
  };
}

/* ──────────────────────────────────────────────
   CLI
────────────────────────────────────────────── */

const OUT = resolve(process.cwd(), "src", "data", "profile.generated.ts");

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const reportFlag = process.argv.includes("--report");
  const now = argValue("--now");
  const { source, report } = generateAll(now ? { now } : undefined);
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
    if (report.unexpectedShape.length)
      console.log(`⚠️  formas inesperadas normalizadas (${report.unexpectedShape.length}):\n  ${report.unexpectedShape.join("\n  ")}`);
    if (
      !report.missingEs.length &&
      !report.publicationsWithoutLink.length &&
      !report.urlsOutsideIdentity.length &&
      !report.unexpectedShape.length
    )
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
