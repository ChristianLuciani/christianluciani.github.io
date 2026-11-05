/**
 * GOLDEN — la ruta del baseline, en un solo lugar.
 *
 * Estaba repetida en el updater, el entrypoint de la guarda y el test: un rename
 * o la migración a un golden por tema podía dejar una copia mirando un archivo
 * muerto y la guarda pasaba en verde sin comparar nada.
 */
export const BASELINE_PATH = "tests/golden/museo.html";

/**
 * Artefactos de datos que el render consume. Su cambio es la única causa
 * legítima de "Datos" (el perfil, el feed «Ahora» y —#140— la entidad JSON-LD
 * que `head_html.ts` serializa en el head).
 *
 * El conjunto lo vigila `tests/golden/policy.test.ts`: todo `*.generated.ts` de
 * `src/data/` tiene que estar acá, o un PR que sólo regenere ese dato queda
 * forzado a declarar `render` (drift de dos superficies, pase 7 F2).
 */
export const DATA_PATHS = [
  "src/data/profile.generated.ts",
  "src/data/now.generated.ts",
  "src/data/entity.generated.ts"
] as const;

/** El test que convierte el baseline en gate: sin él, la guarda no tiene diente. */
export const COMPARATOR_PATH = "tests/golden/golden.test.ts";

/** Ruta absoluta del baseline para un root dado (build, test o CI). */
export function baselineFile(root: string): string {
  return `${root.replace(/\/+$/, "")}/${BASELINE_PATH}`;
}
