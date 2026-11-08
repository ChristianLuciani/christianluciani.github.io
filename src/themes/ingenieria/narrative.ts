/**
 * NARRATIVA DEL TEMA `ingenieria` (SPEC §5.4 · ADR-001 · issues #134, #135).
 *
 * S9 (#135) — CONTROL TOTAL. Esta narrativa ya no es una copia con otra voz: es
 * la prueba de que el contrato deja reorganizar la visita sin tocar templates:
 *
 *   · `rooms` se DERIVA con `roomsFromCuration()` (ver `src/themes/rooms.ts`):
 *     visibilidad y ORDEN salen de `INGENIERIA_CURATION` (`exclude` + `order.salas`),
 *     la voz de `VOICE` y los conteos que cuentan fichas se re-derivan de ESA
 *     curación. La narrativa no repite el `SALAS.map(...)` ni el cruce.
 *   · `groups` declara que Biblioteca (fisica) y Compás (grafo) son UNA unidad
 *     de navegación «Ciencia»: comparten número, entrada del HUD y celda del
 *     plano, y conservan cada una su `<section>` y su cuerpo. Agrupar NO fusiona
 *     contenido ni inventa una sala.
 *
 * Lo que NO cambia: los hechos (SSOT) y las ilusiones (los canvas son piezas
 * existentes de `src/ts/illusions`). La voz renombra metáforas del museo por
 * vocabulario de ingeniería; el pack (`copy.ts`) y la piel (`skin.css`) hacen el
 * resto.
 */
import { roomsFromCuration } from "../rooms.ts";
import { INGENIERIA_CURATION } from "../../content/curation/ingenieria.ts";
import type { NarrativeManifest, RoomGroup, RoomRef } from "../types.ts";
import { DEFAULT_ORIGIN } from "../site.ts";
import { INGENIERIA_COPY } from "./copy.ts";
import { INGENIERIA_ILLUSIONS } from "./illusions.ts";

/** Rótulos de presentación del tema, por sala. `subtitulo` no se toca. */
const VOICE: Readonly<Record<string, Partial<RoomRef>>> = {
  proyectos: {
    titulo: "Sistemas en <em>Producción</em>",
    tituloEn: "Systems in <em>Production</em>",
    funcion:
      "Sistemas publicados con repositorio, release o DOI: cualquiera puede abrirlos, ejecutarlos y verificar su comportamiento.",
    funcionEn:
      "Published systems with a repository, release or DOI that anyone can open, run and verify.",
    navLabel: "Producción",
    navLabelEn: "Production"
  },
  bastidor: {
    titulo: "Prototipos en <em>Curso</em>",
    tituloEn: "Prototypes in <em>Progress</em>",
    funcion:
      "Sistemas en construcción: prototipos, investigaciones e ideas que todavía no tienen un artefacto público.",
    funcionEn:
      "Systems under construction: prototypes, research and ideas that do not yet have a public artifact.",
    navLabel: "Prototipos",
    navLabelEn: "Prototypes"
  },
  competencias: {
    titulo: "Herramientas y <em>Capacidades</em>",
    tituloEn: "Tools and <em>Capabilities</em>",
    funcion:
      "Herramientas y capacidades: ingeniería de software, sistemas, datos, infraestructura e idiomas.",
    funcionEn:
      "Tools and capabilities: software engineering, systems, data, infrastructure and languages.",
    navLabel: "Stack",
    navLabelEn: "Stack"
  },
  experiencia: {
    titulo: "Trayectoria <em>Técnica</em>",
    tituloEn: "Technical <em>Trajectory</em>",
    funcion:
      "Trayectoria técnica: empleo, formación y talleres aplicados a sistemas, docencia y producción.",
    funcionEn:
      "Technical trajectory: employment, education and workshops applied to systems, teaching and production.",
    navLabel: "Trayectoria",
    navLabelEn: "Trajectory"
  },
  fisica: {
    titulo: "Publicaciones <em>Científicas</em>",
    tituloEn: "Scientific <em>Publications</em>",
    funcion:
      "Publicaciones científicas y preprints, con DOI y enlace a la fuente.",
    funcionEn: "Scientific publications and preprints, with DOI and links to the source.",
    navLabel: "Papers",
    navLabelEn: "Papers"
  },
  grafo: {
    titulo: "Mapa de <em>Sistemas</em>",
    tituloEn: "<em>Systems</em> Map",
    funcion: "Grafo de dependencias entre sistemas, áreas y publicaciones.",
    funcionEn: "Dependency graph between systems, areas and publications.",
    navLabel: "Sistemas",
    navLabelEn: "Systems"
  },
  perfil: {
    titulo: "Perfil <em>Técnico</em>",
    tituloEn: "Technical <em>Profile</em>",
    funcion: "Quién soy, qué construí y desde qué supuestos trabajo.",
    funcionEn: "Who I am, what I have built and the assumptions I work from.",
    navLabel: "Perfil",
    navLabelEn: "Profile"
  },
  contacto: {
    titulo: "Canales de <em>Contacto</em>",
    tituloEn: "<em>Contact</em> Channels",
    funcion: "Cómo escribirme o encontrarme en la web.",
    funcionEn: "How to write to me or find me on the web.",
    navLabel: "Contacto",
    navLabelEn: "Contact"
  }
};

/**
 * UNIDADES de navegación de este tema (S9 · #135). «Ciencia» presenta juntas la
 * Biblioteca (publicaciones) y el Compás (mapa de sistemas): son el mismo
 * módulo para el lector —qué se publicó y cómo se conecta—, así que comparten
 * número, entrada del HUD y celda del plano. `themes:check` exige que las salas
 * existan, estén visibles y sean contiguas en el orden de la curación.
 */
const GROUPS: readonly RoomGroup[] = [
  { id: "ciencia", label: "Ciencia", labelEn: "Science", rooms: ["fisica", "grafo"] }
];

export const ingenieria: NarrativeManifest = {
  id: "ingenieria",
  // Publica en /ingenieria/ dentro del mismo artefacto (SPEC §8 FASE 5.5).
  path: "ingenieria",
  // Misma dirección de deploy que el default: hay UN bundle y UN root de
  // assets. `SITE_ORIGIN`/`SITE_BASE` la overridean al construir.
  site: { origin: DEFAULT_ORIGIN, base: "" },
  rooms: roomsFromCuration(INGENIERIA_CURATION, VOICE),
  groups: GROUPS,
  copy: INGENIERIA_COPY,
  illusions: INGENIERIA_ILLUSIONS,
  meta: {
    // title/description son copy del pack (una sola fuente): el head los toma
    // del manifest y `themes:check` verifica la paridad contra el pack.
    title: INGENIERIA_COPY["meta.title"]!.es,
    description: INGENIERIA_COPY["meta.description"]!.es,
    // Se reutiliza el asset compartido del sitio (el piloto no agrega arte):
    // la ruta es lógica y el publicador la resuelve contra origen/base.
    ogImage: "/assets/og-image.png"
  }
};
