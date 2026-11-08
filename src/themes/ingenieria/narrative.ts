/**
 * NARRATIVA DEL TEMA `ingenieria` (SPEC §8 FASE 5.7 · ADR-001 · issue #134).
 *
 * PILOTO DE PLOMERÍA: las MISMAS 8 salas visibles del museo (misma estructura,
 * mismos ids, mismas ilusiones y misma curación de conjunto), con otra VOZ y
 * otra PIEL para una audiencia de ingeniería. No inventa hechos, no reordena
 * salas y no toca `SALAS`: cambia los rótulos de presentación (título,
 * función y label del HUD) y deja que el pack (`copy.ts`) y la piel
 * (`skin.css`) hagan el resto.
 *
 * `rooms` DERIVA de `SALAS` y aplica la VISIBILIDAD de SU curación
 * (`Curation.exclude`, ids `salas:<id>`): la galería sigue oculta, decidida en
 * `src/content/curation/ingenieria.ts`, no heredada del museo. Los subtítulos
 * son metadata factual de `SALAS` (conteos derivados del SSOT): el tema no los
 * reescribe para no duplicar cifras que pueden cambiar.
 */
import { SALAS } from "../../cv/salas.ts";
import { isExcluded } from "../../content/curation/index.ts";
import { factId } from "../../content/curation/keys.ts";
import { INGENIERIA_CURATION } from "../../content/curation/ingenieria.ts";
import type { NarrativeManifest, RoomRef } from "../types.ts";
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
    titulo: "Mapa de <em>Dependencias</em>",
    tituloEn: "<em>Dependency</em> Map",
    funcion: "Grafo de dependencias entre áreas, sistemas y publicaciones.",
    funcionEn: "Dependency graph between areas, systems and publications.",
    navLabel: "Dependencias",
    navLabelEn: "Dependencies"
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

export const ingenieria: NarrativeManifest = {
  id: "ingenieria",
  // Publica en /ingenieria/ dentro del mismo artefacto (SPEC §8 FASE 5.5).
  path: "ingenieria",
  // Misma dirección de deploy que el default: hay UN bundle y UN root de
  // assets. `SITE_ORIGIN`/`SITE_BASE` la overridean al construir.
  site: { origin: DEFAULT_ORIGIN, base: "" },
  rooms: SALAS.map((room) => {
    const hidden = isExcluded(INGENIERIA_CURATION, factId("salas", room.id));
    return {
      ...room,
      ...(VOICE[room.id] ?? {}),
      ...(hidden ? { hidden: true } : {})
    };
  }),
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
