/**
 * sync-check — gate de DRIFT del snapshot commiteado (issue #110).
 *
 * `sync:profile` verifica FRESCURA (el pin es ancestro de HEAD del SSOT); este
 * gate verifica RENDER: que `src/data/profile.generated.ts` sea exactamente lo
 * que el pipeline emite. Distinción que importa porque el gate de frescura
 * puede estar verde con CERO consumidores (bug #99): fresco no es lo mismo que
 * renderizado.
 *
 * Tres capas, de menor a mayor alcance:
 *
 *   1. self      (siempre): header coherente con `PROFILE.source` y el archivo
 *      byte-idéntico a `renderSource(PROFILE, engine, schema)`. Detecta edición
 *      a mano, header mentiroso y drift del renderer.
 *   2. fixture   (sin workspace): proyecta `src/data/fixtures/export-profile.json`
 *      —payload anonimizado con forma del engine— y verifica determinismo y
 *      filtro de privados. Corre en CI, que NO tiene acceso a profile-data.
 *   3. workspace (si hay `PROFILE_DATA_PATH` / `--workspace`): corre el pipeline
 *      real y compara byte a byte. Es la paridad de contenido contra el SSOT.
 *
 * Exit 0 sólo si todas las capas aplicables pasan; cualquier drift sale 1 con
 * el archivo:línea exacto (expected/actual) — nunca un "algo cambió".
 *
 * Uso:
 *   npm run sync:check
 *   npm run sync:check -- --workspace ../profile-data
 *   npm run sync:check -- --generated /tmp/profile.generated.ts   # gate sobre una copia
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertSchemaVersion, emptyReport, generateAll, projectProfile, renderSource, resolvePaths } from "./sync-profile";
import { PROFILE } from "../src/data/profile.generated";
import type { CvProfile, CvSource } from "../src/data/profile.types";

export const COMMITTED_PATH = resolve(process.cwd(), "src", "data", "profile.generated.ts");
export const FIXTURE_PATH = resolve(process.cwd(), "src", "data", "fixtures", "export-profile.json");

/* ──────────────────────────────────────────────
   Diff byte a byte — el gate dice archivo:línea
────────────────────────────────────────────── */

export interface SourceDiff {
  line: number;
  expected: string;
  actual: string;
}

/** Primera divergencia entre lo esperado (pipeline) y lo commiteado. */
export function diffSources(expected: string, actual: string): SourceDiff | null {
  const e = expected.split("\n");
  const a = actual.split("\n");
  const n = Math.max(e.length, a.length);
  for (let i = 0; i < n; i++) {
    if (e[i] !== a[i]) {
      return { line: i + 1, expected: e[i] ?? "(EOF)", actual: a[i] ?? "(EOF)" };
    }
  }
  return null;
}

export function formatDiff(path: string, diff: SourceDiff): string {
  const cut = (s: string) => (s.length > 160 ? `${s.slice(0, 157)}…` : s);
  return [
    `✗ drift en ${path}:${diff.line}`,
    `  esperado: ${cut(diff.expected)}`,
    `  actual:   ${cut(diff.actual)}`
  ].join("\n");
}

/* ──────────────────────────────────────────────
   Header del snapshot
────────────────────────────────────────────── */

export interface SnapshotHeader {
  commit: string;
  generatedAt: string | null;
  engine: string;
  schema: string;
}

export function parseHeader(source: string): SnapshotHeader | null {
  const pin = source.match(/^\/\/ source: profile-data @ (\S+) · generatedAt (null|"([^"]+)")$/m);
  const engine = source.match(/^\/\/ engine @ (\S+) · schema v(\S+)$/m);
  if (!pin || !engine) return null;
  return {
    commit: pin[1],
    generatedAt: pin[2] === "null" ? null : (pin[3] ?? null),
    engine: engine[1],
    schema: engine[2]
  };
}

/** El header no puede mentir sobre la procedencia del `PROFILE` que lo acompaña. */
export function headerProblems(source: string, profile: CvProfile): string[] {
  const problems: string[] = [];
  const header = parseHeader(source);
  if (!header) return ["header AUTO-GENERATED ausente o malformado (source/engine/schema)"];
  if (header.commit !== profile.source.commit) {
    problems.push(
      `header pin ${header.commit} ≠ PROFILE.source.commit ${profile.source.commit} — editado a mano o mezcla de dos syncs`
    );
  }
  if (header.generatedAt !== profile.source.generatedAt) {
    problems.push(
      `header generatedAt ${JSON.stringify(header.generatedAt)} ≠ PROFILE.source.generatedAt ${JSON.stringify(profile.source.generatedAt)}`
    );
  }
  return problems;
}

/* ──────────────────────────────────────────────
   Capa 2 — fixture export (CI sin profile-data)
────────────────────────────────────────────── */

export interface FixtureEnvelope {
  schemaVersion: string;
  engine: { name: string; version: string };
  source: { repo?: string; commit: string; commitDate?: string | null; generatedAt?: string | null };
  profile: Record<string, unknown>;
}

const FIXTURE_PRIVATE_MARKERS = [
  "private-artifact",
  "https://example.test/private/artifact",
  "private-credential",
  "https://example.test/private/credential"
];

/** Proyecta el fixture con el MISMO código que el snapshot real. */
export function renderFixture(raw: unknown): { source: string; profile: CvProfile } {
  const fixture = raw as FixtureEnvelope;
  assertSchemaVersion(String(fixture.schemaVersion ?? ""));
  const source: CvSource = {
    repo: fixture.source?.repo ?? "",
    commit: fixture.source?.commit ?? "",
    commitDate: fixture.source?.commitDate ?? null,
    generatedAt: null
  };
  const profile = projectProfile(fixture.profile, source, emptyReport());
  return { source: renderSource(profile, fixture.engine.version, fixture.schemaVersion), profile };
}

/**
 * Invariantes que CI SÍ puede probar sin el repo privado:
 * schema aceptado, determinismo byte a byte y filtro de credenciales/artifacts
 * privados (entradas Y referencias). Nunca publica los marcadores que vigila.
 */
export function checkFixture(raw: unknown): { problems: string[]; profile: CvProfile } {
  const problems: string[] = [];
  let rendered: { source: string; profile: CvProfile };
  try {
    rendered = renderFixture(raw);
    const again = renderFixture(raw);
    if (rendered.source !== again.source) problems.push("proyección no determinista (dos corridas difieren)");
  } catch (err) {
    return { problems: [(err as Error).message], profile: PROFILE as unknown as CvProfile };
  }

  const { source, profile } = rendered;
  for (const marker of FIXTURE_PRIVATE_MARKERS) {
    if (source.includes(marker)) problems.push(`fuga: marcador privado del fixture en el snapshot (${marker})`);
  }
  if (profile.credentials.length !== 1) problems.push(`credentials: esperado 1 público, hay ${profile.credentials.length}`);
  if (profile.artifacts.length !== 1) problems.push(`artifacts: esperado 1 público, hay ${profile.artifacts.length}`);
  if (profile.experience.length !== 2) problems.push(`experience: esperado 2, hay ${profile.experience.length}`);
  if (profile.projects.length !== 2) problems.push(`projects: esperado 2, hay ${profile.projects.length}`);
  for (const project of profile.projects) {
    for (const url of project.links) {
      if (FIXTURE_PRIVATE_MARKERS.some((m) => url.includes(m))) {
        problems.push(`fuga: projects[].links referencia un locator privado (${url})`);
      }
    }
    for (const ev of project.evidence) {
      if (FIXTURE_PRIVATE_MARKERS.some((m) => ev.source.includes(m))) {
        problems.push(`fuga: evidence[].source referencia un locator privado (${ev.source})`);
      }
    }
  }
  return { problems, profile };
}

/* ──────────────────────────────────────────────
   Capas 1 y 3 — snapshot commiteado
────────────────────────────────────────────── */

export interface CheckOptions {
  /** Archivo a verificar (default: el commiteado). */
  generatedPath?: string;
  /** Workspace de profile-data (default: `PROFILE_DATA_PATH`). */
  workspace?: string;
}

export interface CheckResult {
  ok: boolean;
  failures: string[];
  notes: string[];
}

export function runCheck(opts: CheckOptions = {}): CheckResult {
  const generatedPath = opts.generatedPath ?? COMMITTED_PATH;
  const failures: string[] = [];
  const notes: string[] = [];

  if (!existsSync(generatedPath)) {
    return { ok: false, failures: [`no existe el snapshot: ${generatedPath}`], notes };
  }
  const target = readFileSync(generatedPath, "utf8");

  /* 1. self: el archivo es exactamente el render de su propio PROFILE.
     El header de referencia es el del archivo commiteado canónico (no el de
     un target arbitrario): así una copia con el header tocado también falla. */
  const canonical = readFileSync(COMMITTED_PATH, "utf8");
  const header = parseHeader(canonical);
  if (!header) {
    failures.push(`${COMMITTED_PATH}: header AUTO-GENERATED ausente o malformado`);
  } else {
    const profile = PROFILE as unknown as CvProfile;
    const expected = renderSource(profile, header.engine, header.schema);
    const diff = diffSources(expected, target);
    if (diff) failures.push(formatDiff(generatedPath, diff));
    for (const problem of headerProblems(target, profile)) failures.push(`${generatedPath}: ${problem}`);
    if (!diff && !headerProblems(target, profile).length) {
      notes.push(`self: render byte-idéntico (${target.length} bytes)`);
    }
  }

  /* 2. fixture: corre también con workspace, para no depender de él. */
  if (existsSync(FIXTURE_PATH)) {
    let fixture: unknown;
    try {
      fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
    } catch (err) {
      failures.push(`${FIXTURE_PATH}: JSON inválido (${(err as Error).message})`);
    }
    if (fixture) {
      const { problems, profile } = checkFixture(fixture);
      failures.push(...problems.map((p) => `fixture: ${p}`));
      if (!problems.length) {
        notes.push(
          `fixture: proyección determinista · ${profile.credentials.length} credential público · ` +
            `${profile.artifacts.length} artifact público · 0 privados`
        );
      }
    }
  } else {
    failures.push(`no existe el fixture export: ${FIXTURE_PATH}`);
  }

  /* 3. workspace: paridad real contra profile-data (local/agente, nunca CI). */
  const workspace = opts.workspace ?? resolvePaths().workspace;
  if (workspace) {
    try {
      const { source } = generateAll({ workspace });
      const diff = diffSources(source, target);
      if (diff) failures.push(formatDiff(generatedPath, diff));
      else notes.push(`workspace: sin drift contra ${workspace}`);
    } catch (err) {
      failures.push(`workspace: no se pudo regenerar (${(err as Error).message})`);
    }
  } else {
    notes.push("workspace: sin PROFILE_DATA_PATH — paridad de contenido NO verificada (modo CI)");
  }

  return { ok: failures.length === 0, failures, notes };
}

/* ──────────────────────────────────────────────
   CLI
────────────────────────────────────────────── */

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): number {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("sync-check [--workspace <path>] [--generated <path>]");
    return 0;
  }
  const result = runCheck({
    workspace: argValue("--workspace"),
    generatedPath: argValue("--generated")
  });
  for (const note of result.notes) console.log(`✓ ${note}`);
  for (const failure of result.failures) console.error(failure);
  if (result.ok) {
    console.log(`✅ sync:check OK — ${result.notes.length} capa(s) verificada(s)`);
    return 0;
  }
  console.error(`❌ sync:check FAIL — ${result.failures.length} problema(s)`);
  return 1;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) process.exit(main());
