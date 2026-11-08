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
 * IDIOMA (#160): el print tiene DOS variantes deterministas, una por idioma del
 * selector global (`printCvHtml(profile, lang)`): el build emite `#print-cv` en
 * ES y `#print-cv-en` en EN, y la piel del tema decide cuál entra al PDF según
 * `html[lang]` en `@media print`. Ninguna variante pasa por el walker i18n
 * (`src/cv/i18n.ts` salta los dos bloques): el PDF no depende de que el JS haya
 * corrido. Acá se declara la ESTRUCTURA de cada variante; el texto sale del
 * pack del tema, en el idioma pedido.
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

/** Idioma de una variante del print: el del selector global (`html[lang]`). */
export type PrintLang = "es" | "en";

/**
 * Copy de una clave del pack en el idioma pedido. `t()`/`te()` son la ÚNICA
 * puerta al pack: acá no se escribe texto ni se cae a un default silencioso.
 */
function copyFor(lang: PrintLang, key: string): string {
  return lang === "en" ? te(key) : t(key);
}

/**
 * Curación del print en el idioma pedido. Default `es`: el render fuente y los
 * tests históricos consumen esta forma. Una clave inexistente sigue siendo
 * error de build (`t()`/`te()` la lanzan).
 */
export function printCvCuration(lang: PrintLang = "es"): PrintCvCuration {
  return {
  // #122: el dato vive en `PROFILE.positioning`; acá sólo se declara el campo.
  profile: PROFILE_PROSE,
  // El copy del print vive en el pack del tema (#127): este módulo declara la
  // ESTRUCTURA de la superficie, no su texto.
  sections: {
    profile: copyFor(lang, "print.sections.profile"),
    experience: {
      es: t("print.sections.experience"),
      en: te("print.sections.experience")
    },
    experienceNote: {
      es: t("print.sections.experienceNote"),
      en: te("print.sections.experienceNote")
    },
    professional: copyFor(lang, "print.sections.professional"),
    training: copyFor(lang, "print.sections.training"),
    education: copyFor(lang, "print.sections.education"),
    publications: copyFor(lang, "print.sections.publications"),
    skills: copyFor(lang, "print.sections.skills")
  },
  labels: {
    present: copyFor(lang, "print.labels.present"),
    languages: copyFor(lang, "print.labels.languages"),
    footer: copyFor(lang, "print.labels.footer"),
    footerNoDate: copyFor(lang, "print.labels.footerNoDate")
  },
  contactPlatforms: [...PRINT_CONTACT_PLATFORMS],
  languageNames: {
    es: copyFor(lang, "print.language.es"),
    en: copyFor(lang, "print.language.en"),
    fr: copyFor(lang, "print.language.fr")
  },
  levelLabels: {
    native: copyFor(lang, "print.level.native"),
    fluent: copyFor(lang, "print.level.fluent"),
    expert: copyFor(lang, "print.level.expert"),
    advanced: copyFor(lang, "print.level.advanced"),
    intermediate: copyFor(lang, "print.level.intermediate"),
    basic: copyFor(lang, "print.level.basic")
  }
  };
}
