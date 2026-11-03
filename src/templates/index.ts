/**
 * Ensamblado del CV (SPEC docs/REFACTOR_PLAN.md §3.2): index.html es 100%
 * generado a partir de src/templates + SALAS. `assembleHtml()` es la fuente de
 * verdad del output; build.ts lo escribe a disco y Vite lo bundlea.
 */
import { BODY_OPEN } from "./body_open.ts";
import { coverHtml } from "./cover_html.ts";
import { headHtml } from "./head_html.ts";
import { heroHtml } from "./hero_html.ts";
import { planoHtml } from "./plano_html.ts";
import { printCvHtml } from "./print_cv_html.ts";
import { roomsHtml } from "./sala_html.ts";
import type { CvProfile } from "../data/profile.types.ts";
import { PROFILE } from "../data/profile.generated.ts";

const FOOTER = `</body>
</html>
`;

/** index.html completo (orden = orden histórico del monolito). */
export function assembleHtml(): string {
  return (
    headHtml() +
    BODY_OPEN +
    // El print deriva del SSOT (CvProfile): el snapshot es `as const`, de ahí el cast.
    printCvHtml(PROFILE as unknown as CvProfile) +
    coverHtml() +
    heroHtml() +
    planoHtml() +
    roomsHtml() +
    FOOTER
  );
}
