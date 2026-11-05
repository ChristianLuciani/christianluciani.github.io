/**
 * Prosa de perfil — UNA pieza, derivada del SSOT (issue #122).
 *
 * QUÉ ES: la SELECCIÓN de qué campo de `PROFILE.positioning` se imprime como
 * prosa de perfil. No es texto: el texto es un hecho del SSOT (`profile-data`,
 * `positioning.statement`) y lo consumen las DOS superficies que lo muestran —
 * el print-CV (`print_cv_html.ts`) y la sala de Perfil del sitio
 * (`sala_html.ts`). Mover el dato en el SSOT mueve las dos; no queda una copia
 * a mano que derive de la otra.
 *
 * POR QUÉ (SPEC §3, #122): un mismo claim escrito en dos archivos que hay que
 * mantener coherentes es un defecto de arquitectura, no una tarea de curación.
 * El claim «más de 20 años» vivía así —dos redacciones distintas, sin respaldo
 * en el SSOT— y `positioning.statement` ya existía proyectado.
 *
 * FALLBACK DECLARADO: si el SSOT no trajera `statement`, se imprime
 * `audiences.recruiters` (también dato, con números y fuente). Si tampoco
 * estuviera, el render FALLA con la razón exacta: nunca una segunda copia a
 * mano ni una cadena vacía silenciosa.
 */
import type { CvProfile, LangText } from "../../data/profile.types.ts";

/** Rutas del SSOT que esta pieza puede imprimir. */
export type ProfileProseField =
  | "positioning.statement"
  | "positioning.audiences.recruiters";

export interface ProfileProseSelection {
  /** Campo primario: lo que se imprime si existe. */
  field: ProfileProseField;
  /** Campo de reemplazo si el primario faltara (mismo SSOT, nunca copy). */
  fallback: ProfileProseField;
}

/** Selección canónica: la narrativa vigente del SSOT. */
export const PROFILE_PROSE: ProfileProseSelection = {
  field: "positioning.statement",
  fallback: "positioning.audiences.recruiters"
};

/** Lee un campo declarado de `positioning`; `undefined` si el SSOT no lo trae. */
export function profileProseField(
  profile: CvProfile,
  field: ProfileProseField
): LangText | undefined {
  switch (field) {
    case "positioning.statement":
      return profile.positioning?.statement;
    case "positioning.audiences.recruiters":
      return profile.positioning?.audiences?.recruiters;
  }
  return undefined; // el union es exhaustivo; explícito por noImplicitReturns
}

/**
 * Texto de la prosa de perfil: primario → fallback declarado → falla ruidosa.
 * Un `es` vacío NO salta al fallback: el campo existe y el renderer cae a su
 * `en` (misma pieza, otro idioma).
 */
export function profileProse(
  profile: CvProfile,
  selection: ProfileProseSelection = PROFILE_PROSE
): LangText {
  const primary = profileProseField(profile, selection.field);
  if (primary && (primary.es || primary.en)) return primary;
  const fallback = profileProseField(profile, selection.fallback);
  if (fallback && (fallback.es || fallback.en)) return fallback;
  throw new Error(
    `prosa de perfil ausente: PROFILE.${selection.field} y su fallback declarado ` +
      `PROFILE.${selection.fallback} no traen texto — el SSOT tiene que exponer ` +
      `el dato (nunca una copia a mano)`
  );
}
