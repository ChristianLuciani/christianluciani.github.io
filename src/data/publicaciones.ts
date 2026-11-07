/**
 * PUBLICACIONES PRESENTADAS — proyección del SSOT bajo la curación del tema.
 *
 * QUÉ ES: las publicaciones que el tema muestra y en qué orden, derivadas de
 * `PROFILE.publications` + `Curation.order.publicaciones`. No contiene hechos ni
 * copy: cada fila es la del SSOT.
 *
 * DEUDA DECLARADA (#99): La Biblioteca todavía renderiza sus filas desde el
 * pack de copy/template (con los hechos a mano); este módulo es la proyección
 * que la reemplazará. Mientras la deuda exista, el gate
 * `content/curation/render-drift.test.ts` exige que el ORDEN declarado en la
 * curación y el orden del DOM coincidan: cambiar la curación sin tocar el
 * render pone el suite rojo en vez de publicar dos verdades.
 *
 * La fila institucional de «36 guías» que la sala muestra NO sale de acá: no es
 * una publicación del SSOT, es la presentación del proyecto `Physics Lab Book`
 * dentro de La Biblioteca (SPEC §4, reconciliación declarada).
 */
import { DEFAULT_CURATION, isExcluded, type Curation } from "../content/curation/index.ts";
import { factId, publicationKey } from "../content/curation/keys.ts";
import { PROFILE } from "./profile.generated.ts";
import type { CvProfile, PublicationItem } from "./profile.types.ts";

export function publicacionesDe(
  profile: CvProfile = PROFILE as unknown as CvProfile,
  curation: Curation = DEFAULT_CURATION
): PublicationItem[] {
  const order = curation.order?.publicaciones ?? [];
  const position = new Map(order.map((key, index) => [key, index]));
  const rank = (publication: PublicationItem): number =>
    position.get(publicationKey(publication)) ?? Number.MAX_SAFE_INTEGER;
  return profile.publications
    .filter((publication) => !isExcluded(curation, factId("publicaciones", publicationKey(publication))))
    .sort((a, b) => rank(a) - rank(b));
}

/** Claves estables de las publicaciones presentadas, en orden. */
export function clavesDePublicaciones(
  profile: CvProfile = PROFILE as unknown as CvProfile,
  curation: Curation = DEFAULT_CURATION
): string[] {
  return publicacionesDe(profile, curation).map(publicationKey);
}
