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
  /** Orden de presentación dentro de la sala (no es un hecho del SSOT). */
  recencia?: string;
  /** true = su ficha es el showcase dedicado, no una tarjeta duplicada. */
  sinTarjeta?: boolean;
}

/** Nombre corto estable: `Kontablo — Universal…` → `Kontablo`. */
export function projectKey(name: string): string {
  return name.split(" — ")[0].trim();
}

export const PROJECT_CURATION: Record<string, ProjectCuration> = {
  Kontablo: {
    subtitle: { es: "Ontología Contable Universal", en: "Universal Accounting Ontology" },
    recencia: "2026-01-27"
  },
  Drahma: {
    sinTarjeta: true,
    recencia: "2024-08-01"
  },
  "profile-as-code": {
    subtitle: { es: "Motor de perfil spec-first", en: "Spec-first profile engine" },
    recencia: "2026-08-07"
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
