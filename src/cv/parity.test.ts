import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SALAS } from "./salas";
import {
  mapExtra,
  navDotsHtml,
  navTargets,
  numFor,
  roomEnList
} from "./render";

/**
 * TEST DE PARIDAD (SPEC §4 Fase 1, tarea 3): el DOM generado desde SALAS debe ser
 * idéntico al HTML actual. Este test parsea index.html y compara cada dato
 * derivado (orden de salas, numeración, títulos, subtítulos, nav) contra SALAS.
 * Si difiere, es un bug del render o de salas.ts — no del contenido.
 */

const INDEX_HTML = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

/** Orden de los <section class="room" id="room-X"> en el HTML. */
function htmlRoomIds(): string[] {
  const re = /<section class="room" id="room-([a-z]+)"/g;
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(INDEX_HTML))) ids.push(m[1]);
  return ids;
}

/** Bloque HTML de un <section class="room" id="room-X"> (hasta su </section>). */
function htmlSectionBlock(id: string): string {
  const start = INDEX_HTML.indexOf(`<section class="room" id="room-${id}"`);
  expect(start).toBeGreaterThan(-1); // el <section> debe existir en el HTML
  const end = INDEX_HTML.indexOf("</section>", start);
  return INDEX_HTML.slice(start, end);
}

/** Primer .room-number de la sala (texto, p.ej. "SALA 04"). */
function htmlRoomNumber(id: string): string {
  const block = htmlSectionBlock(id);
  const m = /<div class="room-number"[^>]*>([^<]+)<\/div>/.exec(block);
  expect(m, `room-number de ${id}`).not.toBeNull();
  return m![1];
}

/** Primer .room-title de la sala (innerHTML, p.ej. "La <em>Biblioteca</em>"). */
function htmlRoomTitle(id: string): string {
  const block = htmlSectionBlock(id);
  const m = /<h2 class="room-title"[^>]*>([\s\S]*?)<\/h2>/.exec(block);
  expect(m, `room-title de ${id}`).not.toBeNull();
  return m![1];
}

/** Primer .room-subtitle directo de la sala (texto plano). */
function htmlRoomSubtitle(id: string): string {
  const block = htmlSectionBlock(id);
  const m = /<div class="room-subtitle"[^>]*>([^<]+)<\/div>/.exec(block);
  expect(m, `room-subtitle de ${id}`).not.toBeNull();
  return m![1];
}

/** Pares data-target/data-label del <nav id="nav"> en orden. */
function htmlNavDots(): { target: string; label: string }[] {
  const navStart = INDEX_HTML.indexOf('<nav id="nav">');
  const navEnd = INDEX_HTML.indexOf("</nav>", navStart);
  const navBlock = INDEX_HTML.slice(navStart, navEnd);
  const re = /data-target="([^"]+)"\s+data-label="([^"]+)"/g;
  const dots: { target: string; label: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(navBlock))) dots.push({ target: m[1], label: m[2] });
  return dots;
}

describe("paridad SALAS ↔ index.html", () => {
  it("orden de <section> == orden de SALAS (incl. galería oculta)", () => {
    expect(htmlRoomIds()).toEqual(SALAS.map((s) => s.id));
  });

  it("numeración visible == numFor (01..07); galería oculta con número stale intacto", () => {
    for (const s of SALAS) {
      if (s.hidden) continue;
      expect(htmlRoomNumber(s.id), `room-number de ${s.id}`).toBe(
        `SALA ${numFor(s.id)}`
      );
    }
  });

  it("títulos ES == SALAS.titulo (byte a byte)", () => {
    for (const s of SALAS) {
      expect(htmlRoomTitle(s.id), `room-title de ${s.id}`).toBe(s.titulo);
    }
  });

  it("subtítulos ES == SALAS.subtitulo (byte a byte) y cubren las claves del MAP", () => {
    const extra = mapExtra();
    for (const s of SALAS) {
      const htmlSub = htmlRoomSubtitle(s.id);
      expect(htmlSub, `room-subtitle de ${s.id}`).toBe(s.subtitulo);
      // La traducción EN debe existir en el MAP generado (o el i18n no traduce).
      expect(extra[s.subtitulo], `EN de ${s.subtitulo}`).toBeDefined();
    }
  });

  it("nav lateral == navTargets + navLabel", () => {
    const dots = htmlNavDots();
    const targets = navTargets();
    expect(dots.map((d) => d.target)).toEqual(targets);
    // hero + navLabels en orden
    const expectedLabels = [
      "Entrada",
      ...SALAS.filter((s) => !s.hidden).map((s) => s.navLabel)
    ];
    expect(dots.map((d) => d.label)).toEqual(expectedLabels);
  });

  it("ROOM_EN derivado == baseline histórico de 8 títulos EN", () => {
    expect(roomEnList()).toEqual([
      "The <em>Visitor</em>",
      "Active <em>Projects</em>",
      "The <em>Path</em>",
      "The <em>Evidence</em>",
      "The <em>Library</em>",
      "The <em>Toolbox</em>",
      "The <em>Constellation</em>",
      "<em>Connect</em>"
    ]);
  });

  it("la estructura de salas ya no vive hardcodeada en el i18n inline", () => {
    // El MAP del index.html no debe contener claves de sala (las genera SALAS)…
    expect(INDEX_HTML).not.toMatch(/"SALA 0\d": "ROOM 0\d"/);
    expect(INDEX_HTML).not.toMatch(/var ROOM_EN=/);
    // …pero el wiring de integración debe existir.
    expect(INDEX_HTML).toMatch(/cv:salas-ready/);
    expect(INDEX_HTML).toMatch(/__CV_I18N__/);
    // Y los dots del nav siguen generándose desde SALAS (render.ts).
    expect(navDotsHtml()).toContain('data-target="room-perfil"');
  });
});
