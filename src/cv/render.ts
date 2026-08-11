/**
 * render — deriva navegación, numeración, i18n estructural y metadatos de sala
 * desde SALAS (SPEC: docs/REFACTOR_PLAN.md §3.1). Las funciones puras son
 * testeables en node (vitest); `mountSalas()` es la única que toca el DOM.
 *
 * Flujo en el browser:
 *   main.ts (módulo diferido, corre tras parsear el HTML) → mountSalas():
 *     1. Regenera los .nav-dot de #nav desde SALAS (fuente de verdad).
 *     2. Auto-corrige .room-number / .room-title / .room-subtitle si hay deriva.
 *     3. Publica window.__CV_I18N__ = { ROOM_EN, MAP_EXTRA } para el script i18n.
 *     4. Monta el IntersectionObserver de estado activo del nav.
 *     5. Dispara 'cv:salas-ready' para que el i18n refresque títulos e idioma.
 */

import { HERO_NAV, SALAS, type SalaDef } from "./salas.ts";

/** id de <section> a partir del id de sala: 'perfil' → 'room-perfil' */
export function sectionId(id: string): string {
  return `room-${id}`;
}

/** Salas visibles (excluye hidden: galería) — las que se numeran y navegan. */
export function visibleSalas(): SalaDef[] {
  return SALAS.filter((s) => !s.hidden);
}

/** Objetivos de navegación en orden: hero + salas visibles (ids de <section>). */
export function navTargets(): string[] {
  return [HERO_NAV.id, ...visibleSalas().map((s) => sectionId(s.id))];
}

/** HTML de los puntos del nav lateral (hero + salas visibles), desde SALAS. */
export function navDotsHtml(): string {
  const rows = [
    `<div class="nav-dot" data-target="${HERO_NAV.id}" data-label="${HERO_NAV.navLabel}"></div>`
  ];
  for (const s of visibleSalas()) {
    rows.push(
      `<div class="nav-dot" data-target="${sectionId(s.id)}" data-label="${s.navLabel}"></div>`
    );
  }
  return rows.join("\n");
}

/**
 * Número de sala (01..N) según el orden de las salas VISIBLES. `null` para salas
 * ocultas (la galería no se numera: su numeración actual "SALA 05" es stale y queda
 * fuera de la fuente de verdad por estar oculta).
 */
export function numFor(id: string): string | null {
  const idx = visibleSalas().findIndex((s) => s.id === id);
  if (idx === -1) return null;
  return String(idx + 1).padStart(2, "0");
}

/**
 * ROOM_EN[] — traducciones EN de los títulos, en ORDEN DEL DOM (incluye salas
 * ocultas): el script i18n recorre `document.querySelectorAll('.room-title')`
 * posicionalmente, así que el índice debe casar con SALAS en orden DOM.
 */
export function roomEnList(): string[] {
  return SALAS.map((s) => s.tituloEn);
}

/**
 * MAP_EXTRA — claves de sala del diccionario i18n generadas desde SALAS:
 * "SALA 01"→"ROOM 01" (visibles) y subtitulo→subtituloEn (todas). El script i18n
 * las fusiona en el MAP en runtime (idempotente).
 */
export function mapExtra(): Record<string, string> {
  const extra: Record<string, string> = {};
  for (const s of visibleSalas()) {
    const num = numFor(s.id);
    if (num) extra[`SALA ${num}`] = `ROOM ${num}`;
  }
  for (const s of SALAS) {
    extra[s.subtitulo] = s.subtituloEn;
  }
  return extra;
}

/* ──────────────────────────────────────────────
   DOM (browser) — mountSalas()
────────────────────────────────────────────── */

function applyRoomMeta(room: HTMLElement, s: SalaDef): void {
  const numEl = room.querySelector<HTMLElement>(".room-content > .room-number");
  const num = numFor(s.id);
  if (numEl && num) {
    const es = `SALA ${num}`;
    const en = `ROOM ${num}`;
    const cur = numEl.textContent;
    // No pisa traducciones del i18n (EN) ni valores correctos (ES): si el texto
    // ya es ES o EN, tocar el nodo lo desengancharía del walker del i18n.
    if (cur !== es && cur !== en) numEl.textContent = es;
  }
  const titleEl = room.querySelector<HTMLElement>(".room-content > .room-title");
  if (titleEl && titleEl.innerHTML !== s.titulo && titleEl.innerHTML !== s.tituloEn) {
    titleEl.innerHTML = s.titulo;
  }
  const subEl = room.querySelector<HTMLElement>(".room-content > .room-subtitle");
  if (subEl && subEl.textContent !== s.subtitulo && subEl.textContent !== s.subtituloEn) {
    subEl.textContent = s.subtitulo;
  }
}

function observeNavActive(targets: string[]): void {
  const dots = Array.from(document.querySelectorAll<HTMLElement>(".nav-dot"));
  const dotById = new Map<string, HTMLElement>();
  for (let i = 0; i < targets.length; i++) {
    const dot = dots[i];
    if (dot) dotById.set(targets[i], dot);
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const dot = dotById.get(e.target.id);
        if (dot) dot.classList.toggle("active", e.isIntersecting);
      }
    },
    { threshold: 0.4 }
  );
  for (const t of targets) {
    const el = document.getElementById(t);
    if (el) io.observe(el);
  }
}

/** Monta todo lo derivado de SALAS. Idempotente: re-ejecutar es seguro. */
export function mountSalas(): void {
  if (typeof document === "undefined") return;

  // 1) Nav lateral regenerado desde SALAS.
  const nav = document.getElementById("nav");
  if (nav) nav.innerHTML = navDotsHtml();

  // 2) Metadatos por sala (número/título/subtítulo) — auto-corrección si hay deriva.
  for (const s of SALAS) {
    if (s.hidden) continue;
    const room = document.getElementById(sectionId(s.id));
    if (room) applyRoomMeta(room, s);
  }

  // 3) Estado activo del nav (los dots nuevos no tienen los observers viejos).
  observeNavActive(navTargets());

  // 4) Avisa al i18n (módulo) que refresque títulos capturados y re-aplique
  //    el idioma actual (idempotente). En Fase 2 el i18n importa SALAS directo;
  //    el evento cubre la auto-corrección por deriva (drift-guard).
  document.dispatchEvent(new CustomEvent("cv:salas-ready"));
}
