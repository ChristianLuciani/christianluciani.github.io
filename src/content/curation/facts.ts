/**
 * UNIVERSO DE HECHOS CURABLES (SPEC §5.5 · I3).
 *
 * QUÉ ES: el inventario determinista de todo hecho del perfil público que un
 * tema puede presentar u ocultar, más las salas de la narrativa. Lo consumen
 * `validate.ts` (¿todo hecho tiene decisión?) y `tools/curation.ts --report`.
 *
 * QUÉ NO ES una decisión: acá no se incluye ni se excluye nada. Si este archivo
 * listara decisiones, el reporte sería circular (se validaría contra sí mismo).
 *
 * ALCANCE: cubre los ítems de las 9 colecciones del `CvProfile` (+ dependencias
 * de artefactos) y las salas de `SALAS`. NO cubre campos singleton —identity,
 * positioning, headlines, keywords, source—: no se eligen por ítem, se editan
 * en el SSOT o en el pack de copy del tema.
 *
 * El `surface` es DÓNDE se presenta hoy ese hecho en el tema `museo`. Es
 * informativo para el reporte: un hecho incluido sin superficie es una señal
 * (deuda de proyección), no un error de cobertura.
 */
import { PROFILE } from "../../data/profile.generated.ts";
import type { CvProfile } from "../../data/profile.types.ts";
import { SALAS } from "../../cv/salas.ts";
import { projectKey } from "../cv/proyectos.ts";
import { orgEs } from "../cv/org.ts";
import { experienceKey, factId, publicationKey } from "./keys.ts";
import type { Fact, FactCollection } from "./types.ts";

/** Superficie de un proyecto: la sala se DERIVA de `published`, no se cura. */
export function projectSurface(published: boolean): string {
  return published ? "El Marco" : "El Bastidor";
}

/** Título de sala sin el markup museístico (`<em>…</em>`). */
function roomLabel(titulo: string): string {
  return titulo.replace(/<[^>]+>/g, "").trim();
}

/**
 * Universo de hechos del perfil + salas, en orden estable por colección.
 * Acepta un perfil y unas salas alternativos para tests de cobertura (un hecho
 * nuevo del SSOT tiene que aparecer como "sin decisión").
 */
export function factUniverse(
  profile: CvProfile = PROFILE as unknown as CvProfile,
  rooms: readonly { id: string; titulo: string; hidden?: boolean }[] = SALAS
): FactCollection[] {
  return [
    {
      id: "proyectos",
      label: "Proyectos",
      facts: profile.projects.map((project) => ({
        id: factId("proyectos", projectKey(project.name)),
        collection: "proyectos",
        key: projectKey(project.name),
        label: project.name,
        surface: projectSurface(project.published)
      }))
    },
    {
      id: "publicaciones",
      label: "Publicaciones",
      facts: profile.publications.map((publication) => ({
        id: factId("publicaciones", publicationKey(publication)),
        collection: "publicaciones",
        key: publicationKey(publication),
        label: `${publication.year} · ${publication.title}`,
        surface: "La Biblioteca"
      }))
    },
    {
      id: "experiencia",
      label: "Experiencia",
      facts: profile.experience.map((item) => ({
        id: factId("experiencia", experienceKey(item)),
        collection: "experiencia",
        key: experienceKey(item),
        label: `${orgEs(item.org)} · ${item.role.es ?? item.role.en} · ${item.start.slice(0, 4)}`,
        surface: "El Friso · print-CV"
      }))
    },
    {
      id: "formacion",
      label: "Formación",
      facts: profile.education.map((item) => {
        const key = item.id ?? `${item.degree.es ?? item.degree.en}|${item.institution}|${item.start}`;
        return {
          id: factId("formacion", key),
          collection: "formacion",
          key,
          label: `${item.degree.es ?? item.degree.en} · ${item.institution} · ${item.start.slice(0, 4)}`,
          surface: "print-CV · Formación académica"
        };
      })
    },
    {
      id: "competencias",
      label: "Competencias",
      facts: profile.skills.map((skill) => ({
        id: factId("competencias", skill.name),
        collection: "competencias",
        key: skill.name,
        label: skill.name,
        surface: "print-CV · Competencias"
      }))
    },
    {
      id: "idiomas",
      label: "Idiomas",
      facts: profile.languages.map((language) => ({
        id: factId("idiomas", language.code),
        collection: "idiomas",
        key: language.code,
        label: `${language.code} · ${language.level}`,
        surface: "print-CV · Competencias"
      }))
    },
    {
      id: "credenciales",
      label: "Credenciales",
      facts: profile.credentials.map((credential) => ({
        id: factId("credenciales", credential.id),
        collection: "credenciales",
        key: credential.id,
        label: `${credential.title} · ${credential.issuer}`
        // Sin superficie: el tema museo no publica credenciales como entidad.
      }))
    },
    {
      id: "artefactos",
      label: "Artefactos",
      facts: profile.artifacts.map((artifact) => ({
        id: factId("artefactos", artifact.id),
        collection: "artefactos",
        key: artifact.id,
        label: `${artifact.kind} · ${artifact.title}`
        // Sin superficie propia: se presentan a través de su proyecto.
      }))
    },
    {
      id: "salas",
      label: "Salas",
      facts: rooms.map((room) => ({
        id: factId("salas", room.id),
        collection: "salas",
        key: room.id,
        label: roomLabel(room.titulo),
        ...(room.hidden ? {} : { surface: "DOM · HUD · plano" })
      }))
    }
  ];
}

/** Todos los hechos del universo, aplanados, en orden de colección. */
export function allFacts(collections: readonly FactCollection[] = factUniverse()): Fact[] {
  return collections.flatMap((collection) => collection.facts);
}
