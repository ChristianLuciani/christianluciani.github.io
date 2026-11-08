/**
 * render — deriva navegación, numeración, i18n estructural y metadatos de sala
 * desde las salas de la NARRATIVA ACTIVA (default `museo` = SALAS; SPEC §3.1).
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

import { HERO_NAV } from "./salas.ts";
import { activeNarrative, activeRooms, type RoomRef } from "../themes/index.ts";

/** id de <section> a partir del id de sala: 'perfil' → 'room-perfil' */
export function sectionId(id: string): string {
  return `room-${id}`;
}

/**
 * Salas visibles (excluye hidden) de la NARRATIVA ACTIVA — las que se numeran y
 * navegan. `assembleHtml({ theme })` instala el tema; en el browser el default.
 */
export function visibleSalas(): readonly RoomRef[] {
  return activeRooms().filter((s) => !s.hidden);
}

/** Objetivos de navegación en orden: hero + salas visibles (ids de <section>). */
export function navTargets(): string[] {
  return [HERO_NAV.id, ...visibleSalas().map((s) => sectionId(s.id))];
}

/**
 * UNA UNIDAD DE NAVEGACIÓN (S9 · #135): una sala o un grupo de salas.
 *
 * Es el tipo que colapsa el contrato de grupos (`NarrativeManifest.groups`):
 * las salas agrupadas comparten número, entrada del HUD y celda del plano,
 * pero conservan su `<section>` en el DOM. `rooms` son las salas visibles que
 * la unidad presenta; `id` es la PRIMERA (destino de la entrada).
 */
export interface NavUnit {
  readonly id: string;
  readonly rooms: readonly string[];
  readonly num: string;
  readonly label: string;
  readonly labelEn: string;
  /** Rótulo de la unidad para el plano (ES, puede traer `<em>` si es un título). */
  readonly title: string;
  /** Rótulo EN del plano; sólo lo usa el diccionario i18n (`mapExtra`). */
  readonly titleEn: string;
}

/**
 * Unidades de navegación en orden de las salas VISIBLES: cada grupo se emite
 * una sola vez, en la posición de su primera sala; el resto de las salas es su
 * propia unidad. Un grupo con salas no contiguas NO se reordena acá (el gate
 * lo rechaza): la unidad se ubica donde aparece su primera sala.
 */
export function navUnits(): NavUnit[] {
  const visible = visibleSalas();
  const visibleIds = new Set(visible.map((s) => s.id));
  const groups = activeNarrative().groups ?? [];
  const groupOf = new Map<string, (typeof groups)[number]>();
  for (const group of groups) {
    for (const roomId of group.rooms) {
      if (visibleIds.has(roomId)) groupOf.set(roomId, group);
    }
  }
  const units: NavUnit[] = [];
  const emitted = new Set<string>();
  for (const room of visible) {
    const group = groupOf.get(room.id);
    const key = group ? `group:${group.id}` : `room:${room.id}`;
    if (emitted.has(key)) continue;
    emitted.add(key);
    const rooms = group
      ? visible.filter((s) => groupOf.get(s.id) === group).map((s) => s.id)
      : [room.id];
    units.push({
      id: room.id,
      rooms,
      num: String(units.length + 1).padStart(2, "0"),
      label: group ? group.label : room.navLabel,
      labelEn: group ? group.labelEn : room.navLabelEn,
      title: group ? group.label : room.titulo,
      titleEn: group ? group.labelEn : room.tituloEn
    });
  }
  return units;
}

/**
 * Una entrada del HUD: número + label siempre visibles (número decorativo).
 * `rooms` (ids de <section>) permite que el observer marque la unidad cuando
 * cualquiera de sus salas cruza la banda activa.
 */
function navLink(
  target: string,
  label: string,
  labelEn: string,
  num: string,
  rooms: readonly string[] = [target]
): string {
  // `data-rooms` SÓLO cuando la unidad presenta más de una sala: una entrada
  // de una sola sala ya se identifica por `data-target`, y emitir el atributo
  // siempre cambiaría el HTML del tema default (su golden es intocable).
  const group = rooms.length > 1 ? ` data-rooms="${rooms.join(" ")}"` : "";
  return (
    `<a class="nav-dot" href="#${target}" data-target="${target}"` +
    ` data-label="${label}" data-label-en="${labelEn}"${group}>` +
    `<span class="n" aria-hidden="true">${num}</span>` +
    `<span class="nav-label">${label}</span></a>`
  );
}

/** HTML del HUD (hero + unidades visibles), desde la narrativa activa. */
export function navDotsHtml(): string {
  const rows = [navLink(HERO_NAV.id, HERO_NAV.navLabel, HERO_NAV.navLabelEn, "00", [HERO_NAV.id])];
  for (const unit of navUnits()) {
    rows.push(
      navLink(
        sectionId(unit.id),
        unit.label,
        unit.labelEn,
        unit.num,
        unit.rooms.map(sectionId)
      )
    );
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
 * Número de la UNIDAD que presenta la sala (01..N) según el orden de las
 * unidades visibles. Las salas de un grupo COMPARTEN número (son un módulo);
 * `null` para salas ocultas o inexistentes (no se numeran).
 */
export function numFor(id: string): string | null {
  const unit = navUnits().find((candidate) => candidate.rooms.includes(id));
  return unit ? unit.num : null;
}

/**
 * ROOM_EN[] — traducciones EN de los títulos, en ORDEN DEL DOM (incluye salas
 * ocultas): el script i18n recorre `document.querySelectorAll('.room-title')`
 * posicionalmente, así que el índice debe casar con las salas en orden DOM.
 */
export function roomEnList(): string[] {
  return activeRooms().map((s) => s.tituloEn);
}

/**
 * MAP_EXTRA — claves de sala del diccionario i18n generadas desde las salas:
 * "SALA 01"→"ROOM 01" (visibles), subtitulo→subtituloEn y funcion→funcionEn
 * (todas), el título en mayúsculas (el plano lo rotula así) y "SALA"→"ROOM"
 * (etiqueta del plano). El script i18n las fusiona en el MAP en runtime
 * (idempotente).
 */
export function mapExtra(): Record<string, string> {
  const extra: Record<string, string> = {};
  for (const s of visibleSalas()) {
    const num = numFor(s.id);
    if (num) extra[`SALA ${num}`] = `ROOM ${num}`;
  }
  for (const s of activeRooms()) {
    extra[s.subtitulo] = s.subtituloEn;
    extra[s.funcion] = s.funcionEn;
  }
  // Sólo las UNIDADES VISIBLES: el plano es el único consumidor de la variante
  // en mayúsculas y no numera/rotula la galería oculta. Derivar la clave de una
  // sala oculta fabricaba un par que el walker nunca consulta (falso huérfano).
  // La unidad agrupada rotula con el rótulo del GRUPO, no con los títulos de sus
  // salas: ésos ya viajan por ROOM_EN (posicional sobre las `.room-title`).
  const plain = (html: string) => html.replace(/<[^>]*>/g, "").toUpperCase();
  for (const unit of navUnits()) {
    extra[plain(unit.title)] = plain(unit.titleEn);
  }
  extra["SALA"] = "ROOM";
  return extra;
}

/* ──────────────────────────────────────────────
   DOM (browser) — mountSalas()
────────────────────────────────────────────── */

function applyRoomMeta(room: HTMLElement, s: RoomRef): void {
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
  const funEl = room.querySelector<HTMLElement>(".room-content > .room-function");
  if (funEl && funEl.textContent !== s.funcion && funEl.textContent !== s.funcionEn) {
    funEl.textContent = s.funcion;
  }
}

function setNavActive(activeId: string): void {
  const links = Array.from(document.querySelectorAll<HTMLElement>(".nav-dot"));
  let active: HTMLElement | null = null;
  for (const link of links) {
    // Una unidad agrupada se activa cuando CUALQUIERA de sus salas cruza la
    // banda activa: el HUD muestra un módulo, no una sala suelta. Sin
    // `data-rooms` (unidad de una sala) manda `data-target`, como siempre.
    const unitRooms = link.dataset.rooms ? link.dataset.rooms.split(" ").filter(Boolean) : null;
    const on = unitRooms ? unitRooms.includes(activeId) : link.dataset.target === activeId;
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
  for (const s of activeRooms()) {
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
