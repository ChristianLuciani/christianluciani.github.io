/**
 * GOLDEN — entrypoint de la guarda de CI.
 *
 * Separado de `policy.ts` a propósito: cuando la ejecución dependía de
 * `process.argv[1].endsWith("policy.ts")`, renombrar el archivo dejaba el step
 * de CI verde sin decidir nada. Acá el entrypoint siempre corre y su nombre es
 * el que invoca `package.json`.
 */
import { execFileSync } from "node:child_process";
import { BASELINE_PATH, COMPARATOR_PATH, DATA_PATH } from "./paths.ts";
import { changedSince, decide, treeOf, type PolicyResult } from "./policy.ts";

function main(): void {
  const base = process.env.BASE_SHA;
  if (!base) {
    console.error("::error::falta BASE_SHA (sha de la base del PR)");
    process.exit(2);
  }

  try {
    execFileSync("git", ["fetch", "--depth=1", "origin", base], { stdio: "inherit" });
  } catch {
    console.error(`::error::no se pudo traer la base ${base}; la guarda no puede decidir`);
    process.exit(2);
  }

  let result: PolicyResult;
  try {
    const tree = treeOf(base);
    const head = treeOf("HEAD");
    result = decide({
      comparatorPresent: head.includes(COMPARATOR_PATH),
      baselineInBase: tree.includes(BASELINE_PATH),
      // Si ya había baseline en la base, una ruta "nueva" es un rename, no la
      // introducción: no puede volver a ganar la exención.
      goldenFamilyInBase: tree.some((path) => path.startsWith("tests/golden/")),
      changed: changedSince(base, BASELINE_PATH),
      dataChanged: changedSince(base, DATA_PATH),
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

main();
