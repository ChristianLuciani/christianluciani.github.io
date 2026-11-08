/**
 * Links de contacto de El Buzón (sala Contacto) — filas y `href` derivados.
 *
 * QUÉ RESUELVE: la sala tenía la lista de links escrita a mano en el template
 * (`sala_html.ts`): 10 `<a>` con URL y `assets/icons/*.svg` hardcodeados. Cuando
 * profile-data agregó `substack` (#33, sincronizado acá en #157) el link entró
 * al snapshot y al `sameAs` del JSON-LD, pero nunca a la página: nada comparaba
 * el template contra `identity.links`. La misma clase que #108 cerró para el
 * print-CV —un hecho editable en `src/templates`— y el DoD de SPEC FASE 2.
 *
 * CONTRATO (#163):
 *   · MEMBRESÍA y ORDEN = `BUZON_CONTACT_PLATFORMS` (`content/cv/platforms.ts`),
 *     una lista declarada, no el orden del SSOT. Una plataforma que no está en
 *     la lista no se muestra aunque exista en el perfil: la decisión es
 *     editorial y está documentada (CREAR-TEMA §5).
 *   · `href` = la PRIMERA fila del SSOT con esa plataforma (la cuenta de
 *     GitHub; los repos viven en El Marco).
 *   · LABEL = copy del pack del tema (`room.contacto.<plataforma>`) vía
 *     `copy()`, el accesor ESTRICTO: una plataforma visible sin clave rompe el
 *     build con la clave exacta. No hay fallback al `label` del SSOT a
 *     propósito (F1 del pase fresco de #161): un fallback silencioso vuelve
 *     indistinguible «excepción declarada» de «clave olvidada», y un tema que
 *     omite `room.contacto.whatsapp` publicaría «WhatsApp» sin el número.
 *   · ICONO = `assets/icons/<plataforma>.svg` con alias declarados abajo. Una
 *     plataforma visible sin icono rompe el build de publicación («icono sin
 *     archivo», `build.ts`): no hay fila sin icono ni link que desaparece.
 *
 * Una plataforma DECLARADA sin fila en el SSOT no se inventa: la fila
 * desaparece hasta que el dato exista.
 */
import { copy } from "../copy.ts";
import { BUZON_CONTACT_PLATFORMS } from "./platforms.ts";
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

/** Plataforma del SSOT → archivo de icono cuando el nombre no coincide. */
const ICON_ALIAS: Readonly<Record<string, string>> = { scholar: "googlescholar" };

/**
 * Label visible de una plataforma. `copy()` es estricto: la clave faltante falla
 * con `room.contacto.<platform>` en el mensaje, nunca con un texto adivinado.
 */
export function contactLabel(platform: string): string {
  return copy(`room.contacto.${platform}`).es;
}

/** Archivo de icono de una plataforma (`assets/icons/<icon>.svg`). */
export function contactIcon(platform: string): string {
  return ICON_ALIAS[platform] ?? platform;
}

/**
 * Filas del Buzón en el ORDEN declarado, resueltas contra el SSOT. Una
 * plataforma declarada sin fila en `identity.links` se omite: no se inventa un
 * `href` ni se rellena con otra plataforma.
 */
export function contactLinks(profile: CvProfile): ContactLink[] {
  const links: ContactLink[] = [];
  for (const platform of BUZON_CONTACT_PLATFORMS) {
    const link = profile.identity.links.find((row) => row.platform === platform);
    if (!link) continue;
    links.push({
      platform,
      url: link.url,
      icon: contactIcon(platform),
      label: contactLabel(platform)
    });
  }
  return links;
}
