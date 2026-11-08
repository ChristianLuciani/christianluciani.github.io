/**
 * GENERADO por herramientas/extract-monolith (one-shot) desde index.html (Fase-1).
 * NO editar a mano el contenido extraído; editar la fuente original y regenerar,
 * o editar directamente si es un cambio intencional de contenido.
 * bodyOpen(): apertura de <body> + skip-link.
 *
 * Función y no constante (F3 del pase fresco de #159): el skip-link es copy del
 * tema; una constante evaluaba `t()` al importar, con el default activo.
 */

import { t } from "../content/copy.ts";

export function bodyOpen(): string {
  return `
<body>
<a href="#room-perfil" class="skip-link">${t("cover.skipToContent")}</a>

`;
}
