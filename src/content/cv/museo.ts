/**
 * Curación del museo (SPEC §5.3, D2) — El Friso, El Marco y El Bastidor.
 *
 * QUÉ ES: copy de ESTA superficie — labels, títulos museográficos, la prosa
 * curatorial del showcase de Drahma y el cierre de El Bastidor. NO contiene
 * hechos: cargos, organizaciones, fechas, períodos, descripciones base ni
 * links salen de `PROFILE` (`src/data/profile.generated.ts`).
 *
 * Si un valor tuviera que cambiar en dos archivos para seguir coherente, es un
 * bug de arquitectura (SPEC §3), no una tarea de curación. El idioma EN de cada
 * string vive acá (la página tiene toggle ES/EN y estos nodos son claves del MAP).
 */
import type { ExperienceItem, LangText } from "../../data/profile.types.ts";

/** `end: "present"` del SSOT y el separador de rango. */
export const FRISO = {
  present: { es: "PRESENTE", en: "PRESENT" } satisfies LangText
};

/**
 * Período formateado de una entrada del SSOT: `YYYY – YYYY`, `YYYY` cuando
 * inicio y fin caen en el mismo año, y `YYYY – PRESENTE` para `end: present`.
 * No inventa meses: el SSOT está al día de año; mostrar el día sería otro hecho.
 */
export function formatPeriod(item: ExperienceItem, lang: "es" | "en"): string {
  const startYear = item.start.slice(0, 4);
  const present = lang === "es" ? FRISO.present.es : FRISO.present.en;
  const endYear = item.end === "present" ? present : item.end.slice(0, 4);
  return startYear === endYear ? startYear : `${startYear} – ${endYear}`;
}

/** Etiqueta de estado de una ficha: el estado es un hecho del SSOT. */
export const ESTADO: Record<string, LangText> = {
  active: { es: "Activo", en: "Active" },
  maintained: { es: "Mantenido", en: "Maintained" },
  experimental: { es: "Experimental", en: "Experimental" },
  planning: { es: "En diseño", en: "In design" },
  archived: { es: "Archivado", en: "Archived" }
};

export const MARCO = {
  /** `published: true` (artifactRefs → artifact público con locator.url). */
  published: { es: "Publicado · Artefacto público", en: "Published · Public artifact" } satisfies LangText,
  /** Sufijo de toda ficha sin artifactRefs público. */
  noPublicArtifact: { es: "Sin artefacto público", en: "No public artifact" } satisfies LangText,
  /** Label de la línea de graduación de El Bastidor. */
  faltaLabel: { es: "Para publicarse", en: "To publish" } satisfies LangText,
  /** Cierre de El Bastidor cuando NINGUNA ficha tiene link público. */
  closing: {
    es: "Ninguna ficha de esta sala tiene todavía un artefacto que un tercero pueda abrir — y cada una dice qué le falta.",
    en: "No entry in this room has an artifact a third party can open yet — and each one says what it is missing."
  } satisfies LangText,
  /**
   * Cierre de El Bastidor cuando alguna ficha ya enlaza material público (p. ej.
   * PRs upstream) pero ninguna declara `artifactRefs`: decir "ninguna tiene un
   * artefacto que abrir" sería falso. El cuantificador se DERIVA del número de
   * fichas con links (`count`): «una» o «varias», nunca un plural fijo.
   */
  closingSomePublic: (count: number): LangText => ({
    es: `Ninguna ficha de esta sala declara todavía un artefacto en el SSOT que la gradúe a El Marco — ${
      count === 1 ? "una ya enlaza material público" : "varias ya enlazan material público"
    } — y cada una dice qué le falta.`,
    en: `No entry in this room declares an artifact in the SSOT that would graduate it to The Frame yet — ${
      count === 1 ? "one already links public material" : "several already link public material"
    } — and each one says what it is missing.`
  })
} as const;

/**
 * Presentación ES del `org` del SSOT. El `org` es un string invariante (nunca
 * langMap, SPEC §11/§15.6): los nombres propios NO se traducen. Lo que sí se
 * presenta en ES es el rol del empleador ("Independent"), el país y la glosa
 * `(scholarship)`, que en el SSOT están en inglés por ser parte del nombre de
 * la fila.
 *
 * Se reemplaza por TOKEN COMPLETO (segmento separado por ` — `/` / `/`,/`(`),
 * nunca por substring: «New Mexico State University», «Independent University»
 * o «Panama Canal Authority» son nombres propios y quedan intactos.
 */
const ORG_ES: Readonly<Record<string, string>> = {
  Independent: "Independiente",
  Panama: "Panamá",
  Mexico: "México",
  scholarship: "beca"
};

/** Separadores que aíslan un token: guion, slash, coma y paréntesis. */
const ORG_SEPARATOR = /(\s+[—–-]\s+|\s*\/\s*|\s*,\s*|\s*\(|\))/;

/** `org` del SSOT → presentación ES; el EN vuelve al string original vía i18n. */
export function orgEs(org: string): string {
  return org
    .split(ORG_SEPARATOR)
    .map((part) =>
      Object.prototype.hasOwnProperty.call(ORG_ES, part) ? ORG_ES[part] : part
    )
    .join("");
}

/** Etiqueta de estado de una ficha, derivada de `published` + `status` del SSOT. */
export function statusLabel(published: boolean, status: string | undefined): LangText {
  if (published) return MARCO.published;
  const estado = ESTADO[status ?? "active"] ?? ESTADO.active;
  return {
    es: `${estado.es} · ${MARCO.noPublicArtifact.es}`,
    en: `${estado.en} · ${MARCO.noPublicArtifact.en}`
  };
}

/** Clase CSS de la píldora de estado (sólo presentación). */
export function statusClass(published: boolean, status: string | undefined): string {
  if (published) return "status-active";
  if (status === "maintained") return "status-paused";
  return "status-private";
}

/** Meses ES para la fecha verificable del SSOT (`evidence[].verified`). */
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

/** `2024-08-31` → `agosto 2024`. Sin fecha → cadena vacía (no se inventa). */
export function formatMonthYear(iso: string | undefined): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso ?? "");
  if (!m) return "";
  return `${MESES[Number(m[2]) - 1]} ${m[1]}`;
}

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/** Variante EN de `formatMonthYear` (para el par i18n del subtítulo). */
export function formatMonthYearEn(iso: string | undefined): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso ?? "");
  if (!m) return "";
  return `${MONTHS_EN[Number(m[2]) - 1]} ${m[1]}`;
}

/**
 * Showcase de Drahma (El Marco). Las CELDAS son interpretación curatorial del
 * museo; nombre, estado, descripción base, link y fecha salen del SSOT y los
 * compone el template. Los íconos y labels son presentación, no hechos.
 */
export const DRAHMA = {
  projectLabel: { es: "Proyecto", en: "Project" } satisfies LangText,
  /** Nombre corto: se DERIVA del SSOT (`name` antes de " — "); acá sólo el copy. */
  subtitle: {
    es: "INTELIGENCIA SINTÉTICA EDUCATIVA · ECUADOR",
    en: "EDUCATIONAL SYNTHETIC INTELLIGENCE · ECUADOR"
  } satisfies LangText,
  timelineLabel: { es: "LÍNEA TEMPORAL", en: "TIMELINE" } satisfies LangText,
  /** Sin la fecha: la fecha verificable entra por `evidence[].verified`. */
  timeline: {
    es: "Aproximadamente dos meses antes de la disponibilidad pública de Khanmigo (Khan Academy). Desarrollado sin financiamiento externo ni lanzamiento público. Probado en campo con comunidades indígenas del Amazonas ecuatoriano.",
    en: "Roughly two months before Khanmigo (Khan Academy) became publicly available. Built without external funding or public launch. Field-tested with indigenous communities of the Ecuadorian Amazon."
  } satisfies LangText,
  cells: [
    {
      icon: "🐉",
      label: { es: "Diseño", en: "Design" } satisfies LangText,
      text: {
        es: "Dragones alados con iconografía precolombina y amazónica. Culturalmente resonantes para el estudiante ecuatoriano.",
        en: "Winged dragons with pre-Columbian and Amazonian iconography. Culturally resonant for the Ecuadorian student."
      } satisfies LangText
    },
    {
      icon: "🧠",
      label: { es: "Pedagogía", en: "Pedagogy" } satisfies LangText,
      text: {
        es: "Método socrático: guía al estudiante hacia el razonamiento propio. No entrega respuestas — construye preguntas.",
        en: "Socratic method: guides the student toward their own reasoning. It does not hand out answers — it builds questions."
      } satisfies LangText
    },
    {
      icon: "📚",
      label: { es: "Alcance", en: "Scope" } satisfies LangText,
      text: {
        es: "36 asignaturas del currículo oficial del Ministerio de Educación del Ecuador — primaria y secundaria.",
        en: "36 subjects from the official curriculum of Ecuador's Ministry of Education — primary and secondary."
      } satisfies LangText
    },
    {
      icon: "⚙️",
      label: { es: "Arquitectura", en: "Architecture" } satisfies LangText,
      text: {
        es: "Poe (Quora): agnóstico del modelo, acceso gratuito, persistencia de memoria conversacional entre sesiones.",
        en: "Poe (Quora): model-agnostic, free access, persistent conversational memory across sessions."
      } satisfies LangText
    },
    {
      icon: "🛡️",
      label: { es: "Seguridad", en: "Safety" } satisfies LangText,
      text: {
        es: "Guardrails para menores — un problema de alineación que el campo aún estaba formalizando.",
        en: "Guardrails for minors — an alignment problem the field was still formalizing."
      } satisfies LangText
    },
    {
      icon: "🌿",
      label: { es: "Campo", en: "Field" } satisfies LangText,
      text: {
        es: "Pilotado con comunidades indígenas amazónicas. Validado en condiciones reales de bajo recurso tecnológico.",
        en: "Piloted with Amazonian indigenous communities. Validated under real low-resource technological conditions."
      } satisfies LangText
    }
  ],
  labStem: {
    label: { es: "LAB STEM", en: "STEM LAB" } satisfies LangText,
    title: {
      es: "Fabricación <em>Pedagógica</em>",
      en: "Pedagogical <em>Fabrication</em>"
    } satisfies LangText,
    items: [
      {
        es: "Impresora 3D + cortadora láser · producción de juguetes pedagógicos concretos",
        en: "3D printer + laser cutter · production of concrete pedagogical toys"
      },
      {
        es: "Modelo peer-to-peer: estudiantes avanzados crean para estudiantes menores",
        en: "Peer-to-peer model: advanced students create for younger students"
      },
      {
        es: "Visión en pausa: chatbots como manuales vivos para cada objeto físico",
        en: "Vision on hold: chatbots as living manuals for every physical object"
      }
    ] as LangText[]
  },
  repo: {
    label: {
      es: "REPOSITORIO · ESTRATEGIA DE AUTORÍA",
      en: "REPOSITORY · AUTHORSHIP STRATEGY"
    } satisfies LangText,
    lede: {
      es: "Documentar la arquitectura y pedagogía antes de que el campo lo reinvente como nuevo",
      en: "Document the architecture and pedagogy before the field reinvents it as new"
    } satisfies LangText,
    items: [
      {
        es: "Repositorio público: arquitectura técnica, principios pedagógicos, guardrails — sin prompts internos",
        en: "Public repository: technical architecture, pedagogical principles, guardrails — without internal prompts"
      },
      {
        es: "Repositorio privado: system prompts, documentos de contenido, notas de implementación",
        en: "Private repository: system prompts, content documents, implementation notes"
      },
      {
        es: "Objetivo: establecer autoría y fecha antes de la adopción masiva de sistemas equivalentes",
        en: "Goal: establish authorship and date before the mass adoption of equivalent systems"
      }
    ] as LangText[]
  }
} as const;

/** Traza de procedencia (señal de demo): la comparte el print-CV (#108). */
export const PROCEDENCIA = {
  /** Prefijo + link al motor: la página y el print dicen el mismo pin. */
  label: {
    es: "generado desde profile-data @",
    en: "generated from profile-data @"
  } satisfies LangText,
  enginePrefix: { es: "· pasco", en: "· pasco" } satisfies LangText
} as const;
