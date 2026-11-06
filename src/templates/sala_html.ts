import { assetAttrs } from "../ts/assets/url.ts";
import { t, ta, th } from "../content/copy.ts";

/**
 * SALAS: comentario editorial + shell de <section> + header GENERADO desde SALAS
 * + body de contenido. (Extraído del monolito de Fase 1; regenerable.)
 */
import { SALAS, type SalaDef } from "../cv/salas.ts";
import { numFor } from "../cv/render.ts";
import { DRAHMA, MARCO, formatMonthYear, formatPeriod, orgEs, statusClass, statusLabel } from "../content/cv/museo.ts";
import { PROJECT_CURATION, projectKey } from "../content/cv/proyectos.ts";
import {
  bastidorClosing,
  enDesarrolloDe,
  publicadosDe,
  showcaseProject,
  type Proyecto
} from "../data/proyectos.ts";
import { profileProse } from "../content/cv/profile-prose.ts";
import { PROFILE } from "../data/profile.generated.ts";
import type { CvProfile, ExperienceItem } from "../data/profile.types.ts";

/** Snapshot commiteado (as const): el render recibe el perfil por parámetro. */
const P = PROFILE as unknown as CvProfile;

/**
 * Presentación por sala (no estructura): variante de data-scroll del título y
 * número heredado de la galería oculta (su "SALA 05" stale es invisible y se
 * conserva para paridad byte a byte con el HTML histórico).
 */
export const ROOM_META: Record<string, { titleScroll: string; legacyNum?: string }> = {
  perfil:       { titleScroll: "zoom-in" },
  proyectos:    { titleScroll: "zoom-in" },
  experiencia:  { titleScroll: "zoom-in" },
  galeria:      { titleScroll: "zoom-out", legacyNum: "05" },
  fisica:       { titleScroll: "zoom-out" },
  competencias: { titleScroll: "zoom-in" },
  grafo:        { titleScroll: "zoom-in" },
  contacto:     { titleScroll: "zoom-out" }
};

/** Comentario editorial + apertura de <section> + canvas + <div class="room-content">. */
export const ROOM_SHELL: Record<string, string> = {
  perfil: `<!-- ════════════════════════════════════════════════════
  SALA — Perfil y Formación
════════════════════════════════════════════════════ -->
<section class="room room--alt" id="room-perfil">
  <canvas class="room-canvas" id="c-necker" role="img" aria-label="${ta("room.perfil.aria.necker")}"></canvas>

  <div class="room-content">
`,
  proyectos: `<!-- ════════════════════════════════════════════════════
  SALA — Proyectos Activos y en Desarrollo
  NOTA: Estos proyectos son privados / en desarrollo.
  Las descripciones muestran el problema que resuelven,
  no los detalles de implementación.
════════════════════════════════════════════════════ -->
<section class="room" id="room-proyectos">
  <canvas class="room-canvas" id="c-proyectos" role="img" aria-label="${ta("room.proyectos.aria.fractal")}"></canvas>

  <div class="room-content">
`,
  bastidor: `<!-- ════════════════════════════════════════════════════
  SALA — El Bastidor (en desarrollo)
  NOTA: lo que todavía no tiene artefacto público. Cada ficha
  declara qué le falta para pasar a El Marco.
════════════════════════════════════════════════════ -->
<section class="room" id="room-bastidor">
  <canvas class="room-canvas" id="c-bastidor" role="img" aria-label="${ta("room.proyectos.aria.fractal")}"></canvas>

  <div class="room-content">
`,
  experiencia: `<!-- ════════════════════════════════════════════════════



  SALA — Trayectoria Profesional
════════════════════════════════════════════════════ -->
<section class="room room--alt" id="room-experiencia">
  <canvas class="room-canvas" id="c-exp" role="img" aria-label="${ta("room.experiencia.aria.interference")}"></canvas>

  <div class="room-content">
`,
  galeria: `<!-- ════════════════════════════════════════════════════
  SALA — Evidencia (oculta, pendiente de llenar)
  INSTRUCCIONES PARA COMPLETAR:
  · Añade <img src="ruta/foto.jpg"> dentro de cada .gallery-slot
  · El placeholder desaparece automáticamente al haber imagen
  · Cambia data-caption con el pie de foto
  · Puedes añadir más .gallery-slot o cambiar cols-3 a cols-2/cols-4
════════════════════════════════════════════════════ -->
<section class="room room--hidden" id="room-galeria"><!-- Sala de Evidencia pendiente de llenar (oculta) -->
  <div class="room-content">
`,
  fisica: `<!-- ════════════════════════════════════════════════════
  SALA — La Biblioteca (Publicaciones y Preprints)
════════════════════════════════════════════════════ -->
<section class="room room--alt" id="room-fisica">
  <canvas class="room-canvas" id="c-fisica" role="img" aria-label="${ta("room.fisica.aria.snakes")}"></canvas>

  <div class="room-content">
`,
  competencias: `<!-- ════════════════════════════════════════════════════
  SALA — Competencias
════════════════════════════════════════════════════ -->
<section class="room" id="room-competencias">
  <canvas class="room-canvas" id="c-comp" role="img" aria-label="${ta("room.competencias.aria.sierpinski")}"></canvas>

  <div class="room-content">
`,
  grafo: `<!-- ════════════════════════════════════════════════════
  SALA — El Compás
════════════════════════════════════════════════════ -->
<section class="room" id="room-grafo">
  <div class="room-content">
`,
  contacto: `<!-- ════════════════════════════════════════════════════
  SALA — Contacto / Salida
════════════════════════════════════════════════════ -->
<section class="room room--alt room--contact" id="room-contacto">
  <div class="room-content">
`,
};

/** Contenido de la sala (tras el header) hasta </section> + divider. */
/** Cierre común de sala (una tarjeta/CIERRE termina el <section>). */
const ROOM_TAIL = `
  </div><!-- /room-content -->
</section>
<div class="room-divider"></div>

`;

/** Escape de valores del SSOT/curación (son datos, no markup). */
function esc(s: string | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Host de un link del SSOT (label de presentación); cae a la URL cruda. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Showcase Drahma — la ficha completa de una obra publicada. Nombre, estado,
 * descripción base, link y fecha verificable salen del SSOT; las celdas de
 * interpretación (diseño, pedagogía, campo) son curación de `src/content/cv/`.
 */
export function drahmaShowcase(profile: CvProfile): string {
  const project = showcaseProject(profile);
  if (!project) return "";
  const key = projectKey(project.name);
  const verified = project.evidence.find((e) => e.verified)?.verified;
  const date = formatMonthYear(verified);
  // El status del SSOT decide sala y clase; la píldora curada (licencia/fecha/
  // repo) sólo refina el detalle si `published` coincide (F4).
  const derived = statusLabel(project.published, project.status);
  const status = project.published ? (PROJECT_CURATION[key]?.statusLabel ?? derived) : derived;
  const description = project.description?.es ?? project.description?.en ?? "";
  const repo = project.links[0];
  const cells = DRAHMA.cells
    .map(
      (cell, i) => `
            <div class="drahma-cell" data-scroll="from-center" data-delay="${Math.min(i + 1, 4)}">
              <div class="drahma-cell-icon">${cell.icon}</div>
              <div class="drahma-cell-label">${esc(cell.label.es)}</div>
              <div class="drahma-cell-text">${esc(cell.text.es)}</div>
            </div>`
    )
    .join("");
  return `<div class="drahma-showcase" data-scroll="up">
      <span class="project-status ${statusClass(project.published, project.status)}">${esc(status.es)}</span>
      <div class="drahma-showcase-head">
        <img src="/assets/images/drahman-logo.png"
             alt="${esc(key)} logo" width="44" height="44" loading="lazy" decoding="async"
             class="drahma-showcase-logo"
             onerror="this.style.display='none'">
        <h3 class="drahma-showcase-title">${DRAHMA.projectLabel.es} <em>${esc(key)}</em></h3>
      </div>
      <div class="project-tagline">${esc(description)}</div>
      <div class="room-subtitle" data-scroll="up" data-delay="1">${DRAHMA.subtitle.es}${date ? ` · ${date.toUpperCase()}` : ""}</div>

      <div class="drahma-columns two-col-drahma">
        <div>
          <div class="timeline-note" data-scroll="from-left">
            <strong>${DRAHMA.timelineLabel.es}</strong>
            ${esc(DRAHMA.timeline.es)}
          </div>
          <div class="drahma-grid">${cells}
          </div>
        </div>

        <div class="drahma-aside" data-scroll="from-right">
          <div class="illusion-frame illusion-frame--340">
            <canvas id="c-stairs-ill" class="illusion-canvas"></canvas>
            <div class="illusion-label">${t("room.proyectos.illusionStairs")}</div>
            <a class="illusion-link" href="https://michaelbach.de/ot/sze-penrose-stairs/" target="_blank" rel="noopener">↗ michaelbach.de</a>
          </div>
          <div class="lab-stem-card" data-scroll="up" data-delay="2">
            <div class="lab-stem-label">${DRAHMA.labStem.label.es}</div>
            <div class="lab-stem-title">${DRAHMA.labStem.title.es}</div>
            <ul class="entry-body">
${DRAHMA.labStem.items.map((item) => `              <li>${esc(item.es)}</li>`).join("\n")}
            </ul>
          </div>
        </div>
      </div><!-- /grid drahma -->

      <div class="repo-strategy" data-scroll="up">
        <div class="repo-label">${DRAHMA.repo.label.es}</div>
        <p class="repo-strategy-lede">${esc(DRAHMA.repo.lede.es)}</p>
        <ul class="entry-body">
${DRAHMA.repo.items.map((item) => `          <li>${esc(item.es)}</li>`).join("\n")}
        </ul>${
          repo
            ? `
        <a class="pub-doi" href="${esc(repo)}" target="_blank" rel="noopener">↗ ${esc(hostOf(repo))}</a>`
            : ""
        }
      </div>
    </div><!-- /showcase drahma -->
${ROOM_TAIL}`;
}

/**
 * Cierre de El Bastidor: la sala declara por qué existe. El texto se DERIVA del
 * dato (`bastidorClosing`): cuántas fichas enlazan material público y cuántas
 * declaran `falta`; si alguna no está curada, el cierre cuantifica el hueco en
 * vez de afirmar que todas dicen qué les falta.
 */
export function cierreBastidor(profile: CvProfile = P): string {
  const closing = bastidorClosing(profile);
  return `
    <p class="room-closing" data-scroll="up">
      ${esc(closing.es)}
    </p>
${ROOM_TAIL}`;
}

/**
 * El Friso — El Friso NO contiene cargos ni fechas: todo sale de
 * `PROFILE.experience`, ordenado por `end` desc / `start` desc y repartido en
 * las dos columnas históricas (mitad y mitad, orden de lectura cronológico).
 */
function compararExperiencia(a: ExperienceItem, b: ExperienceItem): number {
  const end = (e: ExperienceItem): string => (e.end === "present" ? "9999-99-99" : e.end);
  return end(b).localeCompare(end(a)) || b.start.localeCompare(a.start);
}

function entradaFriso(item: ExperienceItem, columna: number, indice: number): string {
  const delay = indice === 0 ? "" : ` data-delay="${Math.min(indice, 5)}"`;
  const scroll = columna === 0 ? "from-left" : "from-right";
  const role = item.role.es ?? item.role.en;
  const bullets = (item.highlights?.es ?? item.highlights?.en ?? [])
    .map((h) => `            <li>${esc(h)}</li>`)
    .join("\n");
  return `
        <div class="entry" data-scroll="${scroll}"${delay}>
          <div class="entry-period">${formatPeriod(item, "es")}</div>
          <div class="entry-title">${esc(role)}</div>
          <div class="entry-org">${esc(orgEs(item.org))}</div>${bullets ? `
          <ul class="entry-body">
${bullets}
          </ul>` : ""}
        </div>
`;
}

export function frisoHtml(profile: CvProfile): string {
  const ordered = [...profile.experience].sort(compararExperiencia);
  const half = Math.ceil(ordered.length / 2);
  const columns = [ordered.slice(0, half), ordered.slice(half)]
    .map((items, column) => `
      <div>${items.map((item, i) => entradaFriso(item, column, i)).join("")}      </div>`)
    .join("\n");
  return `
    <div class="two-col">${columns}
    </div><!-- /two-col -->
  </div>
</section>
<div class="room-divider"></div>


`;
}

/**
 * Tarjetas de una sala: la envoltura (scroll/delay/última) la añade el renderer,
 * el copy viene de `src/data/proyectos.ts` (byte-idéntico: las claves del i18n
 * son el texto ES exacto) y el cierre de graduación solo existe en El Bastidor.
 *
 * Si la ficha tiene un artefacto, TODA la tarjeta abre el primero (el repo):
 * un hit transparente cubre la ficha y los enlaces de la nota quedan por encima.
 * Las fichas sin artefacto no fingen un click que no existe.
 */
export function primerArtefacto(html: string | undefined): { href: string; blank: boolean } | null {
  const first = html?.match(/<a\b([^>]*)>/i);
  const href = first?.[1].match(/\bhref="([^"]+)"/i)?.[1];
  if (!href) return null;
  return { href, blank: /\btarget="_blank"/i.test(first![1]) };
}

function tarjetas(lista: readonly Proyecto[]): string {
  const cards = lista
    .map((p, i) => {
      const delay = i === 0 ? "" : ` data-delay="${Math.min(i, 5)}"`;
      const falta = p.falta
        ? `
      <div class="project-falta"><span class="project-falta-label">${esc(MARCO.faltaLabel.es)}</span> ${esc(p.falta)}</div>`
        : "";
      // Sólo la obra publicada abre la ficha completa: una ficha en desarrollo
      // conserva sus links clicables en vez de fingir un artefacto que no existe.
      const artefacto = p.published ? primerArtefacto(p.html) : null;
      const hit = artefacto
        ? `
      <a class="project-card-hit" href="${artefacto.href}"${artefacto.blank ? ' target="_blank" rel="noopener"' : ""}
         aria-label="Abrir ${esc(p.nombre)}" data-aria-es="Abrir ${esc(p.nombre)}" data-aria-en="Open ${esc(p.nombre)}"></a>`
        : "";
      return `
    <div class="project-card${artefacto ? " project-card--linked" : ""}" data-scroll="from-left"${delay} data-recencia="${p.recencia ?? ""}">
${hit}${p.html ?? ""}${falta}
    </div>
`;
    })
    .join("");
  // Con dos fichas la grilla de tres columnas dejaría un hueco: se declara par.
  const pairing = lista.length === 2 ? " project-grid--pair" : "";
  return `<div class="project-grid${pairing}">${cards}</div>`;
}

export const ROOM_BODY: Record<string, string> = {
  galeria: `
    <!-- Sub-galería: Drahma y campo amazónico -->
    <div data-scroll="up" data-delay="1">
      <div class="gallery-label">${t("gallery.amazon.label")}</div>
      <div class="gallery-grid cols-3 gallery-grid--280">
        <div class="gallery-slot" data-caption="${ta("gallery.amazon.1.caption")}">
          <!-- <img src="galeria/drahma-campo-1.jpg"> -->
          <div class="gallery-placeholder-icon">🐉</div>
          <div class="gallery-placeholder-text">${t("gallery.amazon.1.title")}<br>${t("gallery.action.photo")}</div>
        </div>
        <div class="gallery-slot" data-caption="${ta("gallery.amazon.2.caption")}">
          <!-- <img src="galeria/drahma-campo-2.jpg"> -->
          <div class="gallery-placeholder-icon">🌿</div>
          <div class="gallery-placeholder-text">${t("gallery.amazon.2.title")}<br>${t("gallery.action.photo")}</div>
        </div>
        <div class="gallery-slot" data-caption="${ta("gallery.amazon.3.caption")}">
          <!-- <img src="galeria/drahma-screenshot.jpg"> -->
          <div class="gallery-placeholder-icon">📱</div>
          <div class="gallery-placeholder-text">${t("gallery.amazon.3.title")}<br>${t("gallery.action.screenshot")}</div>
        </div>
      </div>
    </div>

    <!-- Sub-galería: Lab STEM -->
    <div class="section-block--spaced" data-scroll="up" data-delay="2">
      <div class="gallery-label">${t("gallery.stem.label")}</div>
      <div class="gallery-grid cols-4 gallery-grid--220">
        <div class="gallery-slot" data-caption="${ta("gallery.stem.1.caption")}">
          <div class="gallery-placeholder-icon">🖨️</div>
          <div class="gallery-placeholder-text">${t("gallery.stem.1.title")}<br>${t("gallery.action.photo")}</div>
        </div>
        <div class="gallery-slot" data-caption="${ta("gallery.stem.2.caption")}">
          <div class="gallery-placeholder-icon">🧩</div>
          <div class="gallery-placeholder-text">${t("gallery.stem.2.title")}<br>${t("gallery.action.photo")}</div>
        </div>
        <div class="gallery-slot" data-caption="${ta("gallery.stem.3.caption")}">
          <div class="gallery-placeholder-icon">⚡</div>
          <div class="gallery-placeholder-text">${t("gallery.stem.3.title")}<br>${t("gallery.action.photo")}</div>
        </div>
        <div class="gallery-slot" data-caption="${ta("gallery.stem.4.caption")}">
          <div class="gallery-placeholder-icon">👥</div>
          <div class="gallery-placeholder-text">${t("gallery.stem.4.title")}<br>${t("gallery.action.photo")}</div>
        </div>
      </div>
    </div>

    <!-- Sub-galería: Eventos y ciencia -->
    <div class="section-block--spaced" data-scroll="up" data-delay="3">
      <div class="gallery-label">${t("gallery.science.label")}</div>
      <div class="gallery-grid cols-2 gallery-grid--260">
        <div class="gallery-slot" data-caption="${ta("gallery.science.1.caption")}">
          <div class="gallery-placeholder-icon">🔬</div>
          <div class="gallery-placeholder-text">${t("gallery.science.1.title")}<br>${t("gallery.action.photo")}</div>
        </div>
        <div class="gallery-slot" data-caption="${ta("gallery.science.2.caption")}">
          <div class="gallery-placeholder-icon">☢️</div>
          <div class="gallery-placeholder-text">${t("gallery.science.2.title")}<br>${t("gallery.action.photo")}</div>
        </div>
      </div>
    </div>

  </div><!-- /room-content -->
</section>
<div class="room-divider"></div>


`,
  fisica: `
    <div class="pub-layout two-col-pub">

      <!-- Lista de publicaciones -->
      <div data-scroll="from-left">
        <div class="pub-item">
          <div class="pub-year">2026</div>
          <img class="pub-thumb" ${assetAttrs("/assets/kontablo2026_thumb-7y4PiTON.jpg")} alt="${ta("pub.kontablo.alt")}" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">${t("pub.kontablo.title")}</div>
            <div class="pub-journal">${th("pub.kontablo.venue")}</div>
            <a class="pub-doi" href="https://doi.org/10.5281/zenodo.20738795" target="_blank">↗ 10.5281/zenodo.20738795</a>
            <a class="pub-doi" href="https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6960598" target="_blank">${t("pub.kontablo.ssrn")}</a>
            <a class="pub-doi" href="https://www.researchgate.net/publication/407549570_Kontablo_A_Graph-Based_Universal_Accounting_Ontology_for_the_M2M_Agentic_Economy" target="_blank">↗ ResearchGate</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2025</div>
          <img class="pub-thumb" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiB2aWV3Qm94PSIwIDAgMjAwIDE0MCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiMwYjExMjAiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjQiIGZpbGw9IiMwMGM5YzAiLz4KICA8IS0tIEpvdXJuYWwgbGFiZWwgLS0+CiAgPHRleHQgeD0iMTAiIHk9IjIyIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjgiIGZpbGw9IiMwMGM5YzAiIGxldHRlci1zcGFjaW5nPSIxIj5DQVJCT04gVFJFTkRTPC90ZXh0PgogIDx0ZXh0IHg9IjEwIiB5PSIzNCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSI3IiBmaWxsPSIjNmI3YThkIj4yMDI1PC90ZXh0PgogIDwhLS0gRGVjb3JhdGl2ZSBmcmFjdGFsLWlzaCBsaW5lIC0tPgogIDxwb2x5bGluZSBwb2ludHM9IjEwLDQ1IDMwLDQwIDUwLDQ4IDcwLDM4IDkwLDQ2IDExMCwzNiAxMzAsNDQgMTUwLDM0IDE3MCw0MiAxOTAsMzgiIAogICAgICAgICAgICBzdHJva2U9IiMwMGM5YzAiIHN0cm9rZS13aWR0aD0iMC41IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjQiLz4KICA8IS0tIFRpdGxlIC0tPgogIDx0ZXh0IHg9IjEwIiB5PSI3MiIgZm9udC1mYW1pbHk9InNlcmlmIiBmb250LXNpemU9IjExIiBmaWxsPSIjZDZkZGU4IiBmb250LXN0eWxlPSJpdGFsaWMiPkNhZmZlaW5lLWJhc2VkIFBWQTwvdGV4dD4KICA8dGV4dCB4PSIxMCIgeT0iODciIGZvbnQtZmFtaWx5PSJzZXJpZiIgZm9udC1zaXplPSIxMSIgZmlsbD0iI2Q2ZGRlOCIgZm9udC1zdHlsZT0iaXRhbGljIj5jb21wb3NpdGUgZm9yIFVWIHNoaWVsZGluZzwvdGV4dD4KICA8IS0tIEJvdHRvbSBsaW5lIC0tPgogIDx0ZXh0IHg9IjEwIiB5PSIxMTgiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNyIgZmlsbD0iIzZiN2E4ZCI+Qy4gTHVjaWFuaSBldCBhbC48L3RleHQ+CiAgPHJlY3QgeD0iMCIgeT0iMTI4IiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMGM5YzAiIG9wYWNpdHk9IjAuMyIvPgogIDx0ZXh0IHg9IjEwIiB5PSIxMzciIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNiIgZmlsbD0iIzZiN2E4ZCIgb3BhY2l0eT0iMC42Ij5kb2kub3JnPC90ZXh0Pgo8L3N2Zz4=" alt="${ta("pub.caffeine.alt")}" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">${t("pub.caffeine.title")}</div>
            <div class="pub-journal">${th("pub.caffeine.venue")}</div>
            <a class="pub-doi" href="https://doi.org/10.1016/j.cartre.2025.100502" target="_blank">↗ 10.1016/j.cartre.2025.100502</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2025</div>
          <img class="pub-thumb" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiB2aWV3Qm94PSIwIDAgMjAwIDE0MCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiMwYjExMjAiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjQiIGZpbGw9IiNjOWE4NGMiLz4KICA8IS0tIEpvdXJuYWwgbGFiZWwgLS0+CiAgPHRleHQgeD0iMTAiIHk9IjIyIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjgiIGZpbGw9IiNjOWE4NGMiIGxldHRlci1zcGFjaW5nPSIxIj5DSEVNUEhZU0NIRU08L3RleHQ+CiAgPHRleHQgeD0iMTAiIHk9IjM0IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjciIGZpbGw9IiM2YjdhOGQiPjIwMjU8L3RleHQ+CiAgPCEtLSBEZWNvcmF0aXZlIGZyYWN0YWwtaXNoIGxpbmUgLS0+CiAgPHBvbHlsaW5lIHBvaW50cz0iMTAsNDUgMzAsNDAgNTAsNDggNzAsMzggOTAsNDYgMTEwLDM2IDEzMCw0NCAxNTAsMzQgMTcwLDQyIDE5MCwzOCIgCiAgICAgICAgICAgIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIwLjUiIGZpbGw9Im5vbmUiIG9wYWNpdHk9IjAuNCIvPgogIDwhLS0gVGl0bGUgLS0+CiAgPHRleHQgeD0iMTAiIHk9IjcyIiBmb250LWZhbWlseT0ic2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNkNmRkZTgiIGZvbnQtc3R5bGU9Iml0YWxpYyI+VHVuYWJsZSBEaWVsZWN0cmljPC90ZXh0PgogIDx0ZXh0IHg9IjEwIiB5PSI4NyIgZm9udC1mYW1pbHk9InNlcmlmIiBmb250LXNpemU9IjExIiBmaWxsPSIjZDZkZGU4IiBmb250LXN0eWxlPSJpdGFsaWMiPkNhcmJvbiBNYXRlcmlhbHM8L3RleHQ+CiAgPCEtLSBCb3R0b20gbGluZSAtLT4KICA8dGV4dCB4PSIxMCIgeT0iMTE4IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjciIGZpbGw9IiM2YjdhOGQiPkMuIEx1Y2lhbmkgZXQgYWwuPC90ZXh0PgogIDxyZWN0IHg9IjAiIHk9IjEyOCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxIiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjMiLz4KICA8dGV4dCB4PSIxMCIgeT0iMTM3IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjYiIGZpbGw9IiM2YjdhOGQiIG9wYWNpdHk9IjAuNiI+ZG9pLm9yZzwvdGV4dD4KPC9zdmc+" alt="${ta("pub.dielectric.alt")}" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">${t("pub.dielectric.title")}</div>
            <div class="pub-journal">${th("pub.dielectric.venue")}</div>
            <a class="pub-doi" href="https://doi.org/10.1002/cphc.202400711" target="_blank">↗ 10.1002/cphc.202400711</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2019–24</div>
          <img class="pub-thumb" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiB2aWV3Qm94PSIwIDAgMjAwIDE0MCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiMwYjExMjAiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjQiIGZpbGw9IiNjOWE4NGMiLz4KICA8dGV4dCB4PSIxMCIgeT0iMjIiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iOCIgZmlsbD0iI2M5YTg0YyIgbGV0dGVyLXNwYWNpbmc9IjEiPlVTRlEgSU5TVC48L3RleHQ+CiAgPHRleHQgeD0iMTAiIHk9IjM0IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjciIGZpbGw9IiM2YjdhOGQiPjIwMTnigJMyNDwvdGV4dD4KICA8cG9seWxpbmUgcG9pbnRzPSIxMCw0NSAzMCw0MCA1MCw0OCA3MCwzOCA5MCw0NiAxMTAsMzYgMTMwLDQ0IDE1MCwzNCAxNzAsNDIgMTkwLDM4IgogICAgICAgICAgICBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMC41IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjQiLz4KICA8dGV4dCB4PSIxMCIgeT0iNzIiIGZvbnQtZmFtaWx5PSJzZXJpZiIgZm9udC1zaXplPSIxMSIgZmlsbD0iI2Q2ZGRlOCIgZm9udC1zdHlsZT0iaXRhbGljIj4zNiBHdcOtYXMgZGU8L3RleHQ+CiAgPHRleHQgeD0iMTAiIHk9Ijg3IiBmb250LWZhbWlseT0ic2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNkNmRkZTgiIGZvbnQtc3R5bGU9Iml0YWxpYyI+TGFib3JhdG9yaW8gZGUgRsOtc2ljYTwvdGV4dD4KICA8dGV4dCB4PSIxMCIgeT0iMTE4IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjciIGZpbGw9IiM2YjdhOGQiPkMuIEx1Y2lhbmkgZXQgYWwuPC90ZXh0PgogIDxyZWN0IHg9IjAiIHk9IjEyOCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxIiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjMiLz4KPC9zdmc+" alt="${ta("pub.guias.alt")}" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">${t("pub.guias.title")}</div>
            <div class="pub-journal">${th("pub.guias.venue")}</div>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2023</div>
          <img class="pub-thumb" ${assetAttrs("/assets/zambrano2023_thumb-DFrmN1Ce.jpg")} alt="${ta("pub.cellulose.alt")}" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">${t("pub.cellulose.title")}</div>
            <div class="pub-journal">${th("pub.cellulose.venue")}</div>
            <a class="pub-doi" href="https://doi.org/10.1016/j.heliyon.2023.e17258" target="_blank">↗ 10.1016/j.heliyon.2023.e17258</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2023</div>
          <img class="pub-thumb" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiB2aWV3Qm94PSIwIDAgMjAwIDE0MCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiMwYjExMjAiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjQiIGZpbGw9IiMwMGM5YzAiLz4KICA8dGV4dCB4PSIxMCIgeT0iMjIiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iOCIgZmlsbD0iIzAwYzljMCIgbGV0dGVyLXNwYWNpbmc9IjEiPlJFU0VBUkNIR0FURSBQUkVQUklOVDwvdGV4dD4KICA8dGV4dCB4PSIxMCIgeT0iMzQiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNyIgZmlsbD0iIzZiN2E4ZCI+MjAyMzwvdGV4dD4KICA8cG9seWxpbmUgcG9pbnRzPSIxMCw0NSAzMCw0MCA1MCw0OCA3MCwzOCA5MCw0NiAxMTAsMzYgMTMwLDQ0IDE1MCwzNCAxNzAsNDIgMTkwLDM4IgogICAgICAgICAgICBzdHJva2U9IiMwMGM5YzAiIHN0cm9rZS13aWR0aD0iMC41IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjQiLz4KICA8dGV4dCB4PSIxMCIgeT0iNzIiIGZvbnQtZmFtaWx5PSJzZXJpZiIgZm9udC1zaXplPSIxMSIgZmlsbD0iI2Q2ZGRlOCIgZm9udC1zdHlsZT0iaXRhbGljIj5IeWRyb2NoYXJzIGZyb208L3RleHQ+CiAgPHRleHQgeD0iMTAiIHk9Ijg3IiBmb250LWZhbWlseT0ic2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNkNmRkZTgiIGZvbnQtc3R5bGU9Iml0YWxpYyI+TGlnbm9jZWxsdWxvc2ljIFJlc2lkdWVzPC90ZXh0PgogIDx0ZXh0IHg9IjEwIiB5PSIxMTgiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNyIgZmlsbD0iIzZiN2E4ZCI+Qy4gTHVjaWFuaSBldCBhbC48L3RleHQ+CiAgPHJlY3QgeD0iMCIgeT0iMTI4IiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMGM5YzAiIG9wYWNpdHk9IjAuMyIvPgo8L3N2Zz4=" alt="${ta("pub.hydrochars.alt")}" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">${t("pub.hydrochars.title")}</div>
            <div class="pub-journal">${th("pub.hydrochars.venue")}</div>
            <a class="pub-doi" href="https://www.researchgate.net/publication/383276828" target="_blank">↗ ResearchGate</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2022</div>
          <img class="pub-thumb" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiB2aWV3Qm94PSIwIDAgMjAwIDE0MCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiMwYjExMjAiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjQiIGZpbGw9IiM2YjdhOGQiLz4KICA8IS0tIEpvdXJuYWwgbGFiZWwgLS0+CiAgPHRleHQgeD0iMTAiIHk9IjIyIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjgiIGZpbGw9IiM2YjdhOGQiIGxldHRlci1zcGFjaW5nPSIxIj5TU1JOPC90ZXh0PgogIDx0ZXh0IHg9IjEwIiB5PSIzNCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSI3IiBmaWxsPSIjNmI3YThkIj4yMDIyPC90ZXh0PgogIDwhLS0gRGVjb3JhdGl2ZSBmcmFjdGFsLWlzaCBsaW5lIC0tPgogIDxwb2x5bGluZSBwb2ludHM9IjEwLDQ1IDMwLDQwIDUwLDQ4IDcwLDM4IDkwLDQ2IDExMCwzNiAxMzAsNDQgMTUwLDM0IDE3MCw0MiAxOTAsMzgiIAogICAgICAgICAgICBzdHJva2U9IiM2YjdhOGQiIHN0cm9rZS13aWR0aD0iMC41IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjQiLz4KICA8IS0tIFRpdGxlIC0tPgogIDx0ZXh0IHg9IjEwIiB5PSI3MiIgZm9udC1mYW1pbHk9InNlcmlmIiBmb250LXNpemU9IjExIiBmaWxsPSIjZDZkZGU4IiBmb250LXN0eWxlPSJpdGFsaWMiPk1pY3JvY3J5c3RhbGxpbmUgY2VsbHVsb3NlPC90ZXh0PgogIDx0ZXh0IHg9IjEwIiB5PSI4NyIgZm9udC1mYW1pbHk9InNlcmlmIiBmb250LXNpemU9IjExIiBmaWxsPSIjZDZkZGU4IiBmb250LXN0eWxlPSJpdGFsaWMiPm9wdGltaXphdGlvbjwvdGV4dD4KICA8IS0tIEJvdHRvbSBsaW5lIC0tPgogIDx0ZXh0IHg9IjEwIiB5PSIxMTgiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNyIgZmlsbD0iIzZiN2E4ZCI+Qy4gTHVjaWFuaSBldCBhbC48L3RleHQ+CiAgPHJlY3QgeD0iMCIgeT0iMTI4IiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEiIGZpbGw9IiM2YjdhOGQiIG9wYWNpdHk9IjAuMyIvPgogIDx0ZXh0IHg9IjEwIiB5PSIxMzciIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNiIgZmlsbD0iIzZiN2E4ZCIgb3BhY2l0eT0iMC42Ij5kb2kub3JnPC90ZXh0Pgo8L3N2Zz4=" alt="${ta("pub.microcrystalline.alt")}" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">${t("pub.microcrystalline.title")}</div>
            <div class="pub-journal">${th("pub.microcrystalline.venue")}</div>
            <a class="pub-doi" href="https://doi.org/10.2139/ssrn.4307097" target="_blank">↗ 10.2139/ssrn.4307097</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2022</div>
          <img class="pub-thumb" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiB2aWV3Qm94PSIwIDAgMjAwIDE0MCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiMwYjExMjAiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjQiIGZpbGw9IiNjOWE4NGMiLz4KICA8IS0tIEpvdXJuYWwgbGFiZWwgLS0+CiAgPHRleHQgeD0iMTAiIHk9IjIyIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjgiIGZpbGw9IiNjOWE4NGMiIGxldHRlci1zcGFjaW5nPSIxIj5BSUNIRSBBTk5VQUwgTUVFVElORzwvdGV4dD4KICA8dGV4dCB4PSIxMCIgeT0iMzQiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNyIgZmlsbD0iIzZiN2E4ZCI+MjAyMjwvdGV4dD4KICA8IS0tIERlY29yYXRpdmUgZnJhY3RhbC1pc2ggbGluZSAtLT4KICA8cG9seWxpbmUgcG9pbnRzPSIxMCw0NSAzMCw0MCA1MCw0OCA3MCwzOCA5MCw0NiAxMTAsMzYgMTMwLDQ0IDE1MCwzNCAxNzAsNDIgMTkwLDM4IgogICAgICAgICAgICBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMC41IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjQiLz4KICA8IS0tIFRpdGxlIC0tPgogIDx0ZXh0IHg9IjEwIiB5PSI3MiIgZm9udC1mYW1pbHk9InNlcmlmIiBmb250LXNpemU9IjExIiBmaWxsPSIjZDZkZGU4IiBmb250LXN0eWxlPSJpdGFsaWMiPkl2b3J5IE51dCBSZXNpZHVlczo8L3RleHQ+CiAgPHRleHQgeD0iMTAiIHk9Ijg3IiBmb250LWZhbWlseT0ic2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNkNmRkZTgiIGZvbnQtc3R5bGU9Iml0YWxpYyI+Q2hlbWljYWwgQ29tcG9zaXRpb248L3RleHQ+CiAgPCEtLSBCb3R0b20gbGluZSAtLT4KICA8dGV4dCB4PSIxMCIgeT0iMTE4IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjciIGZpbGw9IiM2YjdhOGQiPk9yZWp1ZWxhIEVzY29iYXIgZXQgYWwuPC90ZXh0PgogIDxyZWN0IHg9IjAiIHk9IjEyOCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxIiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjMiLz4KICA8dGV4dCB4PSIxMCIgeT0iMTM3IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjYiIGZpbGw9IiM2YjdhOGQiIG9wYWNpdHk9IjAuNiI+YWljaGUuY29uZmV4LmNvbTwvdGV4dD4KPC9zdmc+Cg==" alt="${ta("pub.ivory.alt")}" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">${t("pub.ivory.title")}</div>
            <div class="pub-journal">${th("pub.ivory.venue")}</div>
            <a class="pub-doi" href="https://aiche.confex.com/aiche/2022/meetingapp.cgi/Paper/649030" target="_blank">${t("pub.ivory.link")}</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2006</div>
          <img class="pub-thumb" ${assetAttrs("/assets/cabrera2006_thumb-ByivZRQD.jpg")} alt="${ta("pub.neural.alt")}" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">${t("pub.neural.title")}</div>
            <div class="pub-journal">${th("pub.neural.venue")}</div>
            <a class="pub-doi" href="https://doi.org/10.5488/CMP.9.2.373" target="_blank">↗ 10.5488/CMP.9.2.373</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2006</div>
          <img class="pub-thumb" ${assetAttrs("/assets/hosaka2006_thumb-KMqoFzTp.jpg")} alt="${ta("pub.balancing.alt")}" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">${t("pub.balancing.title")}</div>
            <div class="pub-journal">${th("pub.balancing.venue")}</div>
            <a class="pub-doi" href="https://doi.org/10.1143/PTPS.161.314" target="_blank">↗ 10.1143/PTPS.161.314</a>
          </div>
        </div>
      </div>

      <!-- Ilusión sidebar -->
      <div class="pub-aside" data-scroll="from-right">
        <!-- PROMPT PARA GENERAR SVG:
             "Crea un SVG del Triángulo de Penrose (Penrose Triangle / impossible triangle, 1954).
              Vista en perspectiva que hace la figura geométricamente imposible.
              Colores: degradado de #00c9c0 a #c9a84c. Fondo transparente. 280×280px.
              El triángulo debe verse sólido y tridimensional pero imposible." -->
        <div class="illusion-frame illusion-frame--280">
          <canvas id="c-penrose" class="illusion-canvas" role="img" aria-label="${ta("room.fisica.aria.penrose")}"></canvas>
          <div class="illusion-label">${t("room.fisica.illusionLabel")}</div>
          <a class="illusion-link" href="https://michaelbach.de/ot/sze-penrose-triangle/" target="_blank" rel="noopener">↗ michaelbach.de</a>
        </div>
        <p class="pub-quote">
          ${t("room.fisica.quote")}
        </p>
      </div>
    </div>
  </div>
</section>
<div class="room-divider"></div>


`,
  competencias: `
    <div class="skills-grid" data-scroll="from-center">
      <div class="skill-block">
        <div class="skill-label">${t("room.competencias.agents.label")}</div>
        <ul class="skill-items">
          <li>${t("room.competencias.agents.1")}</li>
          <li>${t("room.competencias.agents.2")}</li>
          <li>${t("room.competencias.agents.3")}</li>
          <li>${t("room.competencias.agents.4")}</li>
        </ul>
      </div>
      <div class="skill-block">
        <div class="skill-label">${t("room.competencias.coding.label")}</div>
        <ul class="skill-items">
          <li>${t("room.competencias.coding.1")}</li>
          <li>${t("room.competencias.coding.2")}</li>
          <li>${t("room.competencias.coding.3")}</li>
        </ul>
      </div>
      <div class="skill-block">
        <div class="skill-label">${t("room.competencias.sovereignty.label")}</div>
        <ul class="skill-items">
          <li>${t("room.competencias.sovereignty.1")}</li>
          <li>${t("room.competencias.sovereignty.2")}</li>
          <li>${t("room.competencias.sovereignty.3")}</li>
          <li>${t("room.competencias.sovereignty.4")}</li>
          <li>${t("room.competencias.sovereignty.5")}</li>
        </ul>
      </div>
      <div class="skill-block">
        <div class="skill-label">${t("room.competencias.open.label")}</div>
        <ul class="skill-items">
          <li><a class="pub-doi" href="https://github.com/iOfficeAI/AionCore/pull/618" target="_blank" rel="noopener noreferrer">${t("room.competencias.open.1")}</a></li>
          <li><a class="pub-doi" href="https://github.com/svkozak/pi-acp/pull/76" target="_blank" rel="noopener noreferrer">${t("room.competencias.open.2")}</a></li>
          <li><a class="pub-doi" href="https://github.com/iOfficeAI/AionUi/pull/3614" target="_blank" rel="noopener noreferrer">${t("room.competencias.open.3")}</a></li>
          <li>${t("room.competencias.open.4")}</li>
        </ul>
      </div>
      <div class="skill-block">
        <div class="skill-label">${t("room.competencias.platforms.label")}</div>
        <ul class="skill-items">
          <li>${t("room.competencias.platforms.1")}</li>
          <li>${t("room.competencias.platforms.2")}</li>
          <li>Poe</li>
        </ul>
      </div>
      <div class="skill-block">
        <div class="skill-label">${t("room.competencias.sciences.label")}</div>
        <ul class="skill-items">
          <li>${t("room.competencias.sciences.1")}</li>
          <li>${t("room.competencias.sciences.2")}</li>
          <li>${t("room.competencias.sciences.3")}</li>
        </ul>
      </div>
      <div class="skill-block">
        <div class="skill-label">${t("room.competencias.languages.label")}</div>
        <ul class="skill-items">
          <li>${t("room.competencias.languages.1")}</li>
          <li>${t("room.competencias.languages.2")}</li>
          <li>${t("room.competencias.languages.3")}</li>
        </ul>
      </div>
    </div>

<div class="room-footnote">
      <div class="room-number">${t("room.competencias.interestsLabel")}</div>
      <p class="interests" data-scroll="zoom-in">
        ${t("room.competencias.interests")}
        <span class="hl">${t("room.competencias.interestsHighlight")}</span>
      </p>
    </div>
  </div>
</section>
<div class="room-divider"></div>


`,
  grafo: `    <p class="graph-lede" data-scroll="up" data-delay="2">
      ${t("room.grafo.lede")}
      <span class="hl">${t("room.grafo.teal")}</span>${t("room.grafo.published")}<span class="is-grey">${t("room.grafo.grey")}</span>${t("room.grafo.development")}<span class="hl-gold">${t("room.grafo.gold")}</span>${t("room.grafo.idea")}
    </p>
    <div id="graph-stage" class="graph-stage">
      <canvas id="c-graph" class="illusion-canvas"></canvas>
      <div id="graph-tip"></div>
    </div>
  </div>
</section>
<div class="room-divider"></div>

`,
  contacto: `
    <div class="contact-grid">
      <div class="contact-links" data-scroll="from-center" data-delay="2">
      <a class="contact-link" href="mailto:cluciani@gmail.com"><img class="ci" src="assets/icons/gmail.svg" alt="" width="16" height="16">cluciani@gmail.com</a>
      <a class="contact-link" href="https://wa.me/593993716335" target="_blank"><img class="ci" src="assets/icons/whatsapp.svg" alt="" width="16" height="16">${t("room.contacto.whatsapp")}</a>
      <a class="contact-link" href="https://orcid.org/0000-0002-6955-5384" target="_blank"><img class="ci" src="assets/icons/orcid.svg" alt="" width="16" height="16">${t("room.contacto.orcid")}</a>
      <a class="contact-link" href="https://scholar.google.com/citations?user=7GbpmSQAAAAJ&hl=en" target="_blank"><img class="ci" src="assets/icons/googlescholar.svg" alt="" width="16" height="16">${t("room.contacto.scholar")}</a>
      <a class="contact-link" href="https://github.com/ChristianLuciani" target="_blank"><img class="ci" src="assets/icons/github.svg" alt="" width="16" height="16">${t("room.contacto.github")}</a>
      <a class="contact-link" href="https://www.linkedin.com/in/christian-luciani" target="_blank"><img class="ci" src="assets/icons/linkedin.svg" alt="" width="16" height="16">${t("room.contacto.linkedin")}</a>
      <a class="contact-link" href="https://www.researchgate.net/profile/Christian-Luciani" target="_blank"><img class="ci" src="assets/icons/researchgate.svg" alt="" width="16" height="16">${t("room.contacto.researchgate")}</a>
      <a class="contact-link" href="https://x.com/cluciani_ve" target="_blank"><img class="ci" src="assets/icons/x.svg" alt="" width="16" height="16">${t("room.contacto.x")}</a>
      <a class="contact-link" href="https://www.instagram.com/clucianitoledo" target="_blank"><img class="ci" src="assets/icons/instagram.svg" alt="" width="16" height="16">${t("room.contacto.instagram")}</a>
      <a class="contact-link" href="https://www.patreon.com/cluciani" target="_blank" rel="noopener noreferrer"><img class="ci" src="assets/icons/patreon.svg" alt="" width="16" height="16">${t("room.contacto.patreon")}</a>
      </div>

      <!-- El Koch vuelve como pieza visual del Buzón (no es el loader) -->
      <div class="illusion-frame koch-buzon" data-scroll="zoom-in" data-delay="3">
        <canvas id="c-koch-buzon" class="illusion-canvas"></canvas>
        <div class="illusion-label">${t("room.contacto.illusionLabel")}</div>
        <a class="illusion-link" href="https://es.wikipedia.org/wiki/Copo_de_nieve_de_Koch" target="_blank" rel="noopener">↗ wikipedia</a>
      </div>
    </div>

    <div class="contact-note" data-scroll="up" data-delay="4">
      ${t("room.contacto.note")}
    </div>
  </div>
</section>


`,
};

/**
 * Body de la sala Perfil.
 *
 * La PROSA de perfil ya no es copy de esta sala: se deriva del SSOT
 * (`PROFILE.positioning.statement`, #122) y es la misma pieza que imprime el
 * print-CV. El resto del body sigue siendo el copy histórico de la sala (la
 * migración de esta sala al SSOT es otro issue: #99).
 */
function perfilBody(profile: CvProfile): string {
  return `
    <div class="profile-grid">

      <!-- Columna izquierda: tarjeta de perfil + ilusión -->
      <div class="profile-aside">
        <div class="profile-card" data-scroll="from-left">
          <!--
            FOTO: descomenta <img> y comenta .photo-ph-inner para activar
            O usa URL directa: src="https://url-de-tu-foto.jpg"
          -->
          <div class="photo-placeholder" id="photo-slot">
            <img src="https://lh3.googleusercontent.com/pw/AP1GczO0shri3gqnp7PXfST6iji5bEzrFTzJfnQwKJaGDiLIpGDDWUBgi0eSqW3v79qv63XXBukEWeyWLobOPjLO2NlsJJlyi_A_-KdJtjzJGswIfIank4YA=w500-h500-c"
                 alt="Christian Luciani"
                 onerror="this.style.display='none';document.getElementById('photo-fallback').style.display='flex'">
            <div class="photo-ph-inner photo-ph-inner--hidden" id="photo-fallback">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(0,201,192,0.4)" stroke-width="1" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              <span>${t("room.perfil.photoFallback")}</span>
            </div>
          </div>
          ${perfilProseHtml(profile)}
          <br>
          <p class="profile-text profile-text--meta">${t("room.perfil.drahmaLead")} <span class="hl">Drahma</span>${t("room.perfil.drahmaTail")}</p>
          <br>
          <p class="profile-text profile-text--meta">${t("room.perfil.bilingual")}</p>
        </div>

        <!-- Ilusión: Cubo de Necker animado -->
        <!-- PROMPT PARA GENERAR SVG EN OTRA SESIÓN:
             "Crea un SVG del Cubo de Necker (1832) en perspectiva isométrica.
              Líneas en #00c9c0 sobre fondo transparente. 300×300px.
              El cubo debe mostrar ambigüedad perceptual perfecta entre
              dos orientaciones posibles. Sin relleno, solo bordes." -->
        <div class="illusion-frame illusion-frame--250 illusion-frame--spaced" data-scroll="zoom-in" data-delay="2">
          <canvas id="c-necker-ill" class="illusion-canvas"></canvas>
          <div class="illusion-label">${t("room.perfil.illusionLabel")}</div>
          <a class="illusion-link" href="https://michaelbach.de/ot/sze-necker/" target="_blank" rel="noopener">↗ michaelbach.de</a>
        </div>
      </div>

      <!-- Columna derecha: formación y eventos -->
      <div>
        <div class="entry" data-scroll="from-right">
          <div class="entry-period">${t("room.perfil.edu.audiovisual.period")}</div>
          <div class="entry-title">${t("room.perfil.edu.audiovisual.title")}</div>
          <div class="entry-org">${t("room.perfil.edu.audiovisual.org")}</div>
        </div>

        <div class="entry" data-scroll="from-right" data-delay="1">
          <div class="entry-period">${t("room.perfil.edu.doctoral.period")}</div>
          <div class="entry-title">${t("room.perfil.edu.doctoral.title")}</div>
          <div class="entry-org">${t("room.perfil.edu.doctoral.org")}</div>
        </div>

        <div class="entry" data-scroll="from-right" data-delay="2">
          <div class="entry-period">${t("room.perfil.edu.physics.period")}</div>
          <div class="entry-title">${t("room.perfil.edu.physics.title")}</div>
          <div class="entry-org">${t("room.perfil.edu.physics.org")}</div>
        </div>

        <div class="quote-block" data-scroll="zoom-in" data-delay="3">
          ${t("room.perfil.quote1")}<br>
          ${t("room.perfil.quote2")}
        </div>

        <div class="entry" data-scroll="from-right" data-delay="3">
          <div class="entry-period">${t("room.perfil.edu.cern.period")}</div>
          <div class="entry-title">${t("room.perfil.edu.cern.title")}</div>
          <div class="entry-org">${t("room.perfil.edu.cern.org")}</div>
        </div>
      </div>
    </div><!-- /profile-grid -->
  </div><!-- /room-content -->
</section>
<div class="room-divider"></div>


`;
}

/**
 * Párrafo de prosa de perfil (sala de Perfil del sitio).
 *
 * Exportado para que el gate de #122 compare la MISMA pieza en las dos
 * superficies sin copiar el render: print y sala comparten `profileProse()`.
 */
export function perfilProseHtml(profile: CvProfile = P): string {
  const prose = profileProse(profile);
  // `||`: un `es` vacío cae a EN, la misma caída que documenta el resolver
  // (F1 del pase fresco de #122: con `??` el párrafo salía vacío).
  return `<p class="profile-text">${esc(prose.es || prose.en)}</p>`;
}

/** El Marco: obra publicada (derivada de `published`) + showcase de Drahma. */
export function marcoHtml(profile: CvProfile = P): string {
  const cards = tarjetas(publicadosDe(profile).filter((p) => !p.sinTarjeta));
  return `${cards}${drahmaShowcase(profile)}`;
}

/** El Bastidor: sin artefacto público; cada ficha declara su `falta` curada. */
export function bastidorHtml(profile: CvProfile = P): string {
  return `${tarjetas(enDesarrolloDe(profile))}${cierreBastidor(profile)}`;
}

/**
 * Body de una sala: estáticas por id; Perfil (#122) y las tres de #109 se
 * derivan del SSOT.
 */
export function roomBody(s: SalaDef, profile: CvProfile = P): string {
  switch (s.id) {
    case "perfil":
      return perfilBody(profile);
    case "experiencia":
      return frisoHtml(profile);
    case "proyectos":
      return marcoHtml(profile);
    case "bastidor":
      return bastidorHtml(profile);
    default:
      return ROOM_BODY[s.id] ?? "";
  }
}

function roomHeader(s: SalaDef): string {
  const meta = ROOM_META[s.id] ?? { titleScroll: "zoom-in" };
  const num = numFor(s.id) ?? meta.legacyNum ?? "";
  return (
    `    <div class="room-number" data-scroll="up">SALA ${num}</div>
` +
    `    <h2 class="room-title"   data-scroll="${meta.titleScroll}">${s.titulo}</h2>
` +
    `    <p class="room-function" data-scroll="up" data-delay="1">${s.funcion}</p>
` +
    `    <div class="room-subtitle" data-scroll="up" data-delay="2">${s.subtitulo}</div>
`
  );
}

/** Sala completa: comentario + shell + header(SALAS) + body. */
export function renderRoom(s: SalaDef): string {
  return ROOM_SHELL[s.id] + roomHeader(s) + roomBody(s);
}

/** Todas las salas en orden SALAS (DOM order). */
export function roomsHtml(): string {
  return SALAS.map((s) => renderRoom(s)).join("");
}
