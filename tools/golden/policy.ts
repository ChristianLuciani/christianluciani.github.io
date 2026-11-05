/**
 * GOLDEN — política de declaración (invariante I1, ADR-001).
 *
 * Decisión pura y testeable: el baseline del render sólo puede moverse en un PR
 * que lo declara en el body. Vive acá —y no en YAML— para que la rama de fallo
 * tenga evidencia ejecutable: `tests/golden/policy.test.ts` cubre cada caso, y
 * `ci.yml` sólo aporta los tres datos (¿existe en la base?, ¿cambió?, ¿qué dice
 * el body?).
 */
import { execFileSync, spawnSync } from "node:child_process";

export interface PolicyInput {
  /** El archivo existía en la base del PR: si no, este PR introduce el baseline. */
  baselineInBase: boolean;
  /** `tests/golden/museo.html` difiere entre base y head. */
  changed: boolean;
  /** Body del PR, tal cual. */
  body: string;
}

export interface PolicyResult {
  ok: boolean;
  reason: string;
}

/**
 * `Render: cambia` (case-insensitive, al inicio de una línea) es la declaración.
 * Tolera las formas markdown habituales (`**Render:** cambia`, `> Render: cambia`).
 */
export const DECLARATION = /^[ \t>*_#-]*render[ \t*_]*:[ \t*_]*cambia\b/im;

/**
 * El body sin bloques de código: un ejemplo documentado en un fence no es una
 * declaración del PR — el README de este módulo lo contiene, y aceptarlo haría
 * que la guarda se auto-satisfaga.
 */
export function withoutCodeBlocks(body: string): string {
  // ``` y ~~~ son fences válidos en markdown: si sólo se quita uno, el ejemplo
  // del otro se lee como declaración.
  return body.replace(/(```|~~~)[\s\S]*?\1/g, "");
}

export function decide(input: PolicyInput): PolicyResult {
  if (!input.baselineInBase) {
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
    reason: "tests/golden/museo.html cambió sin declarar 'Render: cambia' en el body del PR"
  };
}

/** ¿El archivo existe en el commit `base`? */
function existsIn(base: string, path: string): boolean {
  try {
    execFileSync("git", ["cat-file", "-e", `${base}:${path}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * ¿El archivo cambió entre `base` y HEAD?
 *
 * `git diff --quiet` usa el exit 1 para "hay diferencias" y >1 para error real
 * (ref ausente, repo roto): tratarlos igual convertía un fallo de git en "el
 * render cambió" — y un error de infraestructura se leía como decisión.
 */
function changedSince(base: string, path: string): boolean {
  const r = spawnSync("git", ["diff", "--quiet", base, "HEAD", "--", path], { stdio: "ignore" });
  if (r.status === 0) return false;
  if (r.status === 1) return true;
  throw new Error(`git diff falló (exit ${r.status ?? "sin código"}): no se puede decidir`);
}

function main(): void {
  const base = process.env.BASE_SHA;
  if (!base) {
    console.error("::error::falta BASE_SHA (sha de la base del PR)");
    process.exit(2);
  }
  const path = "tests/golden/museo.html";
  try {
    execFileSync("git", ["fetch", "--depth=1", "origin", base], { stdio: "inherit" });
  } catch {
    console.error(`::error::no se pudo traer la base ${base}; la guarda no puede decidir`);
    process.exit(2);
  }

  let result: PolicyResult;
  try {
    result = decide({
      baselineInBase: existsIn(base, path),
      changed: changedSince(base, path),
      body: process.env.PR_BODY ?? ""
    });
  } catch (error) {
    console.error(`::error::${(error as Error).message}`);
    process.exit(2);
  }

  console.log(result.reason);
  if (!result.ok) {
    console.error(`::error::${result.reason}`);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("policy.ts")) main();
