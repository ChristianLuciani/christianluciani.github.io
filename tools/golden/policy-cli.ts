/**
 * GOLDEN — entrypoint de la guarda de CI.
 *
 * Separado de `policy.ts`: el entrypoint siempre corre, y su nombre es el que
 * invoca `package.json`. La decisión es una función pura testeada.
 */
import { ensureBase } from "./base.ts";
import { COMPARATOR_PATH, DATA_PATHS } from "./paths.ts";
import {
  changedSince,
  declarationBetween,
  decideAll,
  treeOf,
  type BaselineChange,
  type PolicyResult
} from "./policy.ts";

/** Baseline de UN tema registrado (`tests/golden/<id>.html`). */
const BASELINE_FILE = /^tests\/golden\/[a-z0-9-]+\.html$/;

/**
 * Anotación de GitHub: una sola línea. El stderr de git es multilínea y la
 * anotación se corta en el primer salto, así que la razón viaja colapsada
 * (el detalle completo seguiría perdiéndose igual, pero al menos no se corta
 * a mitad de la instrucción).
 */
function errorAnnotation(message: string): string {
  return `::error::${message.replace(/\s+/g, " ").trim()}`;
}

function main(): void {
  const base = process.env.BASE_SHA;
  if (!base) {
    console.error("::error::falta BASE_SHA (sha de la base del PR)");
    process.exit(2);
  }

  try {
    ensureBase(base);
  } catch (error) {
    console.error(errorAnnotation((error as Error).message));
    process.exit(2);
  }

  let result: PolicyResult;
  try {
    const tree = treeOf(base);
    const head = treeOf("HEAD");
    const baseBaselines = tree.filter((path) => BASELINE_FILE.test(path));
    const headBaselines = head.filter((path) => BASELINE_FILE.test(path));
    // F5 del pase fresco de #158: se miran TODOS los baselines, no sólo museo.
    // Un tema no-default puede mover su render + regenerar su snapshot y pasar
    // sin trailer si la guarda sólo compara el path del default.
    const baselines: BaselineChange[] = [
      ...headBaselines.map((path) => ({
        path,
        inBase: tree.includes(path),
        changed: changedSince(base, path)
      })),
      ...baseBaselines
        .filter((path) => !head.includes(path))
        .map((path) => ({ path, inBase: true, removed: true, changed: true }))
    ];
    result = decideAll({
      baselines,
      comparatorPresent: head.includes(COMPARATOR_PATH),
      dataChanged: DATA_PATHS.some((path) => changedSince(base, path)),
      declaration: declarationBetween(base)
    });
  } catch (error) {
    console.error(errorAnnotation((error as Error).message));
    process.exit(2);
  }

  console.log(result.reason);
  if (!result.ok) {
    console.error(errorAnnotation(result.reason));
    process.exit(1);
  }
}

main();
