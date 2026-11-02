/**
 * SALAS — fuente de verdad de la estructura del museo (SPEC: docs/REFACTOR_PLAN.md §3.1).
 *
 * Desde este único objeto se generan: navegación lateral (.nav-dot), `navSections[]`,
 * `ROOM_EN[]`, las claves de sala del diccionario i18n (MAP), el `.room-number` y el
 * `.room-subtitle` de cada sala. Renombrar, reordenar o añadir/quitar una sala = editar
 * una entrada de SALAS (o su orden) y todo lo demás se alinea solo.
 *
 * Convenciones:
 * - `id` es el sufijo del `<section>` (sin el prefijo `room-`).
 * - `num` NO se almacena: se deriva del orden de las salas VISIBLES (01..N) en
 *   `render.ts`. Esa decisión elimina la clase de bug de numeración desalineada
 *   (off-by-one / stale como "SALA 05" duplicado que había en galería).
 * - `hidden: true` (sala galería) → no se numera, no aparece en el nav, no se
 *   re-renderiza su metadato. Se mantiene en SALAS porque su título participa en el
 *   orden posicional de `ROOM_EN` (el i18n recorre TODOS los `.room-title` del DOM).
 * - `titulo`/`subtitulo` ES deben ser byte-idénticos al HTML actual: el i18n busca
 *   claves con `norm()` (colapso de espacios), así que el subtítulo en SALAS define
 *   la clave del MAP. El test de paridad (src/cv/parity.test.ts) lo garantiza.
 * - `subtitulo` NO lleva conteos escritos a mano: se derivan de `src/data/proyectos.ts`
 *   (la etapa de cada proyecto decide la sala). Un "6 PROYECTOS" hardcodeado miente en
 *   cuanto entra o sale una ficha.
 * - `ilusion` es el id del canvas de ilusión de la sala — metadato de preparación
 *   para el museo 3D (reutilizaría SALAS sin re-definir la estructura).
 */

import { enDesarrollo, publicados } from "../data/proyectos.ts";

export interface SalaDef {
  /** id del <section> sin prefijo: 'perfil' → <section id="room-perfil"> */
  id: string;
  /** Título museístico ES (HTML, puede contener <em>) */
  titulo: string;
  /** Traducción EN del título (HTML, puede contener <em>) */
  tituloEn: string;
  /** Subtítulo / metadata ES (texto plano, mono del sistema) */
  subtitulo: string;
  /** Traducción EN del subtítulo */
  subtituloEn: string;
  /**
   * Función real de la sala en lenguaje llano (ES). La metáfora del museo
   * presenta; esta línea dice qué encuentra el lector adentro.
   */
  funcion: string;
  /** Traducción EN de la función */
  funcionEn: string;
  /** Etiqueta visible del HUD (ES) */
  navLabel: string;
  /** Etiqueta visible del HUD (EN) — el HUD se genera desde SALAS */
  navLabelEn: string;
  /** id del canvas de ilusión de fondo de la sala (museo 3D / metadata) */
  ilusion?: string;
  /** true → sala oculta (no numerada, sin nav, sin re-render de metadatos) */
  hidden?: boolean;
}

/** Entrada "hero" del nav lateral (punto de la entrada del museo). */
export const HERO_NAV = {
  id: "hero",
  navLabel: "Entrada",
  navLabelEn: "Entrance"
} as const;

/**
 * Orden = orden real de los `<section class="room">` en el DOM (el i18n ROOM_EN es
 * posicional sobre ese orden, incluida la galería oculta).
 */
export const SALAS: SalaDef[] = [
  {
    id: "proyectos",
    titulo: "El <em>Marco</em>",
    tituloEn: "The <em>Frame</em>",
    subtitulo: `OBRA PUBLICADA · ARTEFACTO AUDITABLE · ${publicados.length} PROYECTOS`,
    subtituloEn: `PUBLISHED WORK · AUDITABLE ARTIFACT · ${publicados.length} PROJECTS`,
    funcion:
      "Proyectos publicados con repositorio, release o DOI que cualquiera puede abrir y verificar.",
    funcionEn:
      "Published projects with a repository, release or DOI that anyone can open and verify.",
    navLabel: "Marco",
    navLabelEn: "Frame",
    ilusion: "c-proyectos"
  },
  {
    id: "bastidor",
    titulo: "El <em>Bastidor</em>",
    tituloEn: "The <em>Stretcher</em>",
    subtitulo: `EN DESARROLLO · PROTOTIPOS E IDEAS · ${enDesarrollo.length} PROYECTOS`,
    subtituloEn: `IN DEVELOPMENT · PROTOTYPES AND IDEAS · ${enDesarrollo.length} PROJECTS`,
    funcion:
      "Proyectos en desarrollo: prototipos, investigaciones e ideas que todavía no tienen un artefacto público.",
    funcionEn:
      "Projects in development: prototypes, research and ideas that do not yet have a public artifact.",
    navLabel: "Bastidor",
    navLabelEn: "Stretcher",
    ilusion: "c-bastidor"
  },
  {
    id: "competencias",
    titulo: "La <em>Paleta</em>",
    tituloEn: "The <em>Palette</em>",
    subtitulo: "INTELIGENCIA SINTÉTICA · SOBERANÍA · OPEN SOURCE · IDIOMAS",
    subtituloEn: "SYNTHETIC INTELLIGENCE · SOVEREIGNTY · OPEN SOURCE · LANGUAGES",
    funcion:
      "Competencias y herramientas: inteligencia sintética, codificación agéntica, soberanía tecnológica, open source e idiomas.",
    funcionEn:
      "Skills and tools: synthetic intelligence, agentic coding, technological sovereignty, open source and languages.",
    navLabel: "Paleta",
    navLabelEn: "Palette",
    ilusion: "c-comp"
  },
  {
    id: "experiencia",
    titulo: "El <em>Friso</em>",
    tituloEn: "The <em>Frieze</em>",
    subtitulo: "EXPERIENCIA PROFESIONAL · 2003 – PRESENTE",
    subtituloEn: "PROFESSIONAL EXPERIENCE · 2003 – PRESENT",
    funcion:
      "Trayectoria profesional: roles, organizaciones y resultados, de 2003 al presente.",
    funcionEn:
      "Professional trajectory: roles, organizations and results, from 2003 to the present.",
    navLabel: "Friso",
    navLabelEn: "Frieze",
    ilusion: "c-exp"
  },
  {
    id: "fisica",
    titulo: "La <em>Biblioteca</em>",
    tituloEn: "The <em>Library</em>",
    subtitulo: "PUBLICACIONES CIENTÍFICAS · PREPRINTS · 2006–2026",
    subtituloEn: "SCIENTIFIC PUBLICATIONS · PREPRINTS · 2006–2026",
    funcion:
      "Publicaciones científicas y preprints, con DOI y enlace a la fuente.",
    funcionEn:
      "Scientific publications and preprints, with DOI and links to the source.",
    navLabel: "Biblioteca",
    navLabelEn: "Library",
    ilusion: "c-fisica"
  },
  {
    id: "grafo",
    titulo: "El <em>Compás</em>",
    tituloEn: "The <em>Compass</em>",
    subtitulo: "RED · ÁREAS · PROYECTOS · CONEXIONES · 2026",
    subtituloEn: "NETWORK · AREAS · PROJECTS · CONNECTIONS · 2026",
    funcion: "Mapa de relaciones entre áreas, proyectos y publicaciones.",
    funcionEn: "Map of relationships between areas, projects and publications.",
    navLabel: "Compás",
    navLabelEn: "Compass",
    ilusion: "c-graph"
  },
  {
    id: "perfil",
    titulo: "El <em>Autorretrato</em>",
    tituloEn: "The <em>Self-Portrait</em>",
    subtitulo: "PERFIL PROFESIONAL · CUENCA, ECUADOR",
    subtituloEn: "PROFESSIONAL PROFILE · CUENCA, ECUADOR",
    funcion:
      "Quién soy, qué estudié, qué me interesa y desde dónde trabajo.",
    funcionEn:
      "Who I am, what I studied, what interests me and where I work from.",
    navLabel: "Autorretrato",
    navLabelEn: "Self-Portrait",
    ilusion: "c-necker"
  },
  {
    id: "contacto",
    titulo: "El <em>Buzón</em>",
    tituloEn: "The <em>Mailbox</em>",
    subtitulo: "CONTACTO · REDES · INVESTIGACIÓN",
    subtituloEn: "CONTACT · NETWORKS · RESEARCH",
    funcion: "Cómo escribirme o encontrarme en la web.",
    funcionEn: "How to write to me or find me on the web.",
    navLabel: "Buzón",
    navLabelEn: "Mailbox"
  },
  {
    id: "galeria",
    titulo: "El <em>Archivo</em>",
    tituloEn: "The <em>Archive</em>",
    subtitulo: "GALERÍA · FOTOGRAFÍAS · DOCUMENTOS · MOMENTOS",
    subtituloEn: "GALLERY · PHOTOGRAPHS · DOCUMENTS · MOMENTS",
    funcion: "Archivo visual: fotografías, documentos y momentos.",
    funcionEn: "Visual archive: photographs, documents and moments.",
    navLabel: "Archivo",
    navLabelEn: "Archive",
    hidden: true
  }
];
