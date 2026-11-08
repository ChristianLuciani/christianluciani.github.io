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
 * REGLA: la fila existe si la plataforma está en el SSOT; el `href` y el ORDEN
 * son los del SSOT. Excepciones DECLARADAS, no defaults implícitos:
 *   · `website` no es contacto: es este mismo sitio.
 *   · una plataforma repetida se muestra una sola vez (gana la primera fila):
 *     el SSOT trae la cuenta de GitHub y tres repos con `platform: github`;
 *     en el Buzón va la cuenta, los repos viven en El Marco.
 *
 * LABEL: siempre copy del pack del tema (`room.contacto.<plataforma>`) vía
 * `copy()`, el accesor ESTRICTO: una plataforma visible sin clave rompe el
 * build con la clave exacta, como cualquier otro copy. No hay fallback al
 * `label` del SSOT a propósito (F1 del pase fresco de #161): un fallback
 * silencioso vuelve indistinguible «excepción declarada» de «clave olvidada», y
 * un tema que omite `room.contacto.whatsapp` publicaría «WhatsApp» sin el
 * número. El `label` del SSOT nombra las filas de repo en El Marco, no acá.
 *
 * ICONO: `assets/icons/<plataforma>.svg` con alias declarados abajo. Una
 * plataforma nueva sin icono rompe el build de publicación («icono sin
 * archivo», `build.ts`): agregar un link visible incluye su icono — el fallo es
 * ruidoso a propósito, nunca una fila sin icono ni un link que desaparece.
 */
import { copy } from "../copy.ts";
import type { CvProfile } from "../../data/profile.types.ts";

export interface ContactLink {
  /** `platform` del SSOT (clave de la fila, del copy y del icono). */
  platform: string;
  /** URL del SSOT: única fuente del destino. */
  url: string;
  /** Archivo de `assets/icons/` sin extensión. */
  icon: string;
  /** Etiqueta visible: copy del pack (`room.contacto.<platform>`), sin fallback. */
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
      label: copy(`room.contacto.${link.platform}`).es
    });
  }
  return links;
}
