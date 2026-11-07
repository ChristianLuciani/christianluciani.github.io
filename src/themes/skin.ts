/**
 * Acceso a la PIEL del tema vigente (SPEC §5.6 · ADR-001 D11).
 *
 * Los renderers NO importan la piel del tema directo: piden `emitSkin()` acá.
 * Así ningún template conoce el id del tema (ADR-001 §2) y S3/S5 (registro de
 * narrativas + `SITE_THEME`) cambia este ÚNICO punto por
 * `THEMES[SITE_THEME].skin`, sin tocar `head_html.ts`.
 *
 * Mismo patrón que `src/content/copy.ts` con el pack del tema: el resolver es
 * uno, el dato del tema vive en `src/themes/<id>/`.
 */
import { emitSkinCss } from "./museo/skin.ts";

/**
 * CSS de la piel vigente listo para el `<style>`.
 *
 * `printRuleColor` entra por parámetro para que la constante del print-CV siga
 * siendo una sola (`src/templates/print-tokens.ts`): la piel la pide por
 * placeholder y el emisor la resuelve; no hay un segundo `#00c9c0` escrito a
 * mano en el CSS.
 */
export function emitSkin(printRuleColor: string): string {
  return emitSkinCss(printRuleColor);
}
