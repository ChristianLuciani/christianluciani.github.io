/**
 * PROYECTOS — vista de El Marco / El Bastidor: hechos del SSOT + curación.
 *
 * NO hay hechos acá. Cada ficha se DERIVA de `PROFILE.projects`:
 *   · la separación de salas sale de `published`, que la proyección calcula
 *     desde `projects[].artifactRefs` → artifact público con `locator.url`
 *     (profile-as-code §18.5). No existe un campo editorial `etapa`;
 *   · nombre, `status`, descripción base, links y fuentes de evidencia salen
 *     del snapshot commiteado;
 *   · el título museográfico, la razón `falta` (curada, nunca inventada) y el
 *     orden de presentación viven en `src/content/cv/proyectos.ts` (D2).
 *
 * `html` es la tarjeta sin la envoltura de scroll/delay: el renderer
 * (`tarjetas()` en sala_html) añade `data-scroll`/`data-delay` y, en El
 * Bastidor, la línea de graduación. `src/data/private-surfaces.test.ts` (#114)
 * escanea estas fichas: no pueden enlazar una superficie privada.
 */
import { MARCO, statusClass, statusLabel } from "../content/cv/museo.ts";
import { PROJECT_CURATION, projectKey } from "../content/cv/proyectos.ts";
import { PROFILE } from "./profile.generated.ts";
import type { CvProfile, ProjectItem } from "./profile.types.ts";

export interface Proyecto {
  /** Nombre corto del SSOT (clave de curación; sin slug derivado de URLs). */
  id: string;
  /** Nombre para lectores de pantalla/tests; la tarjeta lleva su propio <em>. */
  nombre: string;
  /** Predicado derivado de `artifactRefs` (ver `ProjectItem.published`). */
  published: boolean;
  /** Estado del SSOT (`active`, `experimental`, `planning`, `maintained`, …). */
  status?: string;
  /**
   * Orden de presentación (más reciente primero). No es un hecho del SSOT:
   * es curación museográfica. Sin fecha verificable queda al final; no se
   * inventa una.
   */
  recencia?: string;
  /** Qué le falta para pasar a El Marco (sólo fichas sin artefacto público). */
  falta?: string;
  /** true = no se renderiza como tarjeta: su ficha es el showcase dedicado. */
  sinTarjeta?: boolean;
  /** Links del SSOT (links + evidence[].source), deduplicados. */
  links: string[];
  /** HTML interno de la tarjeta; ausente si `sinTarjeta`. */
  html?: string;
}

/** Escape mínimo para valores del SSOT (son datos, no markup). */
function esc(s: string | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Etiqueta de presentación de un link (host → nombre corto). */
const LINK_LABELS: Record<string, string> = {
  "github.com": "Repositorio",
  "doi.org": "DOI",
  "papers.ssrn.com": "SSRN",
  "ssrn.com": "SSRN",
  "researchgate.net": "ResearchGate",
  "www.researchgate.net": "ResearchGate",
  "zenodo.org": "Zenodo",
  "aiche.confex.com": "AIChE"
};

function linkLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const base = LINK_LABELS[parsed.hostname] ?? parsed.hostname.replace(/^www\./, "");
    // Un link a un archivo dentro del repo (p. ej. docs/ci-cd.md) no se
    // confunde con el repositorio mismo: se agrega el último segmento.
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (base === "Repositorio" && segments.length > 2) {
      return `${base} · ${segments[segments.length - 1]}`;
    }
    return base;
  } catch {
    return url;
  }
}

/** Links + fuentes de evidencia del SSOT, en orden y sin duplicados. */
function projectLinks(project: ProjectItem): string[] {
  const all = [...project.links, ...project.evidence.map((ev) => ev.source).filter(Boolean)];
  return [...new Set(all.filter((url) => /^https?:\/\//.test(url)))];
}

function cardHtml(project: ProjectItem): string {
  const key = projectKey(project.name);
  const curation = PROJECT_CURATION[key];
  const status = statusLabel(project.published, project.status);
  const subtitle = curation?.subtitle ? ` — ${esc(curation.subtitle.es)}` : "";
  const description = project.description?.es ?? project.description?.en ?? "";
  const anchors = projectLinks(project)
    .map(
      (url) =>
        `<a class="pub-doi" href="${esc(url)}" target="_blank" rel="noopener">↗ ${esc(linkLabel(url))}</a>`
    )
    .join("\n        ");
  return `      <span class="project-status ${statusClass(project.published, project.status)}">${esc(status.es)}</span>
      <div class="project-title"><em>${esc(key)}</em>${subtitle}</div>
      <div class="project-tagline">${esc(description)}</div>${
        anchors ? `\n      <div class="project-note">\n        ${anchors}\n      </div>` : ""
      }`;
}

/** Proyección de una ficha del SSOT a la vista del museo. */
export function toProyecto(project: ProjectItem): Proyecto {
  const key = projectKey(project.name);
  const curation = PROJECT_CURATION[key];
  return {
    id: key,
    nombre: key,
    published: project.published,
    ...(project.status ? { status: project.status } : {}),
    ...(curation?.recencia ? { recencia: curation.recencia } : {}),
    ...(curation?.falta && !project.published ? { falta: curation.falta.es } : {}),
    ...(curation?.sinTarjeta ? { sinTarjeta: true } : {}),
    links: projectLinks(project),
    ...(curation?.sinTarjeta ? {} : { html: cardHtml(project) })
  };
}

/** Todas las fichas del SSOT (en orden del SSOT, sin ordenar). */
export function proyectosDe(profile: CvProfile = PROFILE as unknown as CvProfile): Proyecto[] {
  return profile.projects.map((p) => toProyecto(p));
}

export const PROYECTOS: readonly Proyecto[] = proyectosDe();

/* Orden de tarjetas: más reciente primero. `recencia` es ISO, así que el orden
 * lexicográfico es el cronológico; una ficha sin fecha verificable va al final. */
const porRecencia = (a: Proyecto, b: Proyecto): number =>
  (b.recencia ?? "").localeCompare(a.recencia ?? "");

/** Obra publicada y auditable: lo que El Marco puede colgar. */
export function publicadosDe(profile: CvProfile = PROFILE as unknown as CvProfile): Proyecto[] {
  return proyectosDe(profile).filter((p) => p.published).sort(porRecencia);
}

/** Sin artefacto público: cada una declara qué le falta (si está curada). */
export function enDesarrolloDe(profile: CvProfile = PROFILE as unknown as CvProfile): Proyecto[] {
  return proyectosDe(profile).filter((p) => !p.published).sort(porRecencia);
}

export const publicados: readonly Proyecto[] = publicadosDe();
export const enDesarrollo: readonly Proyecto[] = enDesarrolloDe();

/** Ficha del showcase de Drahma (misma vista, para no duplicar el hecho). */
export function showcaseProject(
  profile: CvProfile = PROFILE as unknown as CvProfile
): ProjectItem | undefined {
  return profile.projects.find((p) => projectKey(p.name) === "Drahma");
}

/** Label del cierre de El Bastidor (el template sólo lo renderiza). */
export const CIERRE_BASTIDOR_TEXT = MARCO.closing.es;
