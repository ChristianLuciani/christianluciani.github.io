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
 * Logo de impresión: el MARK «settled» del brand kit (marca asentada, estática).
 *
 * POR QUÉ 512 y no `logo-aurea-settled-print-a4.png`: el `-print-a4` no es una
 * marca sino una HOJA A4 compuesta (2480×3508) donde el mark ocupa 67%×48% de
 * la página; metido en una caja de 16 mm se descarga entero (325 KB) para
 * mostrar ~11 mm de marca con márgenes vacíos. El mark cuadrado de 512 px
 * pesa 48 KB y a 16 mm rinde ~813 dpi (muy por encima de los 300 dpi de
 * impresión). F2 del pase fresco de #122.
 *
 * Se sirve con `assetAttrsFor`, igual que los favicons: el espejo local es
 * fallback del pin del CDN, nunca un segundo pin.
 */
export const PRINT_LOGO_PATH = "/assets/brand/logo-aurea-settled-512.png";
