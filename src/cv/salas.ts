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
 * - `ilusion` es el id del canvas de ilusión de la sala — metadato de preparación
 *   para el museo 3D (reutilizaría SALAS sin re-definir la estructura).
 */

export interface SalaDef {
  /** id del <section> sin prefijo: 'perfil' → <section id="room-perfil"> */
  id: string;
  /** Título museístico ES (HTML, puede contener <em>) */
  titulo: string;
  /** Traducción EN del título (HTML, puede contener <em>) */
  tituloEn: string;
  /** Subtítulo / metadata ES (texto plano, Fira Code) */
  subtitulo: string;
  /** Traducción EN del subtítulo */
  subtituloEn: string;
  /** Etiqueta del nav lateral (hover) — solo ES (atributo, no se traduce) */
  navLabel: string;
  /** id del canvas de ilusión de fondo de la sala (museo 3D / metadata) */
  ilusion?: string;
  /** true → sala oculta (no numerada, sin nav, sin re-render de metadatos) */
  hidden?: boolean;
}

/** Entrada "hero" del nav lateral (punto de la entrada del museo). */
export const HERO_NAV = {
  id: "hero",
  navLabel: "Entrada"
} as const;

/**
 * Orden = orden real de los `<section class="room">` en el DOM (el i18n ROOM_EN es
 * posicional sobre ese orden, incluida la galería oculta).
 */
export const SALAS: SalaDef[] = [
  {
    id: "perfil",
    titulo: "El <em>Visitante</em>",
    tituloEn: "The <em>Visitor</em>",
    subtitulo: "PERFIL PROFESIONAL · CUENCA, ECUADOR",
    subtituloEn: "PROFESSIONAL PROFILE · CUENCA, ECUADOR",
    navLabel: "Perfil",
    ilusion: "c-necker"
  },
  {
    id: "proyectos",
    titulo: "Proyectos <em>Activos</em>",
    tituloEn: "Active <em>Projects</em>",
    subtitulo: "INVESTIGACIÓN EN CURSO · DESARROLLO ACTIVO · 2024–2026 · 6 PROYECTOS",
    subtituloEn: "ONGOING RESEARCH · ACTIVE DEVELOPMENT · 2024–2026 · 6 PROJECTS",
    navLabel: "Proyectos",
    ilusion: "c-proyectos"
  },
  {
    id: "experiencia",
    titulo: "La <em>Trayectoria</em>",
    tituloEn: "The <em>Path</em>",
    subtitulo: "EXPERIENCIA PROFESIONAL · 2003 – PRESENTE",
    subtituloEn: "PROFESSIONAL EXPERIENCE · 2003 – PRESENT",
    navLabel: "Experiencia",
    ilusion: "c-exp"
  },
  {
    id: "galeria",
    titulo: "La <em>Evidencia</em>",
    tituloEn: "The <em>Evidence</em>",
    subtitulo: "GALERÍA · FOTOGRAFÍAS · DOCUMENTOS · MOMENTOS",
    subtituloEn: "GALLERY · PHOTOGRAPHS · DOCUMENTS · MOMENTS",
    navLabel: "Evidencia",
    hidden: true
  },
  {
    id: "fisica",
    titulo: "La <em>Biblioteca</em>",
    tituloEn: "The <em>Library</em>",
    subtitulo: "PUBLICACIONES CIENTÍFICAS · PREPRINTS · 2006–2026",
    subtituloEn: "SCIENTIFIC PUBLICATIONS · PREPRINTS · 2006–2026",
    navLabel: "Biblioteca",
    ilusion: "c-fisica"
  },
  {
    id: "competencias",
    titulo: "Caja de <em>Herramientas</em>",
    tituloEn: "The <em>Toolbox</em>",
    subtitulo: "INTELIGENCIA SINTÉTICA · SOBERANÍA · OPEN SOURCE · IDIOMAS",
    subtituloEn: "SYNTHETIC INTELLIGENCE · SOVEREIGNTY · OPEN SOURCE · LANGUAGES",
    navLabel: "Competencias",
    ilusion: "c-comp"
  },
  {
    id: "grafo",
    titulo: "La <em>Constelación</em>",
    tituloEn: "The <em>Constellation</em>",
    subtitulo: "RED · ÁREAS · PROYECTOS · CONEXIONES · 2026",
    subtituloEn: "CONSTELLATION · AREAS · PROJECTS · CONNECTIONS · 2026",
    navLabel: "Constelación",
    ilusion: "c-graph"
  },
  {
    id: "contacto",
    titulo: "<em>Conectar</em>",
    tituloEn: "<em>Connect</em>",
    subtitulo: "CONTACTO · REDES · INVESTIGACIÓN",
    subtituloEn: "CONTACT · NETWORKS · RESEARCH",
    navLabel: "Conectar"
  }
];
