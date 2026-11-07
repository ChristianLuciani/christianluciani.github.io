/**
 * GOLDEN — política de declaración (invariante I1, ADR-001).
 *
 * La declaración vive en un **trailer de commit** (`Golden-Cambio: render|datos`),
 * no en el body del PR. El body es markdown: siempre hay una forma de escribirlo
 * que el parser no vea (`> ``` `, `<pre>`, comentario HTML) o que vea de más, y
 * ése fue el defecto que reapareció tres pases. Un trailer es metadata de git:
 * se lee con `git log`, no se renderiza como ejemplo y no se puede esconder.
 */
import { spawnSync } from "node:child_process";
import { BASELINE_PATH, COMPARATOR_PATH } from "./paths.ts";

export type Declaration = "render" | "datos";

export interface PolicyInput {
  /** El archivo exacto existía en la base del PR. */
  baselineInBase: boolean;
  /** Existía *algún* archivo en `tests/golden/`: el repo ya tenía baseline. */
  goldenFamilyInBase: boolean;
  /** `tests/golden/museo.html` difiere entre base y head. */
  changed: boolean;
  /** El comparador (`golden.test.ts`) existe en el head: sin él no hay gate. */
  comparatorPresent: boolean;
  /** Algún artefacto de datos cambió en el PR (condición de "datos"). */
  dataChanged: boolean;
  /** Trailer declarado en algún commit del PR. */
  declaration: Declaration | null;
}

export interface PolicyResult {
  ok: boolean;
  reason: string;
}

/** Estado de UN baseline de `tests/golden/` entre la base del PR y el head. */
export interface BaselineChange {
  readonly path: string;
  /** El archivo existe en la base del PR. */
  readonly inBase: boolean;
  /** El archivo ya no existe en el head (borrado o renombrado). */
  readonly removed?: boolean;
  /** El contenido difiere entre base y head. */
  readonly changed: boolean;
}

/**
 * Gate multi-baseline (#133/F5): la guarda no puede mirar sólo el baseline del
 * default. Cualquier `tests/golden/*.html` que exista en ambos lados y cambie
 * exige el trailer, o un PR puede mover el render de un tema no-default con su
 * snapshot regenerado y pasar verde en silencio.
 *
 * Un baseline que NO está en la base es un artefacto nuevo (un tema nuevo): se
 * exime, igual que el primer baseline del repo. Un baseline que desaparece es un
 * borrado/rename y exige `Golden-Cambio: render` (no lo justifica un sync).
 */
export function decideAll(input: {
  readonly baselines: readonly BaselineChange[];
  readonly comparatorPresent: boolean;
  readonly dataChanged: boolean;
  readonly declaration: Declaration | null;
}): PolicyResult {
  if (!input.comparatorPresent) {
    return {
      ok: false,
      reason: `no existe ${COMPARATOR_PATH} en este PR: sin comparador, el baseline no es un gate`
    };
  }

  const removed = input.baselines.filter((baseline) => baseline.removed);
  if (removed.length > 0 && input.declaration !== "render") {
    return {
      ok: false,
      reason:
        `baseline eliminado o renombrado: ${removed.map((item) => item.path).join(", ")}; ` +
        "declaralo con `Golden-Cambio: render` (un sync de datos no lo justifica)"
    };
  }
  if (removed.length > 0) {
    return {
      ok: true,
      reason: `baseline eliminado con 'Golden-Cambio: render': ${removed
        .map((item) => item.path)
        .join(", ")}`
    };
  }

  const touched = input.baselines.filter(
    (baseline) => baseline.inBase && baseline.changed
  );
  const added = input.baselines.filter((baseline) => !baseline.inBase);

  if (touched.length === 0) {
    return {
      ok: true,
      reason:
        added.length > 0
          ? `baseline nuevo (${added.map((item) => item.path).join(", ")}): la guarda rige desde el próximo PR`
          : "golden intacto: el render no cambió"
    };
  }
  if (input.declaration === "render") {
    return {
      ok: true,
      reason: `golden regenerado con 'Golden-Cambio: render' (${touched
        .map((item) => item.path)
        .join(", ")})`
    };
  }
  if (input.declaration === "datos") {
    if (!input.dataChanged) {
      return {
        ok: false,
        reason: "'Golden-Cambio: datos' sin cambios en los artefactos de datos: declaralo como render"
      };
    }
    return {
      ok: true,
      reason: `golden regenerado con 'Golden-Cambio: datos' y snapshot movido (${touched
        .map((item) => item.path)
        .join(", ")})`
    };
  }
  return {
    ok: false,
    reason:
      `${touched.map((item) => item.path).join(", ")} cambió sin declararlo: agregá el trailer ` +
      "'Golden-Cambio: render' (o 'datos' si lo movió un sync de datos: perfil o feed) en un commit del PR"
  };
}

/** `Golden-Cambio: render` | `Golden-Cambio: datos` (case-insensitive, una línea). */
export const TRAILER = /^Golden-Cambio:[ \t]*(render|datos)[ \t]*$/gim;

/**
 * Declaración más fuerte entre los mensajes de commit del PR: si algún commit
 * dice `render`, gana; `datos` sólo cuenta si no hay `render`.
 */
export function parseDeclaration(messages: string): Declaration | null {
  let found: Declaration | null = null;
  for (const match of messages.matchAll(TRAILER)) {
    if (match[1].toLowerCase() === "render") return "render";
    found = "datos";
  }
  return found;
}

/** Mensajes de commit entre `base` y `head` (git, sin red más allá del fetch). */
export function declarationBetween(base: string, head = "HEAD", cwd = process.cwd()): Declaration | null {
  const r = spawnSync("git", ["log", "--format=%B", `${base}..${head}`], { cwd, encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`no se pudo leer el log ${base}..${head}: ${(r.stderr ?? "").trim() || `exit ${r.status}`}`);
  }
  // `base..HEAD` vacío = historial insuficiente (checkout shallow o base no
  // ancestro): devolver null ahí apagaría la guarda en silencio. El workflow
  // hace checkout con `fetch-depth: 0`, así que este caso es un error duro.
  const count = spawnSync("git", ["rev-list", "--count", `${base}..${head}`], { cwd, encoding: "utf8" });
  if (count.status !== 0 || Number.parseInt(count.stdout.trim(), 10) === 0) {
    throw new Error(`historial insuficiente para ${base}..${head}: revisá fetch-depth en el workflow`);
  }
  return parseDeclaration(r.stdout);
}

/**
 * Decisión para el baseline del tema default (compatibilidad con la firma
 * histórica y sus tests). La guarda de CI usa `decideAll` sobre TODOS los
 * baselines (`golden:policy`); ésta conserva la exención del baseline que
 * introduce el repo y trata un rename como no-exento.
 */
export function decide(input: PolicyInput): PolicyResult {
  if (!input.comparatorPresent) {
    return {
      ok: false,
      reason: `no existe ${COMPARATOR_PATH} en este PR: sin comparador, el baseline no es un gate`
    };
  }
  if (!input.baselineInBase && input.goldenFamilyInBase) {
    return {
      ok: false,
      reason:
        `${BASELINE_PATH} es nuevo en un repo que ya tenía baseline: un rename no vuelve a ` +
        "ganar la exención de baseline nuevo"
    };
  }
  return decideAll({
    baselines: [
      { path: BASELINE_PATH, inBase: input.baselineInBase, changed: input.changed }
    ],
    comparatorPresent: true,
    dataChanged: input.dataChanged,
    declaration: input.declaration
  });
}

/**
 * Archivos del árbol de una ref.
 *
 * Una sola lectura de git: `cat-file -e` devolvía el mismo fallo para "el
 * archivo no está" y "la ref no existe", y leerlo como "baseline nuevo"
 * apagaba la guarda justo cuando no podía responder.
 */
export function treeOf(ref: string, cwd = process.cwd()): string[] {
  const r = spawnSync("git", ["ls-tree", "-r", "--name-only", ref], { cwd, encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`no se pudo leer ${ref}: ${(r.stderr ?? "").trim() || `exit ${r.status}`}`);
  }
  return r.stdout.split("\n").filter(Boolean);
}

/**
 * ¿El archivo cambió entre `base` y HEAD?
 *
 * `git diff --quiet` usa el exit 1 para "hay diferencias" y >1 para error real
 * (ref ausente, repo roto): tratarlos igual convertía un fallo de git en "el
 * render cambió".
 */
export function changedSince(base: string, path: string): boolean {
  const r = spawnSync("git", ["diff", "--quiet", base, "HEAD", "--", path], { stdio: "ignore" });
  if (r.status === 0) return false;
  if (r.status === 1) return true;
  throw new Error(`git diff falló (exit ${r.status ?? "sin código"}): no se puede decidir`);
}
