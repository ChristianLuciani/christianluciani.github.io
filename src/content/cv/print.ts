/**
 * Curación del print-CV (SPEC §5.3, D2) — el único otro lugar editable a mano.
 *
 * QUÉ ES: textos de ESTA superficie (prosa de perfil, títulos de sección,
 * etiquetas de presentación y qué links del SSOT entran al encabezado).
 * NO contiene hechos: fechas, cargos, organizaciones, publicaciones, conteos,
 * idiomas y competencias salen de `PROFILE` (`src/data/profile.generated.ts`).
 * Si un valor tuviera que cambiar en dos archivos para mantenerse coherente,
 * sería un bug de arquitectura (SPEC §3), no una tarea de curación.
 *
 * IDIOMA: el print queda fuera del toggle ES/EN (`src/cv/i18n.ts` salta
 * `#print-cv`), así que hoy renderiza ES. Los campos `LangText` llevan EN para
 * cuando el print tenga su propia versión bilingüe.
 */
import type { LangText } from "../../data/profile.types.ts";

export interface PrintCvCuration {
  /** Prosa de perfil: texto de este museo, no un hecho del SSOT. */
  profile: LangText;
  sections: {
    profile: string;
    /**
     * «Trayectoria» / «Trajectory»: `experience[]` mezcla empleo y eventos
     * formativos (el SSOT no los distingue con un campo), así que rotular las
     * 23 filas «Experiencia profesional» mentiría sobre el inicio del empleo.
     * Mismo criterio que la sala de la página (#118).
     */
    experience: LangText;
    /** Aclara qué contiene la Trayectoria (sin conteos ni fechas: hechos del SSOT). */
    experienceNote: LangText;
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
  /** Plataformas de `identity.links` que el encabezado imprime, en orden. */
  contactPlatforms: string[];
  /** Nombres de idioma por `code` del SSOT (presentación, no hecho). */
  languageNames: Record<string, string>;
  /** Etiquetas de `level` del SSOT, para skills e idiomas. */
  levelLabels: Record<string, string>;
}

export const PRINT_CV: PrintCvCuration = {
  profile: {
    en: "Physicist (Universidad Central de Venezuela) with more than 20 years at the intersection of scientific research, educational technology and synthetic intelligence. Creator of Kontablo —a universal graph-based accounting ontology for the agentic economy— and of Drahma, a system of virtual tutors built on synthetic intelligence and Socratic pedagogy.",
    es: "Físico (Universidad Central de Venezuela) con más de 20 años en la intersección entre investigación científica, tecnología educativa e inteligencia sintética. Creador de Kontablo —ontología contable universal basada en grafos para la economía agéntica— y de Drahma, sistema de tutores virtuales con inteligencia sintética y pedagogía socrática."
  },
  sections: {
    profile: "Perfil",
    experience: { es: "Trayectoria", en: "Trajectory" },
    experienceNote: {
      es: "Empleo, formación y talleres",
      en: "Employment, education and workshops"
    },
    education: "Formación",
    publications: "Publicaciones seleccionadas",
    skills: "Competencias"
  },
  labels: {
    present: "PRESENTE",
    languages: "Idiomas",
    footer: "generado desde profile-data @",
    footerNoDate: "fecha no disponible"
  },
  contactPlatforms: ["website", "whatsapp", "orcid", "github"],
  languageNames: {
    es: "Español",
    en: "Inglés",
    fr: "Francés"
  },
  levelLabels: {
    native: "nativo",
    fluent: "fluido",
    expert: "experto",
    advanced: "avanzado",
    intermediate: "intermedio",
    basic: "básico"
  }
};
