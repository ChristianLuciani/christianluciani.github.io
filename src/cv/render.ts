/**
 * render — deriva navegación, numeración, i18n estructural y metadatos de sala
 * desde SALAS (SPEC: docs/REFACTOR_PLAN.md §3.1). Las funciones puras son
 * testeables en node (vitest); `mountSalas()` es la única que toca el DOM.
 *
 * Flujo en el browser:
 *   main.ts (módulo diferido, corre tras parsear el HTML) → mountSalas():
 *     1. Regenera los .nav-dot (HUD: número + label) desde SALAS.
 *     2. Auto-corrige .room-number / .room-title / .room-subtitle si hay deriva.
 *     3. Sincroniza los labels del HUD con el idioma activo.
 *     4. Monta el IntersectionObserver de estado activo (aria-current).
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

/** Una entrada del HUD: número + label siempre visibles (número decorativo). */
function navLink(target: string, label: string, labelEn: string, num: string): string {
  return (
    `<a class="nav-dot" href="#${target}" data-target="${target}"` +
    ` data-label="${label}" data-label-en="${labelEn}">` +
    `<span class="n" aria-hidden="true">${num}</span>` +
    `<span class="nav-label">${label}</span></a>`
  );
}

/** HTML del HUD (hero + salas visibles), desde SALAS. */
export function navDotsHtml(): string {
  const rows = [navLink(HERO_NAV.id, HERO_NAV.navLabel, HERO_NAV.navLabelEn, "00")];
  for (const s of visibleSalas()) {
    rows.push(navLink(sectionId(s.id), s.navLabel, s.navLabelEn, numFor(s.id) ?? ""));
  }
  return rows.join("\n");
}

/** Label visible de una entrada del HUD en el idioma activo. */
function labelFor(link: HTMLElement): string {
  const en = typeof document !== "undefined" && document.documentElement.lang === "en";
  const label = en ? link.dataset.labelEn : link.dataset.label;
  return label ?? "";
}

/** Sincroniza los labels visibles del HUD con <html lang>. Idempotente. */
export function syncNavLang(): void {
  if (typeof document === "undefined") return;
  const links = Array.from(document.querySelectorAll<HTMLElement>(".nav-dot"));
  for (const link of links) {
    const span = link.querySelector<HTMLElement>(".nav-label");
    const label = labelFor(link);
    if (span && label) span.textContent = label;
  }
  const active = document.querySelector<HTMLElement>('.nav-dot[aria-current="true"]');
  if (active) {
    const current = document.getElementById("hud-current");
    if (current) current.textContent = labelFor(active);
  }
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
 * "SALA 01"→"ROOM 01" (visibles), subtitulo→subtituloEn (todas), el título en
 * mayúsculas (el plano lo rotula así) y "SALA"→"ROOM" (etiqueta del plano). El
 * script i18n las fusiona en el MAP en runtime (idempotente).
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
  const plain = (html: string) => html.replace(/<[^>]*>/g, "").toUpperCase();
  for (const s of SALAS) {
    extra[plain(s.titulo)] = plain(s.tituloEn);
  }
  extra["SALA"] = "ROOM";
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

function setNavActive(activeId: string): void {
  const links = Array.from(document.querySelectorAll<HTMLElement>(".nav-dot"));
  let active: HTMLElement | null = null;
  for (const link of links) {
    const on = link.dataset.target === activeId;
    link.classList.toggle("active", on);
    if (on) {
      link.setAttribute("aria-current", "true");
      active = link;
    } else {
      link.removeAttribute("aria-current");
    }
  }
  if (active) {
    const current = document.getElementById("hud-current");
    if (current) current.textContent = labelFor(active);
  }
}

function observeNavActive(targets: string[]): void {
  // Banda angosta alrededor del centro del viewport: la sala que la cruza es la
  // activa. Es más estable que un umbral de área en salas de alto variable.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) setNavActive(e.target.id);
      }
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );
  for (const t of targets) {
    const el = document.getElementById(t);
    if (el) io.observe(el);
  }
  setNavActive(targets[0]);
}

/** Monta todo lo derivado de SALAS. Idempotente: re-ejecutar es seguro. */
export function mountSalas(): void {
  if (typeof document === "undefined") return;

  // 1) HUD regenerado desde SALAS y sus labels alineados al idioma activo.
  const nav = document.getElementById("nav");
  if (nav) nav.innerHTML = navDotsHtml();
  syncNavLang();

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
