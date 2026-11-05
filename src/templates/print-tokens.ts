/**
 * Tokens del print-CV (issue #122).
 *
 * Las reglas horizontales del CV impreso —el `border-bottom` de cada sección y
 * el `border-top` del footer de procedencia— salen de ACÁ: un solo lugar
 * declarado, con el teal del brand. Antes eran dos literales grises (`#ccc` en
 * `head_html.ts`, `#ddd` en `print_cv_html.ts`) y el print «plano» no compartía
 * el color de la marca.
 *
 * POR QUÉ una constante y no `var(--teal)`: la pantalla y el print viven en dos
 * bloques de `<style>` distintos (el global y el inline del bloque oculto) y el
 * PDF no hereda custom properties de un bloque que no aplica. La constante es
 * la fuente única del LITERAL; `print_cv.test.ts` falla si driftea del token
 * `--teal` de `head_html.ts`.
 */

/** Reglas del CV impreso: el teal del brand (`--teal` en pantalla). */
export const PRINT_RULE_COLOR = "#00c9c0";

/**
 * Logo de impresión: la variante «settled» A4 del brand kit (marca asentada,
 * pensada para papel). Se sirve con `assetAttrsFor`, igual que los favicons:
 * el espejo local es fallback del pin del CDN, nunca un segundo pin.
 */
export const PRINT_LOGO_PATH = "/assets/brand/logo-aurea-settled-print-a4.png";
