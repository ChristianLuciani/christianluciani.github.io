/**
 * sync-check — gate de DRIFT del snapshot commiteado (issue #110).
 *
 * `sync:profile` verifica FRESCURA (el pin es ancestro de HEAD del SSOT); este
 * gate verifica RENDER del snapshot commiteado. Distinción que importa porque el
 * gate de frescura puede estar verde con CERO consumidores (bug #99): fresco no
 * es lo mismo que renderizado.
 *
 * Alcance real, capa por capa (no prometer de más):
 *
 *   1. self      (siempre): header coherente con `PROFILE.source` y el archivo
 *      byte-idéntico a `renderSource(PROFILE, engine, schema)`. El `PROFILE` es
 *      el importado del propio archivo: prueba consistencia interna
 *      (cuerpo ↔ header ↔ renderer), no autoría. Un edit manual coherente es su
 *      propio render y pasa; sólo muerde el edit inconsistente o el drift del
 *      renderer.
 *   2. fixture   (sin workspace): proyecta `src/data/fixtures/export-profile.json`
 *      —payload anonimizado con forma del engine— y verifica determinismo y
 *      filtro de `private`/`unlisted`. Corre en CI, que NO tiene acceso a
 *      profile-data.
 *   3. workspace (si hay `PROFILE_DATA_PATH` / `--workspace`): corre el pipeline
 *      real (`pasco export`) y compara byte a byte. Es la ÚNICA capa que prueba
 *      paridad de contenido contra el SSOT; sin ella el pipeline no se invoca.
 *
 * La línea de cierre cuenta sólo capas verificadas y declara las que quedaron
 * fuera (en CI: self + fixture = 2/3, workspace fuera con su razón). Cuando
 * `verified < total` dice `PARCIAL`, NUNCA `✅ OK`: sin `--workspace` sólo
 * `self`/`fixture` corrieron y ninguna compara contenido contra el SSOT. Exit 0
 * se mantiene si todas las capas que sí corrieron pasan (CI no tiene el repo
 * privado); cualquier drift sale 1 con el archivo:línea exacto
 * (expected/actual) — nunca un "algo cambió".
 *
 * Uso:
 *   npm run sync:check
 *   npm run sync:check -- --workspace ../profile-data
 *   npm run sync:check -- --generated /tmp/profile.generated.ts   # gate sobre una copia
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertSchemaVersion,
  emptyReport,
  engineProblems,
  generateAll,
  projectProfile,
  renderSource,
  resolvePaths
} from "./sync-profile";
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
  /** `data.source` del export (0.4.0): sólo `commit` y `generatedAt`. `repo` y
   *  `commitDate` los agrega el consumidor desde git; NO viajan en el payload. */
  source: { commit: string; generatedAt?: string | null };
  profile: Record<string, unknown>;
}

const FIXTURE_PRIVATE_MARKERS = [
  "private-artifact",
  "https://example.test/private/artifact",
  "private-credential",
  "https://example.test/private/credential"
];

/** `unlisted` tampoco es render público (§18.5: sólo `public`, ausente = public).
 *  Sin cobertura propia, una regresión a `visibility !== "private"` pasaría verde. */
const FIXTURE_UNLISTED_MARKERS = [
  "unlisted-artifact",
  "https://example.test/anon/artifact-42",
  "unlisted-credential",
  "https://example.test/anon/credential-42"
];

const FIXTURE_HIDDEN_MARKERS = [...FIXTURE_PRIVATE_MARKERS, ...FIXTURE_UNLISTED_MARKERS];

/** Proyecta el fixture con el MISMO código que el snapshot real. */
export function renderFixture(raw: unknown): { source: string; profile: CvProfile } {
  const fixture = raw as FixtureEnvelope;
  assertSchemaVersion(String(fixture.schemaVersion ?? ""));
  // `repo`/`commitDate` los deriva el consumidor del workspace (`gitInfo`); el
  // export no los emite y el fixture no los inventa. Sin workspace no hay git.
  const source: CvSource = {
    repo: "",
    commit: fixture.source?.commit ?? "",
    commitDate: null,
    generatedAt: fixture.source?.generatedAt ?? null
  };
  const profile = projectProfile(fixture.profile, source, emptyReport());
  return { source: renderSource(profile, fixture.engine.version, fixture.schemaVersion), profile };
}

/**
 * Invariantes que CI SÍ puede probar sin el repo privado:
 * identidad/versión del engine, schema aceptado, determinismo byte a byte y
 * filtro de `private`/`unlisted` en credenciales/artifacts (entradas Y
 * referencias, incluida `identity.links` y locators opacos que no llevan los
 * marcadores canónicos). Nunca publica los marcadores que vigila.
 */
export function checkFixture(raw: unknown): { problems: string[]; profile: CvProfile } {
  const problems: string[] = [];
  const fixture = raw as FixtureEnvelope;
  for (const problem of engineProblems(fixture?.engine)) problems.push(`engine: ${problem}`);
  let rendered: { source: string; profile: CvProfile };
  try {
    rendered = renderFixture(raw);
    const again = renderFixture(raw);
    if (rendered.source !== again.source) problems.push("proyección no determinista (dos corridas difieren)");
  } catch (err) {
    return { problems: [...problems, (err as Error).message], profile: PROFILE as unknown as CvProfile };
  }

  const { source, profile } = rendered;
  for (const marker of FIXTURE_HIDDEN_MARKERS) {
    if (source.includes(marker)) problems.push(`fuga: marcador no público del fixture en el snapshot (${marker})`);
  }
  if (profile.credentials.length !== 1) problems.push(`credentials: esperado 1 público, hay ${profile.credentials.length}`);
  if (profile.artifacts.length !== 1) problems.push(`artifacts: esperado 1 público, hay ${profile.artifacts.length}`);
  if (profile.experience.length !== 2) problems.push(`experience: esperado 2, hay ${profile.experience.length}`);
  if (profile.projects.length !== 2) problems.push(`projects: esperado 2, hay ${profile.projects.length}`);
  for (const link of profile.identity.links) {
    if (FIXTURE_HIDDEN_MARKERS.some((m) => link.url.includes(m))) {
      problems.push(`fuga: identity.links referencia un locator no público (${link.url})`);
    }
  }
  for (const project of profile.projects) {
    for (const url of project.links) {
      if (FIXTURE_HIDDEN_MARKERS.some((m) => url.includes(m))) {
        problems.push(`fuga: projects[].links referencia un locator no público (${url})`);
      }
    }
    for (const ev of project.evidence) {
      if (FIXTURE_HIDDEN_MARKERS.some((m) => ev.source.includes(m))) {
        problems.push(`fuga: evidence[].source referencia un locator no público (${ev.source})`);
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

export type LayerName = "self" | "fixture" | "workspace";

/** Estado de UNA capa. `verified` sólo es true si esa capa realmente corrió y
 *  pasó: una capa ausente (p. ej. workspace sin `PROFILE_DATA_PATH`) se registra
 *  `verified: false` con su razón, nunca como una nota de éxito más. */
export interface CheckLayer {
  name: LayerName;
  verified: boolean;
  note: string;
  reason?: string;
}

export interface CheckResult {
  ok: boolean;
  failures: string[];
  notes: string[];
  layers: CheckLayer[];
}

/**
 * Línea de cierre del gate: cuenta SÓLO capas verificadas y nombra las que
 * quedaron fuera con su razón. Con `verified < total` dice `PARCIAL` (nunca
 * `✅ OK`): en CI es `PARCIAL — 2/3` (self + fixture, sin paridad de contenido)
 * y con `--workspace` es `✅ OK — 3/3`. El exit code no cambia por el rótulo:
 * CI sigue verde sin workspace.
 */
export function summaryLine(layers: readonly CheckLayer[]): string {
  const verified = layers.filter((layer) => layer.verified);
  const skipped = layers.filter((layer) => !layer.verified);
  const complete = layers.length > 0 && skipped.length === 0;
  const label = complete ? "✅ sync:check OK" : "⚠️ sync:check PARCIAL";
  let line = `${label} — ${verified.length}/${layers.length} capa(s) verificada(s): ${
    verified.length ? verified.map((layer) => layer.name).join(", ") : "ninguna"
  }`;
  if (skipped.length) {
    line += `\n   ↳ no verificada(s): ${skipped
      .map((layer) => `${layer.name} — ${layer.reason ?? layer.note}`)
      .join("; ")}`;
  }
  return line;
}

export function runCheck(opts: CheckOptions = {}): CheckResult {
  const generatedPath = opts.generatedPath ?? COMMITTED_PATH;
  const failures: string[] = [];
  const layers: CheckLayer[] = [];
  const finish = (): CheckResult => ({
    ok: failures.length === 0,
    failures,
    notes: layers.map((layer) => layer.note),
    layers
  });

  if (!existsSync(generatedPath)) {
    failures.push(`no existe el snapshot: ${generatedPath}`);
    return finish();
  }
  const target = readFileSync(generatedPath, "utf8");

  /* 1. self: el archivo es exactamente el render de su propio PROFILE.
     El header de referencia es el del archivo commiteado canónico (no el de
     un target arbitrario): así una copia con el header tocado también falla. */
  const canonical = readFileSync(COMMITTED_PATH, "utf8");
  const header = parseHeader(canonical);
  if (!header) {
    failures.push(`${COMMITTED_PATH}: header AUTO-GENERATED ausente o malformado`);
    layers.push({
      name: "self",
      verified: false,
      note: "self: header AUTO-GENERATED ausente o malformado",
      reason: "header ausente o malformado"
    });
  } else {
    const profile = PROFILE as unknown as CvProfile;
    const expected = renderSource(profile, header.engine, header.schema);
    const diff = diffSources(expected, target);
    if (diff) failures.push(formatDiff(generatedPath, diff));
    const headerIssues = headerProblems(target, profile);
    for (const problem of headerIssues) failures.push(`${generatedPath}: ${problem}`);
    const verified = !diff && headerIssues.length === 0;
    layers.push({
      name: "self",
      verified,
      note: verified
        ? `self: render byte-idéntico (${target.length} bytes)`
        : "self: render con drift o header inconsistente",
      reason: verified ? undefined : "drift byte a byte o header que no coincide con PROFILE"
    });
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
      layers.push({
        name: "fixture",
        verified: problems.length === 0,
        note:
          problems.length === 0
            ? `fixture: proyección determinista · ${profile.credentials.length} credential público · ` +
              `${profile.artifacts.length} artifact público · 0 privados ni unlisted`
            : "fixture: problemas de proyección/filtro",
        reason: problems.length === 0 ? undefined : problems.join("; ")
      });
    } else {
      layers.push({
        name: "fixture",
        verified: false,
        note: "fixture: no se pudo proyectar",
        reason: "JSON inválido"
      });
    }
  } else {
    failures.push(`no existe el fixture export: ${FIXTURE_PATH}`);
    layers.push({
      name: "fixture",
      verified: false,
      note: "fixture: ausente",
      reason: `no existe ${FIXTURE_PATH}`
    });
  }

  /* 3. workspace: paridad real contra profile-data (local/agente, nunca CI).
     Sin workspace el pipeline NO se invoca: la capa queda declarada fuera. */
  const workspace = opts.workspace ?? resolvePaths().workspace;
  if (workspace) {
    try {
      const { source } = generateAll({ workspace });
      const diff = diffSources(source, target);
      if (diff) failures.push(formatDiff(generatedPath, diff));
      layers.push({
        name: "workspace",
        verified: !diff,
        note: diff ? "workspace: drift contra el pipeline real" : `workspace: sin drift contra ${workspace}`,
        reason: diff ? `drift en ${generatedPath}:${diff.line}` : undefined
      });
    } catch (err) {
      const message = (err as Error).message;
      failures.push(`workspace: no se pudo regenerar (${message})`);
      layers.push({
        name: "workspace",
        verified: false,
        note: "workspace: no se pudo regenerar",
        reason: message
      });
    }
  } else {
    layers.push({
      name: "workspace",
      verified: false,
      note: "workspace: sin PROFILE_DATA_PATH — paridad de contenido NO verificada (modo CI)",
      reason:
        "sin PROFILE_DATA_PATH ni --workspace; la paridad de contenido NO se verificó (modo CI)"
    });
  }

  return finish();
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
  for (const layer of result.layers) console.log(`${layer.verified ? "✓" : "–"} ${layer.note}`);
  for (const failure of result.failures) console.error(failure);
  if (result.ok) {
    console.log(summaryLine(result.layers));
    return 0;
  }
  console.error(`❌ sync:check FAIL — ${result.failures.length} problema(s)`);
  return 1;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) process.exit(main());
