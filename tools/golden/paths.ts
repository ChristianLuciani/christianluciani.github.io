/**
 * GOLDEN — la ruta del baseline, en un solo lugar.
 *
 * Estaba repetida en el updater, el entrypoint de la guarda y el test: un rename
 * o la migración a un golden por tema podía dejar una copia mirando un archivo
 * muerto y la guarda pasaba en verde sin comparar nada.
 */
export const BASELINE_PATH = "tests/golden/museo.html";

/** Ruta absoluta del baseline para un root dado (build, test o CI). */
export function baselineFile(root: string): string {
  return `${root.replace(/\/+$/, "")}/${BASELINE_PATH}`;
}
