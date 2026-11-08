/**
 * Curación del print-CV (SPEC §5.3, D2) — el único otro lugar editable a mano.
 *
 * QUÉ ES: textos de ESTA superficie (prosa de perfil, títulos de sección,
 * etiquetas de presentación y qué links del SSOT entran al encabezado) y la
 * curación de `experience[]` en sus dos secciones (F1 de #116).
 * NO contiene hechos RENDERIZABLES: fechas, cargos, organizaciones,
 * publicaciones, conteos, idiomas y competencias salen de `PROFILE`
 * (`src/data/profile.generated.ts`). La clasificación de `experience[]` es un
 * campo del CONTRATO de curación (`Curation.experienceSections`) y la tabla del
 * tema `museo` vive en `content/curation/museo.ts`; este módulo sólo repite la
 * CLAVE de cada fila (`org|role|start`, o `id` si el SSOT lo expone) para
 * clasificarla: no imprime ninguno de esos valores.
 *
 * PROSA DE PERFIL (#122): NO es texto de este archivo. `profile` es una
 * SELECCIÓN de campo del SSOT (`ProfileProseSelection`, resolver en
 * `profile-prose.ts`) que consumen el print y la sala de Perfil: un mismo claim
 * en dos archivos que hay que mantener coherentes es un defecto de arquitectura
 * (SPEC §3), no una tarea de curación.
 *
 * EXCEPCIÓN DECLARADA (SPEC §5.3): la proyección no expone `id` de fila, así que
 * esta curación referencia los hechos por clave derivada. Es la única excepción
 * a «id estable» y tiene condición de salida: cuando el SSOT/proyección exponga
 * `id` en `experience[]`, la tabla migra a id (`experienceKey` ya lo prefiere).
 * Fuera de eso, si un valor tuviera que cambiar en dos archivos para mantenerse
 * coherente, sería un bug de arquitectura (SPEC §3), no una tarea de curación.
 * Si una fila del SSOT no está en la tabla (o cambió su clave), el render falla
 * — la deriva se ve, no se adivina ni se esconde.
 *
 * IDIOMA: el print queda fuera del toggle ES/EN (`src/cv/i18n.ts` salta
 * `#print-cv`), así que hoy renderiza ES. Los campos `LangText` llevan EN para
 * cuando el print tenga su propia versión bilingüe.
 */
import type { LangText } from "../../data/profile.types.ts";
import { activeCuration } from "../curation/active.ts";
import { experienceKey } from "../curation/keys.ts";
import {
  EXPERIENCE_SECTION_ORDER,
  experienceSectionOf as sectionOf
} from "../curation/experience.ts";
import type { ExperienceSectionId } from "../curation/types.ts";
import { PROFILE_PROSE, type ProfileProseSelection } from "./profile-prose.ts";
import { t, te } from "../copy.ts";
import { PRINT_CONTACT_PLATFORMS } from "./platforms.ts";

/*
 * Las piezas NEUTRAS de la clasificación (`experienceKey`, el tipo de sección y
 * el orden de subsecciones) viven en la capa de curación, no en el tema. La
 * TABLA es del tema (`Curation.experienceSections`) y se resuelve con
 * `activeCuration()`: ningún renderer compartido importa `curation/museo.ts`.
 * Se re-exportan acá para no romper a los consumidores históricos.
 */
export { EXPERIENCE_SECTION_ORDER, experienceKey };
export type { ExperienceSectionId };

export interface PrintCvCuration {
  /**
   * Prosa de perfil: SELECCIÓN de qué campo del SSOT se imprime (#122), nunca
   * su texto. La resuelve `profileProse()`; el print y la sala de Perfil del
   * sitio la comparten.
   */
  profile: ProfileProseSelection;
  sections: {
    profile: string;
    /**
     * «Trayectoria» / «Trajectory»: título del bloque CONTENEDOR. `experience[]`
     * mezcla empleo y eventos formativos (el SSOT no los distingue con un
     * campo), así que el bloque no se puede rotular «Experiencia profesional»;
     * adentro van las dos subsecciones (`professional`, `training`), decididas
     * por `Curation.experienceSections` del tema. Mismo criterio que la sala (#118).
     */
    experience: LangText;
    /** Aclara qué contiene la Trayectoria (sin conteos ni fechas: hechos del SSOT). */
    experienceNote: LangText;
    /** Subsección 1: empleo, freelance y pasantías/puestos rentados. */
    professional: string;
    /** Subsección 2: postgrado, escuelas, talleres y becas. */
    training: string;
    /**
     * Sección de grados (`education[]`). Se rotula con el calificativo
     * «académica» para no competir con el subhead «Formación y talleres».
     */
    education: string;
    publications: string;
    skills: string;
  };
  labels: {
    /** `end: "present"` del SSOT. */
    present: string;
    /** Encabezado de la línea de idiomas dentro de Competencias. */
    languages: string;
    /** Prefijo del footer de procedencia (solo print). */
    footer: string;
    /** Fallback cuando `source.commitDate` no se pudo resolver. */
    footerNoDate: string;
  };
  /**
   * Plataformas de `identity.links` que el encabezado imprime, en orden. La
   * lista vive en `content/cv/platforms.ts` (`PRINT_CONTACT_PLATFORMS`): mismo
   * contrato que El Buzón, membresía declarada.
   */
  contactPlatforms: string[];
  /** Nombres de idioma por `code` del SSOT (presentación, no hecho). */
  languageNames: Record<string, string>;
  /** Etiquetas de `level` del SSOT, para skills e idiomas. */
  levelLabels: Record<string, string>;
}

/**
 * Sección curada de una fila con la curación del TEMA ACTIVO, o `undefined` si
 * el SSOT trae una entrada nueva (el print falla ruidoso, no adivina).
 */
export function experienceSectionOf(item: {
  id?: string;
  org: string;
  role: LangText;
  start: string;
}): ExperienceSectionId | undefined {
  return sectionOf(activeCuration(), item);
}

export const PRINT_CV: PrintCvCuration = {
  // #122: el dato vive en `PROFILE.positioning`; acá sólo se declara el campo.
  profile: PROFILE_PROSE,
  // El copy del print vive en el pack del tema (#127): este módulo declara la
  // ESTRUCTURA de la superficie, no su texto.
  sections: {
    profile: t("print.sections.profile"),
    experience: {
      es: t("print.sections.experience"),
      en: te("print.sections.experience")
    },
    experienceNote: {
      es: t("print.sections.experienceNote"),
      en: te("print.sections.experienceNote")
    },
    professional: t("print.sections.professional"),
    training: t("print.sections.training"),
    education: t("print.sections.education"),
    publications: t("print.sections.publications"),
    skills: t("print.sections.skills")
  },
  labels: {
    present: t("print.labels.present"),
    languages: t("print.labels.languages"),
    footer: t("print.labels.footer"),
    footerNoDate: t("print.labels.footerNoDate")
  },
  contactPlatforms: [...PRINT_CONTACT_PLATFORMS],
  languageNames: {
    es: t("print.language.es"),
    en: t("print.language.en"),
    fr: t("print.language.fr")
  },
  levelLabels: {
    native: t("print.level.native"),
    fluent: t("print.level.fluent"),
    expert: t("print.level.expert"),
    advanced: t("print.level.advanced"),
    intermediate: t("print.level.intermediate"),
    basic: t("print.level.basic")
  }
};
