/**
 * Curación del print-CV (SPEC §5.3, D2) — el único otro lugar editable a mano.
 *
 * QUÉ ES: textos de ESTA superficie (prosa de perfil, títulos de sección,
 * etiquetas de presentación y qué links del SSOT entran al encabezado) y la
 * curación de `experience[]` en sus dos secciones (F1 de #116).
 * NO contiene hechos RENDERIZABLES: fechas, cargos, organizaciones,
 * publicaciones, conteos, idiomas y competencias salen de `PROFILE`
 * (`src/data/profile.generated.ts`). La tabla `EXPERIENCE_SECTIONS` sólo repite
 * la CLAVE de cada fila (`org|role|start`, o `id` si el SSOT lo expone) para
 * clasificarla: no imprime ninguno de esos valores. Si una fila del SSOT no está
 * en la tabla (o cambió su clave), el render falla — la deriva se ve, no se
 * adivina ni se esconde. Si un valor tuviera que cambiar en dos archivos para
 * mantenerse coherente, sería un bug de arquitectura (SPEC §3), no una tarea de
 * curación.
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
     * «Trayectoria» / «Trajectory»: título del bloque CONTENEDOR. `experience[]`
     * mezcla empleo y eventos formativos (el SSOT no los distingue con un
     * campo), así que el bloque no se puede rotular «Experiencia profesional»;
     * adentro van las dos subsecciones (`professional`, `training`), decididas
     * por la tabla `EXPERIENCE_SECTIONS`. Mismo criterio que la sala (#118).
     */
    experience: LangText;
    /** Aclara qué contiene la Trayectoria (sin conteos ni fechas: hechos del SSOT). */
    experienceNote: LangText;
    /** Subsección 1: empleo, freelance y pasantías/puestos rentados. */
    professional: string;
    /** Subsección 2: postgrado, escuelas, talleres y becas. */
    training: string;
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

/** Las dos subsecciones en que se parte `experience[]` (F1 de #116). */
export type ExperienceSectionId = "professional" | "training";

/** Orden en que las subsecciones se imprimen. */
export const EXPERIENCE_SECTION_ORDER: readonly ExperienceSectionId[] = [
  "professional",
  "training"
];

/**
 * Clave estable de una fila de `experience[]`: `id` si el SSOT lo expone; si
 * no, `org|role|start`. El rol sale en ES (el print renderiza ES) con EN de
 * fallback. La usa tanto la tabla de curación como el renderer: una sola
 * definición evita que la clasificación y la búsqueda se desincronicen.
 */
export function experienceKey(item: {
  id?: string;
  org: string;
  role: LangText;
  start: string;
}): string {
  if (item.id) return item.id;
  return `${item.org}|${item.role.es ?? item.role.en}|${item.start}`;
}

/**
 * CURACIÓN F1 — una fila por entrada de `experience[]`, exactamente una vez.
 *
 * Los valores son CLAVES (identificadores de fila), no hechos que el print
 * muestre: si el SSOT cambia `org`, `role` o `start`, la clave deja de resolver
 * y el render falla en vez de clasificar mal o esconder la fila. El test
 * `print_cv.test.ts` exige cobertura total (hoy 23/23).
 *
 * DUDOSAS (el rótulo no las delata; se resuelven por lo que la fila ES):
 * - «Pasantía en Transferencia de Video a Cine» (Produrama, 2008): pasantía
 *   profesional rentada, no un taller → professional.
 * - «Asistente de Fotografía Fija» (Frank Martínez & Alberto Hernández, 2007):
 *   asistencia de producción en sets, no una escuela → professional.
 * - «Profesional en Entrenamiento — Centro de Física y Reactor Nuclear»
 *   (IVIC, 2003): puesto de entrenamiento del instituto (empleo), no un curso
 *   tomado → professional.
 * El resto de las filas formativas (postgrado 1998, talleres, escuelas de
 * física, CERN y su beca) son training.
 */
export const EXPERIENCE_SECTIONS: Readonly<Record<string, ExperienceSectionId>> = {
  // ── professional ─────────────────────────────────────────────────────────
  "Grupo Angel — Panamá|Auditor y Consultor|2025-08-01": "professional",
  "Independent — Panama / Ecuador|Consultor Estratégico de Sistemas|2025-01-01": "professional",
  "Universidad San Francisco de Quito (USFQ) — Quito, Ecuador|Coordinador de Laboratorios de Física|2019-01-01": "professional",
  "Fluge-Panamá|Luminotécnico (freelance)|2017-11-01": "professional",
  "Grupo Angel — Panamá|Oficial de Bóveda — Diseño del Sistema de Registro y Auditoría|2016-10-01": "professional",
  "Magic Dreams Productions — Panamá|Productor y Ejecutivo de Cuentas — Logística BTL|2011-11-01": "professional",
  // Pasantía rentada, no formación.
  "Produrama — Caracas|Pasantía en Transferencia de Video a Cine|2008-01-01": "professional",
  "Universidad Santa María — Caracas|Técnico del Estudio de TV — Asistente Docente|2007-01-01": "professional",
  // Asistencia en sets, no un taller.
  "Frank Martínez & Alberto Hernández — Caracas|Asistente de Fotografía Fija|2007-01-01": "professional",
  // Docencia y coordinación en una escuela: empleo, no curso.
  "Escuela de Cine y TV — Caracas|Docente de Edición y Montaje · Coordinador de Post-producción|2009-01-01": "professional",
  "Independent — Caracas|Cámara · Edición · Dirección de Fotografía (freelance)|2006-01-01": "professional",
  // Puesto de entrenamiento del IVIC: empleo, no curso.
  "Instituto Venezolano de Investigaciones Científicas (IVIC) — Caracas|Profesional en Entrenamiento — Centro de Física y Reactor Nuclear|2003-01-01": "professional",
  "Universidad Simón Bolívar — Caracas|Profesor de Física|2003-01-01": "professional",
  // ── training ─────────────────────────────────────────────────────────────
  "AVECOFAN — Caracas|Taller de Fotografía de Moda — Alberto Hernández|2010-01-01": "training",
  "MEDIAX — Caracas|Taller de Formulación de Proyectos Audiovisuales|2009-01-01": "training",
  "VIART — Caracas|Taller de Dirección de Fotografía Electrónica — Daniel Mendoza|2007-01-01": "training",
  "ANAC — Caracas|Taller Pasaporte a Cinematografía Electrónica Cinealta — Jesús «Chuchi» Rivero|2006-01-01": "training",
  "Universidad Central de Venezuela — Caracas|Curso de Fotografía Documental|2006-01-01": "training",
  "UNET — San Cristóbal, Venezuela|I Taller Andino de Caos y Complejidad|2004-01-01": "training",
  "CERN — San Miguel Regla, Mexico (scholarship)|II Latin American School of High Energy Physics|2003-01-01": "training",
  "Universidad de Los Andes (ULA) — Mérida, Venezuela|V, VI y VII Escuela de Relatividad, Campos y Astrofísica|2000-01-01": "training",
  "UNESCO-ICTP — Caracas|I Escuela Latinoamericana de Astrobiología|1999-01-01": "training",
  "Universidad Central de Venezuela — Caracas|Postgrado de Instrumentación|1998-01-01": "training"
};

/** Sección curada de una fila, o `undefined` si el SSOT trae una entrada nueva. */
export function experienceSectionOf(item: {
  id?: string;
  org: string;
  role: LangText;
  start: string;
}): ExperienceSectionId | undefined {
  const key = experienceKey(item);
  return Object.prototype.hasOwnProperty.call(EXPERIENCE_SECTIONS, key)
    ? EXPERIENCE_SECTIONS[key]
    : undefined;
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
    professional: "Experiencia profesional",
    training: "Formación y talleres",
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
