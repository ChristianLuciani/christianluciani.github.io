/**
 * GOLDEN — política de declaración (invariante I1, ADR-001).
 *
 * Decisión pura y testeable: el baseline del render sólo puede moverse en un PR
 * que lo declara en el body. Vive acá —y no en YAML— para que la rama de fallo
 * tenga evidencia ejecutable: `tests/golden/policy.test.ts` cubre cada caso, y
 * `ci.yml` sólo aporta los tres datos (¿existe en la base?, ¿cambió?, ¿qué dice
 * el body?).
 */
import { execFileSync } from "node:child_process";

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
export const DECLARATION = /^[ \t>*_-]*render[ \t*_]*:[ \t*_]*cambia\b/im;

/**
 * El body sin bloques de código: un ejemplo documentado en un fence no es una
 * declaración del PR — el README de este módulo lo contiene, y aceptarlo haría
 * que la guarda se auto-satisfaga.
 */
export function withoutCodeBlocks(body: string): string {
  return body.replace(/```[\s\S]*?```/g, "");
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

/** ¿El archivo cambió entre `base` y HEAD? */
function changedSince(base: string, path: string): boolean {
  try {
    execFileSync("git", ["diff", "--quiet", base, "HEAD", "--", path], { stdio: "ignore" });
    return false;
  } catch {
    return true;
  }
}

function main(): void {
  const base = process.env.BASE_SHA;
  if (!base) {
    console.error("::error::falta BASE_SHA (sha de la base del PR)");
    process.exit(2);
  }
  const path = "tests/golden/museo.html";
  execFileSync("git", ["fetch", "--depth=1", "origin", base], { stdio: "inherit" });

  const result = decide({
    baselineInBase: existsIn(base, path),
    changed: changedSince(base, path),
    body: process.env.PR_BODY ?? ""
  });

  console.log(result.reason);
  if (!result.ok) {
    console.error(`::error::${result.reason}`);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("policy.ts")) main();
