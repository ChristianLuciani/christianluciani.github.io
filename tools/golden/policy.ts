/**
 * GOLDEN — política de declaración (invariante I1, ADR-001).
 *
 * Decisión pura y testeable: el baseline del render sólo puede moverse en un PR
 * que lo declara en el body. Vive acá —y no en YAML— para que la rama de fallo
 * tenga evidencia ejecutable: `tests/golden/policy.test.ts` cubre cada caso, y
 * `ci.yml` sólo aporta los datos (qué hay en la base, si cambió, qué dice el body).
 */
import { spawnSync } from "node:child_process";
import { BASELINE_PATH, COMPARATOR_PATH } from "./paths.ts";

export interface PolicyInput {
  /** El archivo exacto existía en la base del PR. */
  baselineInBase: boolean;
  /** Existía *algún* archivo en `tests/golden/`: el repo ya tenía baseline. */
  goldenFamilyInBase: boolean;
  /** `tests/golden/museo.html` difiere entre base y head. */
  changed: boolean;
  /** El comparador (`golden.test.ts`) existe en el head: sin él no hay gate. */
  comparatorPresent: boolean;
  /** Body del PR, tal cual. */
  body: string;
}

export interface PolicyResult {
  ok: boolean;
  reason: string;
}

/**
 * La declaración, al inicio de una línea: `Render: cambia` (cambió la
 * presentación) o `Datos: cambia` (cambió el snapshot del perfil y el render lo
 * refleja). Tolera las formas markdown habituales (`**Render:** cambia`,
 * `### Datos: cambia`).
 */
export const DECLARATION = /^[ \t>*_#-]*(render|datos)[ \t*_]*:[ \t*_]*cambia\b/im;

/**
 * El body sin código: un ejemplo documentado no es una declaración del PR.
 *
 * Máquina de estados por línea, no regex: un fence SIN cerrar deja el resto del
 * body como código (semántica markdown), y un fence de 4 backticks no lo cierra
 * uno de 3. Con regex el caso sin cerrar quedaba vivo y la guarda se
 * auto-satisfacía.
 */
export function withoutCodeBlocks(body: string): string {
  // Comentarios HTML: invisibles al leer el PR, pero el body los lleva. Un
  // `<!-- Render: cambia -->` satisfacía la guarda sin que nadie lo viera.
  const visible = body.replace(/<!--[\s\S]*?(-->|$)/g, "");
  const out: string[] = [];
  let fence: string | null = null;

  for (const line of visible.split("\n")) {
    const match = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const closes = match && match[1][0] === fence[0] && match[1].length >= fence.length;
      if (closes) fence = null;
      continue;
    }
    if (match) {
      fence = match[1];
      continue;
    }
    // Bloque indentado (4 espacios o tab) también es código en markdown.
    if (/^( {4}|\t)/.test(line)) continue;
    out.push(line);
  }
  return out.join("\n");
}

export function decide(input: PolicyInput): PolicyResult {
  if (!input.comparatorPresent) {
    return {
      ok: false,
      reason: `no existe ${COMPARATOR_PATH} en este PR: sin comparador, el baseline no es un gate`
    };
  }
  if (!input.baselineInBase && !input.goldenFamilyInBase) {
    return { ok: true, reason: "baseline nuevo en este PR: la guarda rige desde el próximo" };
  }
  if (!input.changed) {
    return { ok: true, reason: "golden intacto: el render no cambió" };
  }
  if (DECLARATION.test(withoutCodeBlocks(input.body))) {
    return { ok: true, reason: "golden regenerado y declarado en el body del PR" };
  }
  return {
    ok: false,
    reason: `${BASELINE_PATH} cambió sin declarar 'Render: cambia' (o 'Datos: cambia') en el body del PR`
  };
}

/**
 * Archivos del árbol de `base`.
 *
 * Una sola lectura de git: `cat-file -e` devolvía el mismo fallo para "el
 * archivo no está" y "la ref no existe", y leerlo como "baseline nuevo"
 * apagaba la guarda justo cuando no podía responder.
 */
export function treeOf(base: string, cwd = process.cwd()): string[] {
  const r = spawnSync("git", ["ls-tree", "-r", "--name-only", base], { cwd, encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`no se pudo leer la base ${base}: ${(r.stderr ?? "").trim() || `exit ${r.status}`}`);
  }
  return r.stdout.split("\n").filter(Boolean);
}

/** ¿El archivo existe en el commit `base`? */
export function existsIn(base: string, path: string, cwd = process.cwd()): boolean {
  return treeOf(base, cwd).includes(path);
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
