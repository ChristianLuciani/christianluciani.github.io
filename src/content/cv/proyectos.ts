/**
 * Curación de El Marco / El Bastidor (SPEC §5.3, D2).
 *
 * QUÉ ES: título museográfico que acompaña al nombre del SSOT, la razón curada
 * de por qué una ficha todavía no tiene artefacto público (`falta`) y el orden
 * de presentación. NO decide la sala: publicado-vs-desarrollo se DERIVA de
 * `PROFILE.projects[].published` (artifactRefs → artifact público con
 * locator.url), nunca de un campo editorial `etapa`.
 *
 * Clave: el nombre corto del SSOT (lo que va antes de " — "). Si un proyecto
 * nuevo del SSOT no tiene entrada acá, se renderiza con el nombre y la
 * descripción base del SSOT y, si no está publicado, sin `falta` inventada.
 */
import type { LangText } from "../../data/profile.types.ts";

export interface ProjectCuration {
  /** Subtítulo museográfico que sigue al nombre del SSOT. */
  subtitle?: LangText;
  /** Qué le falta para pasar a El Marco. Curado, no inventado. */
  falta?: LangText;
  /**
   * Fecha de recencia del proyecto: se expone en `data-recencia` y la curación
   * exige que acompañe a `order.proyectos` (si divergen, el test falla). El
   * ORDEN de presentación ya no vive acá: lo decide la curación del tema
   * (`src/content/curation/museo.ts`).
   */
  recencia?: string;
  /** true = su ficha es el showcase dedicado, no una tarjeta duplicada. */
  sinTarjeta?: boolean;
  /**
   * Píldora de estado CURADA (licencia, versión, fecha de publicación) que
   * REFINA la derivada de `published`+`status` sólo si `published` coincide. El
   * estado del SSOT manda en la CLASIFICACIÓN (sala) y en la CLASE; esto sólo
   * agrega el detalle editorial que `main` publicaba y el SSOT no lleva. Si se
   * omite —o si el SSOT deja de publicar la ficha— se deriva del SSOT.
   */
  statusLabel?: LangText;
  /** Nota museográfica que `main` publicaba y no es derivable del SSOT. */
  note?: LangText;
  /** Links curados que el SSOT no trae (se suman a links+evidence, sin duplicar). */
  extraLinks?: { url: string; label: LangText }[];
  /**
   * Etiqueta curada para un link que YA viene del SSOT (links/evidence), por
   * URL: restaura el texto de `main` sin duplicar el link (p. ej. el DOI de
   * Zenodo de Kontablo). La derivada por host queda como fallback.
   */
  linkLabels?: { url: string; label: LangText }[];
}

/** Nombre corto estable: `Kontablo — Universal…` → `Kontablo`. */
export function projectKey(name: string): string {
  return name.split(" — ")[0].trim();
}

export const PROJECT_CURATION: Record<string, ProjectCuration> = {
  Kontablo: {
    subtitle: { es: "Ontología Contable Universal", en: "Universal Accounting Ontology" },
    recencia: "2026-01-27",
    statusLabel: { es: "Publicado · v0.1.0 · Open-source", en: "Published · v0.1.0 · Open-source" },
    note: {
      es: "Publicado en junio 2026 bajo Business Source License 1.1 (convierte a Apache 2.0 en 2030). Preprint (aún no arbitrado) depositado en Zenodo y SSRN.",
      en: "Published in June 2026 under Business Source License 1.1 (converts to Apache 2.0 in 2030). Preprint (not yet peer-reviewed) deposited on Zenodo and SSRN."
    },
    // Restaurados de `main`: el SSOT sólo trae repo y DOI de Zenodo en evidence.
    extraLinks: [
      { url: "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6960598", label: { es: "SSRN 6960598", en: "SSRN 6960598" } },
      {
        url: "https://www.researchgate.net/publication/407549570_Kontablo_A_Graph-Based_Universal_Accounting_Ontology_for_the_M2M_Agentic_Economy",
        label: { es: "ResearchGate", en: "ResearchGate" }
      }
    ],
    // El label del DOI no es derivable del host: `main` publicaba el texto
    // curado con el identificador («Zenodo DOI 10.5281/…»), no un «DOI» seco.
    linkLabels: [
      {
        url: "https://doi.org/10.5281/zenodo.20738795",
        label: { es: "Zenodo DOI 10.5281/zenodo.20738795", en: "Zenodo DOI 10.5281/zenodo.20738795" }
      }
    ]
  },
  Drahma: {
    sinTarjeta: true,
    recencia: "2024-08-01",
    statusLabel: {
      es: "Publicado · Agosto 2024 · Repositorio público",
      en: "Published · August 2024 · Public repository"
    }
  },
  "profile-as-code": {
    subtitle: { es: "Motor de perfil spec-first", en: "Spec-first profile engine" },
    recencia: "2026-08-07",
    statusLabel: { es: "Publicado · MIT · v0.3.6", en: "Published · MIT · v0.3.6" },
    note: {
      es: "Publicado bajo licencia MIT, con releases etiquetados.",
      en: "Published under the MIT license, with tagged releases."
    }
  },
  ZENTROPY: {
    subtitle: { es: "Zero Entropy Intelligence Station", en: "Zero Entropy Intelligence Station" },
    recencia: "2026-03-07",
    falta: {
      es: "repositorio público con licencia y release — el schema, la ingesta y la arquitectura multi-tenant ya existen.",
      en: "a public repository with a license and a release — the schema, the ingestion layer and the multi-tenant architecture already exist."
    }
  },
  Esteléctica: {
    subtitle: {
      es: "Epistemología del Diálogo Poli-dialéctico Destilado",
      en: "Epistemology of Distilled Poly-dialectical Dialogue"
    },
    recencia: "2026-03-09",
    falta: {
      es: "el paper (es candidata a publicación académica); el repositorio es privado.",
      en: "the paper (it is a candidate for academic publication); the repository is private."
    }
  },
  "CLAPPS.AI": {
    subtitle: { es: "Comprehensive Learning Applications", en: "Comprehensive Learning Applications" },
    recencia: "2026-05-24",
    falta: {
      es: "primer contenido real (Noesis y Noetix) y una versión navegable.",
      en: "first real content (Noesis and Noetix) and a navigable version."
    }
  },
  NOOS: {
    subtitle: { es: "Natural Organization Operating System", en: "Natural Organization Operating System" },
    falta: {
      es: "el marco conceptual como publicación; hoy es investigación privada.",
      en: "the conceptual framework as a publication; today it is private research."
    }
  },
  Topia: {
    subtitle: { es: "Motor editorial de newsletter", en: "Newsletter editorial engine" },
    recencia: "2026-07-24",
    falta: { es: "el primer número publicado.", en: "the first issue published." }
  },
  "Nelson Companion": {
    subtitle: { es: "PWA de voz asistida", en: "Voice-guided PWA" },
    recencia: "2026-04-24",
    falta: {
      es: "repositorio público y licencia — el uso ya es real.",
      en: "a public repository and a license — the use is already real."
    }
  },
  "Physics Lab Book": {
    subtitle: { es: "Laboratorio de física interactivo", en: "Interactive physics lab" },
    recencia: "2019-01-01",
    falta: {
      es: "repositorio público (hoy privado); las 36 guías y su uso en USFQ ya existen.",
      en: "a public repository (private today); the 36 guides and their use at USFQ already exist."
    }
  },
  "Upstream Open Source Contributions": {
    subtitle: { es: "Contribuciones upstream", en: "Upstream contributions" },
    falta: {
      es: "un artefacto propio declarado en artifactRefs — hoy su producción son PRs upstream, listados en la evidencia del SSOT.",
      en: "an own artifact declared in artifactRefs — today its output is upstream PRs, listed in the SSOT evidence."
    }
  }
};
