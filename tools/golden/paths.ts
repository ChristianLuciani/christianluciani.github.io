/**
 * GOLDEN — la ruta del baseline, en un solo lugar.
 *
 * Estaba repetida en el updater, el entrypoint de la guarda y el test: un rename
 * o la migración a un golden por tema podía dejar una copia mirando un archivo
 * muerto y la guarda pasaba en verde sin comparar nada.
 */
export const BASELINE_PATH = "tests/golden/museo.html";

/** El snapshot del perfil: su cambio es la única causa legítima de "Datos". */
export const DATA_PATH = "src/data/profile.generated.ts";

/** El test que convierte el baseline en gate: sin él, la guarda no tiene diente. */
export const COMPARATOR_PATH = "tests/golden/golden.test.ts";

/** Ruta absoluta del baseline para un root dado (build, test o CI). */
export function baselineFile(root: string): string {
  return `${root.replace(/\/+$/, "")}/${BASELINE_PATH}`;
}
