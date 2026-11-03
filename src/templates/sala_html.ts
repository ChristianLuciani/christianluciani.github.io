import { assetAttrs } from "../ts/assets/url.ts";

/**
 * SALAS: comentario editorial + shell de <section> + header GENERADO desde SALAS
 * + body de contenido. (Extraído del monolito de Fase 1; regenerable.)
 */
import { SALAS, type SalaDef } from "../cv/salas.ts";
import { numFor } from "../cv/render.ts";
import { DRAHMA, MARCO, formatMonthYear, formatPeriod, orgEs, statusClass, statusLabel } from "../content/cv/museo.ts";
import { PROJECT_CURATION, projectKey } from "../content/cv/proyectos.ts";
import {
  enDesarrolloDe,
  publicadosDe,
  showcaseProject,
  type Proyecto
} from "../data/proyectos.ts";
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
  <canvas class="room-canvas" id="c-necker" role="img" aria-label="Cuadrícula de cubo de Necker"></canvas>

  <div class="room-content">
`,
  proyectos: `<!-- ════════════════════════════════════════════════════
  SALA — Proyectos Activos y en Desarrollo
  NOTA: Estos proyectos son privados / en desarrollo.
  Las descripciones muestran el problema que resuelven,
  no los detalles de implementación.
════════════════════════════════════════════════════ -->
<section class="room" id="room-proyectos">
  <canvas class="room-canvas" id="c-proyectos" role="img" aria-label="Campo fractal tipo Mandelbrot"></canvas>

  <div class="room-content">
`,
  bastidor: `<!-- ════════════════════════════════════════════════════
  SALA — El Bastidor (en desarrollo)
  NOTA: lo que todavía no tiene artefacto público. Cada ficha
  declara qué le falta para pasar a El Marco.
════════════════════════════════════════════════════ -->
<section class="room" id="room-bastidor">
  <canvas class="room-canvas" id="c-bastidor" role="img" aria-label="Campo fractal tipo Mandelbrot"></canvas>

  <div class="room-content">
`,
  experiencia: `<!-- ════════════════════════════════════════════════════



  SALA — Trayectoria Profesional
════════════════════════════════════════════════════ -->
<section class="room room--alt" id="room-experiencia">
  <canvas class="room-canvas" id="c-exp" role="img" aria-label="Patrón de interferencia de doble fuente"></canvas>

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
  <canvas class="room-canvas" id="c-fisica" role="img" aria-label="Ilusión de serpientes rotantes"></canvas>

  <div class="room-content">
`,
  competencias: `<!-- ════════════════════════════════════════════════════
  SALA — Competencias
════════════════════════════════════════════════════ -->
<section class="room" id="room-competencias">
  <canvas class="room-canvas" id="c-comp" role="img" aria-label="Triángulo de Sierpinski"></canvas>

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
            <div class="illusion-label">ESCALERA DE PENROSE · 1958</div>
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
 * Cierre de El Bastidor: la sala declara por qué existe. Hay dos variantes
 * porque la afirmación «ninguna tiene un artefacto que abrir» deja de ser
 * cierta en cuanto una ficha enlaza material público (p. ej. PRs upstream).
 */
export function cierreBastidor(profile: CvProfile = P): string {
  const conLinks = enDesarrolloDe(profile).filter((p) => p.links.length > 0).length;
  const closing = conLinks > 0 ? MARCO.closingSomePublic(conLinks) : MARCO.closing;
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
  perfil: `
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
              <span>Añadir foto local</span>
            </div>
          </div>
          <p class="profile-text">Físico con más de 20 años en la intersección entre investigación científica, docencia universitaria e innovación educativa.</p>
          <br>
          <p class="profile-text profile-text--meta">En 2024 diseñé e implementé <span class="hl">Drahma</span>: 36 tutores virtuales con inteligencia sintética y pedagogía socrática, alineados al currículo ecuatoriano, probados en campo con comunidades indígenas amazónicas.</p>
          <br>
          <p class="profile-text profile-text--meta">Bilingüe funcional español-inglés (inglés intermedio). Redes activas en Panamá y Ecuador.</p>
        </div>

        <!-- Ilusión: Cubo de Necker animado -->
        <!-- PROMPT PARA GENERAR SVG EN OTRA SESIÓN:
             "Crea un SVG del Cubo de Necker (1832) en perspectiva isométrica.
              Líneas en #00c9c0 sobre fondo transparente. 300×300px.
              El cubo debe mostrar ambigüedad perceptual perfecta entre
              dos orientaciones posibles. Sin relleno, solo bordes." -->
        <div class="illusion-frame illusion-frame--250 illusion-frame--spaced" data-scroll="zoom-in" data-delay="2">
          <canvas id="c-necker-ill" class="illusion-canvas"></canvas>
          <div class="illusion-label">CUBO DE NECKER · 1832</div>
          <a class="illusion-link" href="https://michaelbach.de/ot/sze-necker/" target="_blank" rel="noopener">↗ michaelbach.de</a>
        </div>
      </div>

      <!-- Columna derecha: formación y eventos -->
      <div>
        <div class="entry" data-scroll="from-right">
          <div class="entry-period">2006 – 2008</div>
          <div class="entry-title">Especialización en Audiovisuales</div>
          <div class="entry-org">Escuela de Cine y TV, Caracas · Prix du Public FECOVEN 2008</div>
        </div>

        <div class="entry" data-scroll="from-right" data-delay="1">
          <div class="entry-period">2003 – 2006</div>
          <div class="entry-title">Candidatura Doctoral — Sistemas Complejos (ABD)</div>
          <div class="entry-org">Universidad Simón Bolívar, Venezuela</div>
        </div>

        <div class="entry" data-scroll="from-right" data-delay="2">
          <div class="entry-period">1997 – 2003</div>
          <div class="entry-title">Licenciatura en Física</div>
          <div class="entry-org">Universidad Central de Venezuela · Tesis: Modelos Cosmológicos N-Dimensionales · SENESCYT: 862177536</div>
        </div>

        <div class="quote-block" data-scroll="zoom-in" data-delay="3">
          La física me enseñó a ver patrones donde otros ven ruido.<br>
          El cine me enseñó a hacer ese patrón visible para otros.
        </div>

        <div class="entry" data-scroll="from-right" data-delay="3">
          <div class="entry-period">2003 · CERN · BECA</div>
          <div class="entry-title">II Latin American School of High Energy Physics</div>
          <div class="entry-org">San Miguel Regla, México</div>
        </div>
      </div>
    </div><!-- /profile-grid -->
  </div><!-- /room-content -->
</section>
<div class="room-divider"></div>


`,
  galeria: `
    <!-- Sub-galería: Drahma y campo amazónico -->
    <div data-scroll="up" data-delay="1">
      <div class="gallery-label">DRAHMA · CAMPO AMAZÓNICO</div>
      <div class="gallery-grid cols-3 gallery-grid--280">
        <div class="gallery-slot" data-caption="Drahma — interfaz del tutor en campo">
          <!-- <img src="galeria/drahma-campo-1.jpg"> -->
          <div class="gallery-placeholder-icon">🐉</div>
          <div class="gallery-placeholder-text">DRAHMA EN CAMPO<br>Añadir fotografía</div>
        </div>
        <div class="gallery-slot" data-caption="Comunidad indígena amazónica · prueba piloto">
          <!-- <img src="galeria/drahma-campo-2.jpg"> -->
          <div class="gallery-placeholder-icon">🌿</div>
          <div class="gallery-placeholder-text">COMUNIDAD AMAZÓNICA<br>Añadir fotografía</div>
        </div>
        <div class="gallery-slot" data-caption="Pantalla del sistema Drahma · agosto 2024">
          <!-- <img src="galeria/drahma-screenshot.jpg"> -->
          <div class="gallery-placeholder-icon">📱</div>
          <div class="gallery-placeholder-text">INTERFAZ DEL SISTEMA<br>Añadir captura</div>
        </div>
      </div>
    </div>

    <!-- Sub-galería: Lab STEM -->
    <div class="section-block--spaced" data-scroll="up" data-delay="2">
      <div class="gallery-label">LABORATORIO STEM · FABRICACIÓN PEDAGÓGICA</div>
      <div class="gallery-grid cols-4 gallery-grid--220">
        <div class="gallery-slot" data-caption="Laboratorio STEM — USFQ 2024">
          <div class="gallery-placeholder-icon">🖨️</div>
          <div class="gallery-placeholder-text">IMPRESORA 3D<br>Añadir fotografía</div>
        </div>
        <div class="gallery-slot" data-caption="Juguetes pedagógicos producidos">
          <div class="gallery-placeholder-icon">🧩</div>
          <div class="gallery-placeholder-text">MATERIALES DIDÁCTICOS<br>Añadir fotografía</div>
        </div>
        <div class="gallery-slot" data-caption="Cortadora láser en proceso">
          <div class="gallery-placeholder-icon">⚡</div>
          <div class="gallery-placeholder-text">CORTADORA LÁSER<br>Añadir fotografía</div>
        </div>
        <div class="gallery-slot" data-caption="Estudiantes con los materiales">
          <div class="gallery-placeholder-icon">👥</div>
          <div class="gallery-placeholder-text">SESIÓN CON ESTUDIANTES<br>Añadir fotografía</div>
        </div>
      </div>
    </div>

    <!-- Sub-galería: Eventos y ciencia -->
    <div class="section-block--spaced" data-scroll="up" data-delay="3">
      <div class="gallery-label">CIENCIA EN PÚBLICO · EVENTOS</div>
      <div class="gallery-grid cols-2 gallery-grid--260">
        <div class="gallery-slot" data-caption="Casa Abierta USFQ — experimentos para público general">
          <div class="gallery-placeholder-icon">🔬</div>
          <div class="gallery-placeholder-text">CASA ABIERTA USFQ<br>Añadir fotografía</div>
        </div>
        <div class="gallery-slot" data-caption="Difractómetro de rayos X — USFQ">
          <div class="gallery-placeholder-icon">☢️</div>
          <div class="gallery-placeholder-text">DIFRACTÓMETRO DE RAYOS X<br>Añadir fotografía</div>
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
          <img class="pub-thumb" ${assetAttrs("/assets/kontablo2026_thumb-7y4PiTON.jpg")} alt="Kontablo preprint 2026" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">Kontablo: A Graph-Based Universal Accounting Ontology for the M2M Agentic Economy</div>
            <div class="pub-journal">Luciani, C. · Preprint (aún no arbitrado) · Zenodo &amp; SSRN</div>
            <a class="pub-doi" href="https://doi.org/10.5281/zenodo.20738795" target="_blank">↗ 10.5281/zenodo.20738795</a>
            <a class="pub-doi" href="https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6960598" target="_blank">↗ SSRN 6960598</a>
            <a class="pub-doi" href="https://www.researchgate.net/publication/407549570_Kontablo_A_Graph-Based_Universal_Accounting_Ontology_for_the_M2M_Agentic_Economy" target="_blank">↗ ResearchGate</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2025</div>
          <img class="pub-thumb" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiB2aWV3Qm94PSIwIDAgMjAwIDE0MCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiMwYjExMjAiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjQiIGZpbGw9IiMwMGM5YzAiLz4KICA8IS0tIEpvdXJuYWwgbGFiZWwgLS0+CiAgPHRleHQgeD0iMTAiIHk9IjIyIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjgiIGZpbGw9IiMwMGM5YzAiIGxldHRlci1zcGFjaW5nPSIxIj5DQVJCT04gVFJFTkRTPC90ZXh0PgogIDx0ZXh0IHg9IjEwIiB5PSIzNCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSI3IiBmaWxsPSIjNmI3YThkIj4yMDI1PC90ZXh0PgogIDwhLS0gRGVjb3JhdGl2ZSBmcmFjdGFsLWlzaCBsaW5lIC0tPgogIDxwb2x5bGluZSBwb2ludHM9IjEwLDQ1IDMwLDQwIDUwLDQ4IDcwLDM4IDkwLDQ2IDExMCwzNiAxMzAsNDQgMTUwLDM0IDE3MCw0MiAxOTAsMzgiIAogICAgICAgICAgICBzdHJva2U9IiMwMGM5YzAiIHN0cm9rZS13aWR0aD0iMC41IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjQiLz4KICA8IS0tIFRpdGxlIC0tPgogIDx0ZXh0IHg9IjEwIiB5PSI3MiIgZm9udC1mYW1pbHk9InNlcmlmIiBmb250LXNpemU9IjExIiBmaWxsPSIjZDZkZGU4IiBmb250LXN0eWxlPSJpdGFsaWMiPkNhZmZlaW5lLWJhc2VkIFBWQTwvdGV4dD4KICA8dGV4dCB4PSIxMCIgeT0iODciIGZvbnQtZmFtaWx5PSJzZXJpZiIgZm9udC1zaXplPSIxMSIgZmlsbD0iI2Q2ZGRlOCIgZm9udC1zdHlsZT0iaXRhbGljIj5jb21wb3NpdGUgZm9yIFVWIHNoaWVsZGluZzwvdGV4dD4KICA8IS0tIEJvdHRvbSBsaW5lIC0tPgogIDx0ZXh0IHg9IjEwIiB5PSIxMTgiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNyIgZmlsbD0iIzZiN2E4ZCI+Qy4gTHVjaWFuaSBldCBhbC48L3RleHQ+CiAgPHJlY3QgeD0iMCIgeT0iMTI4IiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMGM5YzAiIG9wYWNpdHk9IjAuMyIvPgogIDx0ZXh0IHg9IjEwIiB5PSIxMzciIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNiIgZmlsbD0iIzZiN2E4ZCIgb3BhY2l0eT0iMC42Ij5kb2kub3JnPC90ZXh0Pgo8L3N2Zz4=" alt="Carbon Trends 2025" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">Highly efficient caffeine-based PVA composite film for UV shielding</div>
            <div class="pub-journal">Trujillo Galarza et al. · Carbon Trends · Vol. 20, 100502</div>
            <a class="pub-doi" href="https://doi.org/10.1016/j.cartre.2025.100502" target="_blank">↗ 10.1016/j.cartre.2025.100502</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2025</div>
          <img class="pub-thumb" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiB2aWV3Qm94PSIwIDAgMjAwIDE0MCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiMwYjExMjAiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjQiIGZpbGw9IiNjOWE4NGMiLz4KICA8IS0tIEpvdXJuYWwgbGFiZWwgLS0+CiAgPHRleHQgeD0iMTAiIHk9IjIyIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjgiIGZpbGw9IiNjOWE4NGMiIGxldHRlci1zcGFjaW5nPSIxIj5DSEVNUEhZU0NIRU08L3RleHQ+CiAgPHRleHQgeD0iMTAiIHk9IjM0IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjciIGZpbGw9IiM2YjdhOGQiPjIwMjU8L3RleHQ+CiAgPCEtLSBEZWNvcmF0aXZlIGZyYWN0YWwtaXNoIGxpbmUgLS0+CiAgPHBvbHlsaW5lIHBvaW50cz0iMTAsNDUgMzAsNDAgNTAsNDggNzAsMzggOTAsNDYgMTEwLDM2IDEzMCw0NCAxNTAsMzQgMTcwLDQyIDE5MCwzOCIgCiAgICAgICAgICAgIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIwLjUiIGZpbGw9Im5vbmUiIG9wYWNpdHk9IjAuNCIvPgogIDwhLS0gVGl0bGUgLS0+CiAgPHRleHQgeD0iMTAiIHk9IjcyIiBmb250LWZhbWlseT0ic2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNkNmRkZTgiIGZvbnQtc3R5bGU9Iml0YWxpYyI+VHVuYWJsZSBEaWVsZWN0cmljPC90ZXh0PgogIDx0ZXh0IHg9IjEwIiB5PSI4NyIgZm9udC1mYW1pbHk9InNlcmlmIiBmb250LXNpemU9IjExIiBmaWxsPSIjZDZkZGU4IiBmb250LXN0eWxlPSJpdGFsaWMiPkNhcmJvbiBNYXRlcmlhbHM8L3RleHQ+CiAgPCEtLSBCb3R0b20gbGluZSAtLT4KICA8dGV4dCB4PSIxMCIgeT0iMTE4IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjciIGZpbGw9IiM2YjdhOGQiPkMuIEx1Y2lhbmkgZXQgYWwuPC90ZXh0PgogIDxyZWN0IHg9IjAiIHk9IjEyOCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxIiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjMiLz4KICA8dGV4dCB4PSIxMCIgeT0iMTM3IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjYiIGZpbGw9IiM2YjdhOGQiIG9wYWNpdHk9IjAuNiI+ZG9pLm9yZzwvdGV4dD4KPC9zdmc+" alt="ChemPhysChem 2025" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">Tunable Dielectric Carbon Materials from Hydrothermally Nanostructured Organic Carbon Sources</div>
            <div class="pub-journal">Landázuri et al. · ChemPhysChem · 26, e202400711</div>
            <a class="pub-doi" href="https://doi.org/10.1002/cphc.202400711" target="_blank">↗ 10.1002/cphc.202400711</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2019–24</div>
          <img class="pub-thumb" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiB2aWV3Qm94PSIwIDAgMjAwIDE0MCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiMwYjExMjAiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjQiIGZpbGw9IiNjOWE4NGMiLz4KICA8dGV4dCB4PSIxMCIgeT0iMjIiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iOCIgZmlsbD0iI2M5YTg0YyIgbGV0dGVyLXNwYWNpbmc9IjEiPlVTRlEgSU5TVC48L3RleHQ+CiAgPHRleHQgeD0iMTAiIHk9IjM0IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjciIGZpbGw9IiM2YjdhOGQiPjIwMTnigJMyNDwvdGV4dD4KICA8cG9seWxpbmUgcG9pbnRzPSIxMCw0NSAzMCw0MCA1MCw0OCA3MCwzOCA5MCw0NiAxMTAsMzYgMTMwLDQ0IDE1MCwzNCAxNzAsNDIgMTkwLDM4IgogICAgICAgICAgICBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMC41IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjQiLz4KICA8dGV4dCB4PSIxMCIgeT0iNzIiIGZvbnQtZmFtaWx5PSJzZXJpZiIgZm9udC1zaXplPSIxMSIgZmlsbD0iI2Q2ZGRlOCIgZm9udC1zdHlsZT0iaXRhbGljIj4zNiBHdcOtYXMgZGU8L3RleHQ+CiAgPHRleHQgeD0iMTAiIHk9Ijg3IiBmb250LWZhbWlseT0ic2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNkNmRkZTgiIGZvbnQtc3R5bGU9Iml0YWxpYyI+TGFib3JhdG9yaW8gZGUgRsOtc2ljYTwvdGV4dD4KICA8dGV4dCB4PSIxMCIgeT0iMTE4IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjciIGZpbGw9IiM2YjdhOGQiPkMuIEx1Y2lhbmkgZXQgYWwuPC90ZXh0PgogIDxyZWN0IHg9IjAiIHk9IjEyOCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxIiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjMiLz4KPC9zdmc+" alt="USFQ 2019-2024" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">36 guías de prácticas de laboratorio de física</div>
            <div class="pub-journal">USFQ · Ingeniería, Ciencias de la Salud, Ciencias Puras · Publicación institucional interna</div>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2023</div>
          <img class="pub-thumb" ${assetAttrs("/assets/zambrano2023_thumb-DFrmN1Ce.jpg")} alt="Heliyon 2023" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">Optimization of microfibrillated cellulose isolation from cocoa pod husk via mild oxalic acid hydrolysis</div>
            <div class="pub-journal">Zambrano et al. · Heliyon · 9, e17258</div>
            <a class="pub-doi" href="https://doi.org/10.1016/j.heliyon.2023.e17258" target="_blank">↗ 10.1016/j.heliyon.2023.e17258</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2023</div>
          <img class="pub-thumb" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiB2aWV3Qm94PSIwIDAgMjAwIDE0MCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiMwYjExMjAiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjQiIGZpbGw9IiMwMGM5YzAiLz4KICA8dGV4dCB4PSIxMCIgeT0iMjIiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iOCIgZmlsbD0iIzAwYzljMCIgbGV0dGVyLXNwYWNpbmc9IjEiPlJFU0VBUkNIR0FURSBQUkVQUklOVDwvdGV4dD4KICA8dGV4dCB4PSIxMCIgeT0iMzQiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNyIgZmlsbD0iIzZiN2E4ZCI+MjAyMzwvdGV4dD4KICA8cG9seWxpbmUgcG9pbnRzPSIxMCw0NSAzMCw0MCA1MCw0OCA3MCwzOCA5MCw0NiAxMTAsMzYgMTMwLDQ0IDE1MCwzNCAxNzAsNDIgMTkwLDM4IgogICAgICAgICAgICBzdHJva2U9IiMwMGM5YzAiIHN0cm9rZS13aWR0aD0iMC41IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjQiLz4KICA8dGV4dCB4PSIxMCIgeT0iNzIiIGZvbnQtZmFtaWx5PSJzZXJpZiIgZm9udC1zaXplPSIxMSIgZmlsbD0iI2Q2ZGRlOCIgZm9udC1zdHlsZT0iaXRhbGljIj5IeWRyb2NoYXJzIGZyb208L3RleHQ+CiAgPHRleHQgeD0iMTAiIHk9Ijg3IiBmb250LWZhbWlseT0ic2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNkNmRkZTgiIGZvbnQtc3R5bGU9Iml0YWxpYyI+TGlnbm9jZWxsdWxvc2ljIFJlc2lkdWVzPC90ZXh0PgogIDx0ZXh0IHg9IjEwIiB5PSIxMTgiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNyIgZmlsbD0iIzZiN2E4ZCI+Qy4gTHVjaWFuaSBldCBhbC48L3RleHQ+CiAgPHJlY3QgeD0iMCIgeT0iMTI4IiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMGM5YzAiIG9wYWNpdHk9IjAuMyIvPgo8L3N2Zz4=" alt="ResearchGate preprint 2023" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">Hydrochars from Lignocellulosic Residues for Green Electronics, Environmental Remediation, Energy and Agricultural Applications</div>
            <div class="pub-journal">Landázuri et al. · ResearchGate preprint</div>
            <a class="pub-doi" href="https://www.researchgate.net/publication/383276828" target="_blank">↗ ResearchGate</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2022</div>
          <img class="pub-thumb" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiB2aWV3Qm94PSIwIDAgMjAwIDE0MCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiMwYjExMjAiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjQiIGZpbGw9IiM2YjdhOGQiLz4KICA8IS0tIEpvdXJuYWwgbGFiZWwgLS0+CiAgPHRleHQgeD0iMTAiIHk9IjIyIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjgiIGZpbGw9IiM2YjdhOGQiIGxldHRlci1zcGFjaW5nPSIxIj5TU1JOPC90ZXh0PgogIDx0ZXh0IHg9IjEwIiB5PSIzNCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSI3IiBmaWxsPSIjNmI3YThkIj4yMDIyPC90ZXh0PgogIDwhLS0gRGVjb3JhdGl2ZSBmcmFjdGFsLWlzaCBsaW5lIC0tPgogIDxwb2x5bGluZSBwb2ludHM9IjEwLDQ1IDMwLDQwIDUwLDQ4IDcwLDM4IDkwLDQ2IDExMCwzNiAxMzAsNDQgMTUwLDM0IDE3MCw0MiAxOTAsMzgiIAogICAgICAgICAgICBzdHJva2U9IiM2YjdhOGQiIHN0cm9rZS13aWR0aD0iMC41IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjQiLz4KICA8IS0tIFRpdGxlIC0tPgogIDx0ZXh0IHg9IjEwIiB5PSI3MiIgZm9udC1mYW1pbHk9InNlcmlmIiBmb250LXNpemU9IjExIiBmaWxsPSIjZDZkZGU4IiBmb250LXN0eWxlPSJpdGFsaWMiPk1pY3JvY3J5c3RhbGxpbmUgY2VsbHVsb3NlPC90ZXh0PgogIDx0ZXh0IHg9IjEwIiB5PSI4NyIgZm9udC1mYW1pbHk9InNlcmlmIiBmb250LXNpemU9IjExIiBmaWxsPSIjZDZkZGU4IiBmb250LXN0eWxlPSJpdGFsaWMiPm9wdGltaXphdGlvbjwvdGV4dD4KICA8IS0tIEJvdHRvbSBsaW5lIC0tPgogIDx0ZXh0IHg9IjEwIiB5PSIxMTgiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNyIgZmlsbD0iIzZiN2E4ZCI+Qy4gTHVjaWFuaSBldCBhbC48L3RleHQ+CiAgPHJlY3QgeD0iMCIgeT0iMTI4IiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEiIGZpbGw9IiM2YjdhOGQiIG9wYWNpdHk9IjAuMyIvPgogIDx0ZXh0IHg9IjEwIiB5PSIxMzciIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNiIgZmlsbD0iIzZiN2E4ZCIgb3BhY2l0eT0iMC42Ij5kb2kub3JnPC90ZXh0Pgo8L3N2Zz4=" alt="SSRN 2022" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">Optimization of Microcrystalline Cellulose Isolation from Cocoa Pod Husk via Mild Oxalic Acid Hydrolysis</div>
            <div class="pub-journal">Zambrano et al. · SSRN Electronic Journal</div>
            <a class="pub-doi" href="https://doi.org/10.2139/ssrn.4307097" target="_blank">↗ 10.2139/ssrn.4307097</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2022</div>
          <img class="pub-thumb" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiB2aWV3Qm94PSIwIDAgMjAwIDE0MCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiMwYjExMjAiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjQiIGZpbGw9IiNjOWE4NGMiLz4KICA8IS0tIEpvdXJuYWwgbGFiZWwgLS0+CiAgPHRleHQgeD0iMTAiIHk9IjIyIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjgiIGZpbGw9IiNjOWE4NGMiIGxldHRlci1zcGFjaW5nPSIxIj5BSUNIRSBBTk5VQUwgTUVFVElORzwvdGV4dD4KICA8dGV4dCB4PSIxMCIgeT0iMzQiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNyIgZmlsbD0iIzZiN2E4ZCI+MjAyMjwvdGV4dD4KICA8IS0tIERlY29yYXRpdmUgZnJhY3RhbC1pc2ggbGluZSAtLT4KICA8cG9seWxpbmUgcG9pbnRzPSIxMCw0NSAzMCw0MCA1MCw0OCA3MCwzOCA5MCw0NiAxMTAsMzYgMTMwLDQ0IDE1MCwzNCAxNzAsNDIgMTkwLDM4IgogICAgICAgICAgICBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMC41IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjQiLz4KICA8IS0tIFRpdGxlIC0tPgogIDx0ZXh0IHg9IjEwIiB5PSI3MiIgZm9udC1mYW1pbHk9InNlcmlmIiBmb250LXNpemU9IjExIiBmaWxsPSIjZDZkZGU4IiBmb250LXN0eWxlPSJpdGFsaWMiPkl2b3J5IE51dCBSZXNpZHVlczo8L3RleHQ+CiAgPHRleHQgeD0iMTAiIHk9Ijg3IiBmb250LWZhbWlseT0ic2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNkNmRkZTgiIGZvbnQtc3R5bGU9Iml0YWxpYyI+Q2hlbWljYWwgQ29tcG9zaXRpb248L3RleHQ+CiAgPCEtLSBCb3R0b20gbGluZSAtLT4KICA8dGV4dCB4PSIxMCIgeT0iMTE4IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjciIGZpbGw9IiM2YjdhOGQiPk9yZWp1ZWxhIEVzY29iYXIgZXQgYWwuPC90ZXh0PgogIDxyZWN0IHg9IjAiIHk9IjEyOCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxIiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjMiLz4KICA8dGV4dCB4PSIxMCIgeT0iMTM3IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjYiIGZpbGw9IiM2YjdhOGQiIG9wYWNpdHk9IjAuNiI+YWljaGUuY29uZmV4LmNvbTwvdGV4dD4KPC9zdmc+Cg==" alt="AIChE Annual Meeting 2022" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">Ivory Nut (<em>Phytelephas equatorialis</em>) Residues: Chemical Composition for Applications in Health Care, Industry and Environmental Remediation — Towards Sustainability</div>
            <div class="pub-journal">Orejuela Escobar, Andrade, Luciani &amp; Niebieskikwiat · 2022 AIChE Annual Meeting · Abstract</div>
            <a class="pub-doi" href="https://aiche.confex.com/aiche/2022/meetingapp.cgi/Paper/649030" target="_blank">↗ AIChE 2022 · Paper 649030</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2006</div>
          <img class="pub-thumb" ${assetAttrs("/assets/cabrera2006_thumb-ByivZRQD.jpg")} alt="Condensed Matter Physics 2006" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">Neural control on multiple time scales: Insights from human stick balancing</div>
            <div class="pub-journal">Cabrera, Luciani, Milton · Condensed Matter Physics · Vol. 9, No. 2</div>
            <a class="pub-doi" href="https://doi.org/10.5488/CMP.9.2.373" target="_blank">↗ 10.5488/CMP.9.2.373</a>
          </div>
        </div>
        <div class="pub-item">
          <div class="pub-year">2006</div>
          <img class="pub-thumb" ${assetAttrs("/assets/hosaka2006_thumb-KMqoFzTp.jpg")} alt="Prog. Theor. Phys. 2006" onerror="this.classList.add('error');this.alt='§'">
          <div>
            <div class="pub-title">Balancing with Noise and Delay</div>
            <div class="pub-journal">Hosaka, Ohira, Luciani, Cabrera, Milton · Progress of Theoretical Physics Supplement · 161</div>
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
          <canvas id="c-penrose" class="illusion-canvas" role="img" aria-label="Triángulo de Penrose pulsante"></canvas>
          <div class="illusion-label">TRIÁNGULO DE PENROSE · 1954</div>
          <a class="illusion-link" href="https://michaelbach.de/ot/sze-penrose-triangle/" target="_blank" rel="noopener">↗ michaelbach.de</a>
        </div>
        <p class="pub-quote">
          "Lo imposible solo lo es hasta que alguien lo dibuja correctamente."
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
        <div class="skill-label">Código Sintético · Agentes</div>
        <ul class="skill-items">
          <li>Orquestación de agentes y cognición sintética</li>
          <li>Protocolos agénticos · MCP · ACP · A2A</li>
          <li>Tutores socráticos · IA educativa (Drahma)</li>
          <li>Ingeniería de contexto (RAG)</li>
        </ul>
      </div>
      <div class="skill-block">
        <div class="skill-label">Codificación Agéntica</div>
        <ul class="skill-items">
          <li>Desarrollo de software guiado por agentes</li>
          <li>Producto desde SPEC + TDD con agentes</li>
          <li>Mantenimiento e integración asistidos por IA</li>
        </ul>
      </div>
      <div class="skill-block">
        <div class="skill-label">Soberanía Tecnológica</div>
        <ul class="skill-items">
          <li>Self-hosting · infraestructura propia</li>
          <li>Inferencia soberana (LiteLLM · Ollama · cascada $0-primero)</li>
          <li>ERPNext self-hosted · ERP y contabilidad sin SaaS propietario</li>
          <li>Privacidad y datos propios (multi-tenant)</li>
          <li>Linux · macOS</li>
        </ul>
      </div>
      <div class="skill-block">
        <div class="skill-label">Open Source</div>
        <ul class="skill-items">
          <li><a class="pub-doi" href="https://github.com/iOfficeAI/AionCore/pull/618" target="_blank" rel="noopener noreferrer">AionCore · Agente Pi como built-in ACP ↗</a></li>
          <li><a class="pub-doi" href="https://github.com/svkozak/pi-acp/pull/76" target="_blank" rel="noopener noreferrer">pi-acp · session/delete ACP lifecycle ↗</a></li>
          <li><a class="pub-doi" href="https://github.com/iOfficeAI/AionUi/pull/3614" target="_blank" rel="noopener noreferrer">AionUi · Theme-aware monochrome logos (merged) ↗</a></li>
          <li>Publicación Kontablo · BSL 1.1 → Apache 2.0</li>
        </ul>
      </div>
      <div class="skill-block">
        <div class="skill-label">Plataformas & Ecosistema</div>
        <ul class="skill-items">
          <li>ERPNext · Zoho ERP</li>
          <li>Supabase · Chatwoot</li>
          <li>Poe</li>
        </ul>
      </div>
      <div class="skill-block">
        <div class="skill-label">Ciencias</div>
        <ul class="skill-items">
          <li>Sistemas complejos</li>
          <li>Difractometría de rayos X</li>
          <li>Seguridad radiológica</li>
        </ul>
      </div>
      <div class="skill-block">
        <div class="skill-label">Idiomas</div>
        <ul class="skill-items">
          <li>Español — nativo</li>
          <li>Inglés — intermedio</li>
          <li>Francés — B1</li>
        </ul>
      </div>
    </div>

<div class="room-footnote">
      <div class="room-number">INTERESES</div>
      <p class="interests" data-scroll="zoom-in">
        Escalada en roca · Montañismo · Cine asiático · Neurociencias ·
        Consecuencias filosóficas de la cognición sintética post-humana · Nutrición · Meditación ·
        <span class="hl">La naturaleza cognitiva de los seres orgánicos en un mundo de cognición sintética.</span>
      </p>
    </div>
  </div>
</section>
<div class="room-divider"></div>


`,
  grafo: `    <p class="graph-lede" data-scroll="up" data-delay="2">
      No solo amplitud: la conexión entre áreas, trabajos y proyectos.
      <span class="hl">Teal</span>, publicado · <span class="is-grey">gris</span>, en desarrollo · <span class="hl-gold">dorado</span>, todavía una idea.
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
      <a class="contact-link" href="https://wa.me/593993716335" target="_blank"><img class="ci" src="assets/icons/whatsapp.svg" alt="" width="16" height="16">WhatsApp (+593) 99 371 6335</a>
      <a class="contact-link" href="https://orcid.org/0000-0002-6955-5384" target="_blank"><img class="ci" src="assets/icons/orcid.svg" alt="" width="16" height="16">ORCID 0000-0002-6955-5384</a>
      <a class="contact-link" href="https://scholar.google.com/citations?user=7GbpmSQAAAAJ&hl=en" target="_blank"><img class="ci" src="assets/icons/googlescholar.svg" alt="" width="16" height="16">Google Scholar</a>
      <a class="contact-link" href="https://github.com/ChristianLuciani" target="_blank"><img class="ci" src="assets/icons/github.svg" alt="" width="16" height="16">GitHub</a>
      <a class="contact-link" href="https://www.linkedin.com/in/christian-luciani" target="_blank"><img class="ci" src="assets/icons/linkedin.svg" alt="" width="16" height="16">LinkedIn</a>
      <a class="contact-link" href="https://www.researchgate.net/profile/Christian-Luciani" target="_blank"><img class="ci" src="assets/icons/researchgate.svg" alt="" width="16" height="16">ResearchGate</a>
      <a class="contact-link" href="https://x.com/cluciani_ve" target="_blank"><img class="ci" src="assets/icons/x.svg" alt="" width="16" height="16">X @cluciani_ve</a>
      <a class="contact-link" href="https://www.instagram.com/clucianitoledo" target="_blank"><img class="ci" src="assets/icons/instagram.svg" alt="" width="16" height="16">Instagram</a>
      <a class="contact-link" href="https://www.patreon.com/cluciani" target="_blank" rel="noopener noreferrer"><img class="ci" src="assets/icons/patreon.svg" alt="" width="16" height="16">Patreon</a>
      </div>

      <!-- El Koch vuelve como pieza visual del Buzón (no es el loader) -->
      <div class="illusion-frame koch-buzon" data-scroll="zoom-in" data-delay="3">
        <canvas id="c-koch-buzon" class="illusion-canvas"></canvas>
        <div class="illusion-label">COPO DE KOCH · 1904</div>
        <a class="illusion-link" href="https://es.wikipedia.org/wiki/Copo_de_nieve_de_Koch" target="_blank" rel="noopener">↗ wikipedia</a>
      </div>
    </div>

    <div class="contact-note" data-scroll="up" data-delay="4">
      La naturaleza de los seres cognitivos y su interacción · emergencia de la inteligencia universal
    </div>
  </div>
</section>


`,
};

/** El Marco: obra publicada (derivada de `published`) + showcase de Drahma. */
export function marcoHtml(profile: CvProfile = P): string {
  const cards = tarjetas(publicadosDe(profile).filter((p) => !p.sinTarjeta));
  return `${cards}${drahmaShowcase(profile)}`;
}

/** El Bastidor: sin artefacto público; cada ficha declara su `falta` curada. */
export function bastidorHtml(profile: CvProfile = P): string {
  return `${tarjetas(enDesarrolloDe(profile))}${cierreBastidor(profile)}`;
}

/** Body de una sala: estáticas por id; las tres de #109 se derivan del SSOT. */
export function roomBody(s: SalaDef, profile: CvProfile = P): string {
  switch (s.id) {
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
