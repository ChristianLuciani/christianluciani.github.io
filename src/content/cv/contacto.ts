/**
 * Links de contacto de El Buzón (sala Contacto) — DERIVADOS de
 * `PROFILE.identity.links`.
 *
 * QUÉ RESUELVE: la sala tenía la lista de links escrita a mano en el template
 * (`sala_html.ts`). Cuando profile-data agregó `substack` (#33, sincronizado acá
 * en #157) el link entró al snapshot y al `sameAs` del JSON-LD, pero nunca a la
 * página: nada comparaba el template contra `identity.links`. Es la misma clase
 * que #108 cerró para el print-CV —un hecho editable en `src/templates`— y el
 * DoD de SPEC FASE 2 («cero textos factuales editables en `src/templates`»).
 *
 * REGLA: la fila existe si la plataforma está en el SSOT; el `href` es el del
 * SSOT; el label sale del pack del tema (`room.contacto.<platform>`) y, si el
 * tema no lo declara, del `label` del SSOT. Dos excepciones DECLARADAS, no
 * defaults implícitos:
 *   · `website` no es contacto: es este mismo sitio.
 *   · una plataforma repetida se muestra una sola vez (gana la primera fila):
 *     el SSOT trae la cuenta de GitHub y tres repos con `platform: github`;
 *     en el Buzón va la cuenta, los repos viven en El Marco.
 *
 * ICONO: `assets/icons/<plataforma>.svg` con alias declarados abajo. Una
 * plataforma nueva sin icono rompe el build de publicación («icono sin
 * archivo», `build.ts`): agregar un link visible incluye su icono — el fallo es
 * ruidoso a propósito, nunca una fila sin icono ni un link que desaparece.
 */
import { activeCopy } from "../copy.ts";
import type { CvProfile } from "../../data/profile.types.ts";

export interface ContactLink {
  /** `platform` del SSOT (clave de la fila y del icono). */
  platform: string;
  /** URL del SSOT: única fuente del destino. */
  url: string;
  /** Archivo de `assets/icons/` sin extensión. */
  icon: string;
  /** Etiqueta visible: pack del tema si lo declara, `label` del SSOT si no. */
  label: string;
}

/** Plataformas que NO son contacto: `website` es este mismo sitio. */
const NOT_CONTACT: ReadonlySet<string> = new Set(["website"]);

/** Plataforma del SSOT → archivo de icono cuando el nombre no coincide. */
const ICON_ALIAS: Readonly<Record<string, string>> = { scholar: "googlescholar" };

/**
 * Filas del Buzón en el ORDEN del SSOT. El orden es del dato, no de la sala:
 * reordenar contactos es reordenar `identity.links` en profile-data, una sola
 * vez para todas las superficies.
 */
export function contactLinks(profile: CvProfile): ContactLink[] {
  const seen = new Set<string>();
  const links: ContactLink[] = [];
  for (const link of profile.identity.links) {
    if (NOT_CONTACT.has(link.platform) || seen.has(link.platform)) continue;
    seen.add(link.platform);
    links.push({
      platform: link.platform,
      url: link.url,
      icon: ICON_ALIAS[link.platform] ?? link.platform,
      label: activeCopy()[`room.contacto.${link.platform}`]?.es ?? link.label
    });
  }
  return links;
}
