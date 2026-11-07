/**
 * Ensamblado del CV (SPEC §5.4/§8 FASE 5.3 · ADR-001): index.html es 100%
 * generado a partir de src/templates + la narrativa del tema recibido.
 * `assembleHtml()` es la fuente de verdad del output; build.ts lo escribe a
 * disco y Vite lo bundlea.
 *
 * El tema es un PARÁMETRO, nunca un import: ningún template conoce un id de
 * tema. Sin opciones resuelve el default del registro; build.ts le pasa el
 * `SITE_THEME` ya resuelto.
 */
import { BODY_OPEN } from "./body_open.ts";
import { coverHtml } from "./cover_html.ts";
import { headHtml } from "./head_html.ts";
import { heroHtml } from "./hero_html.ts";
import { nowHtml } from "./now_html.ts";
import { planoHtml } from "./plano_html.ts";
import { printCvHtml } from "./print_cv_html.ts";
import { roomsHtml } from "./sala_html.ts";
import type { CvProfile } from "../data/profile.types.ts";
import { PROFILE } from "../data/profile.generated.ts";
import { DEFAULT_THEME, resolveTheme, withNarrative } from "../themes/index.ts";
import type { NarrativeManifest } from "../themes/types.ts";

const FOOTER = `</body>
</html>
`;

/**
 * Selector de render: id de tema (string: el build lo lee de `SITE_THEME`, así
 * que el valor no se puede garantizar en tipos) o un manifest ya resuelto
 * (tooling/tests). `resolveTheme` es quien valida el id en runtime.
 */
export interface AssembleOptions {
  theme?: string | NarrativeManifest;
}

/**
 * index.html completo (orden = orden histórico del monolito).
 *
 * `theme` se instala como narrativa activa SÓLO durante el ensamblado: copy,
 * salas, numeración y navegación salen de ahí. `withNarrative` restaura la
 * anterior incluso si un template lanza, así que el proceso no queda sucio.
 */
export function assembleHtml({ theme = DEFAULT_THEME }: AssembleOptions = {}): string {
  const narrative = typeof theme === "string" ? resolveTheme(theme) : theme;
  return withNarrative(narrative, () =>
    headHtml() +
    BODY_OPEN +
    // El print deriva del SSOT (CvProfile): el snapshot es `as const`, de ahí el cast.
    printCvHtml(PROFILE as unknown as CvProfile) +
    coverHtml() +
    heroHtml() +
    // Feed estático (#117): chrome, no hecho citable; va bajo el bloque de
    // identidad y por encima del plano del museo.
    nowHtml() +
    planoHtml() +
    roomsHtml() +
    FOOTER
  );
}
