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
import { planoCellMeta } from "../templates/plano_html";

/**
 * TEST DE PARIDAD (SPEC §4 Fase 1/2): el DOM generado (index.html) debe ser
 * idéntico a lo que deriva SALAS. index.html es GENERADO por build.ts — si este
 * test falla, es un bug de render/salas/templates, no del contenido.
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
  expect(start).toBeGreaterThan(-1);
  const end = INDEX_HTML.indexOf("</section>", start);
  return INDEX_HTML.slice(start, end);
}

function htmlRoomNumber(id: string): string {
  const m = /<div class="room-number"[^>]*>([^<]+)<\/div>/.exec(htmlSectionBlock(id));
  expect(m, `room-number de ${id}`).not.toBeNull();
  return m![1];
}

function htmlRoomTitle(id: string): string {
  const m = /<h2 class="room-title"[^>]*>([\s\S]*?)<\/h2>/.exec(htmlSectionBlock(id));
  expect(m, `room-title de ${id}`).not.toBeNull();
  return m![1];
}

function htmlRoomSubtitle(id: string): string {
  const m = /<div class="room-subtitle"[^>]*>([^<]+)<\/div>/.exec(htmlSectionBlock(id));
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

/** Celdas .bp-room del plano SVG: href, num, label — en orden del documento. */
function htmlPlanoCells(): { href: string; num: string; label: string }[] {
  const start = INDEX_HTML.indexOf('<svg class="bp-svg"');
  const end = INDEX_HTML.indexOf("</svg>", start);
  const svg = INDEX_HTML.slice(start, end);
  const re =
    /<a href="([^"]+)" class="bp-room">\s*<rect[^>]*\/>\s*<text class="bp-num"\s+x="\d+" y="\d+">([^<]+)<\/text>\s*<text class="bp-name"\s+x="\d+" y="\d+">([^<]+)<\/text>\s*<\/a>/g;
  const cells: { href: string; num: string; label: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) cells.push({ href: m[1], num: m[2], label: m[3] });
  return cells;
}

describe("paridad SALAS ↔ index.html (generado)", () => {
  it("orden de <section> == orden de SALAS (incl. galería oculta)", () => {
    expect(htmlRoomIds()).toEqual(SALAS.map((s) => s.id));
  });

  it("numeración visible == numFor (01..07); galería oculta con número stale intacto", () => {
    for (const s of SALAS) {
      if (s.hidden) continue;
      expect(htmlRoomNumber(s.id), `room-number de ${s.id}`).toBe(`SALA ${numFor(s.id)}`);
    }
  });

  it("títulos ES == SALAS.titulo (byte a byte)", () => {
    for (const s of SALAS) {
      expect(htmlRoomTitle(s.id), `room-title de ${s.id}`).toBe(s.titulo);
    }
  });

  it("subtítulos ES == SALAS.subtitulo y cubren las claves del MAP", () => {
    const extra = mapExtra();
    for (const s of SALAS) {
      expect(htmlRoomSubtitle(s.id), `room-subtitle de ${s.id}`).toBe(s.subtitulo);
      expect(extra[s.subtitulo], `EN de ${s.subtitulo}`).toBeDefined();
    }
  });

  it("nav lateral == navTargets + navLabel", () => {
    const dots = htmlNavDots();
    expect(dots.map((d) => d.target)).toEqual(navTargets());
    expect(dots.map((d) => d.label)).toEqual([
      "Entrada",
      ...SALAS.filter((s) => !s.hidden).map((s) => s.navLabel)
    ]);
    expect(navDotsHtml()).toContain('data-target="room-perfil"');
  });

  it("plano SVG == celdas generadas desde SALAS (hero + salas visibles)", () => {
    const cells = htmlPlanoCells();
    const meta = planoCellMeta();
    expect(cells.map((c) => c.href)).toEqual(meta.map((m) => (m.id === "hero" ? "#hero" : `#room-${m.id}`)));
    expect(cells.map((c) => c.num)).toEqual(meta.map((m) => m.num));
    expect(cells.map((c) => c.label)).toEqual(meta.map((m) => m.label));
    // La galería (oculta) no está en el plano.
    expect(cells.some((c) => c.href.includes("galeria"))).toBe(false);
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

  it("el HTML generado no tiene estructura de salas hardcodeada ni scripts inline", () => {
    expect(INDEX_HTML).not.toMatch(/"SALA 0\d": "ROOM 0\d"/);
    expect(INDEX_HTML).not.toMatch(/var ROOM_EN=/);
    expect(INDEX_HTML).not.toMatch(/onclick="printCV\(\)"/);
    // Solo ld+json y el tag module de entrada.
    for (const s of INDEX_HTML.matchAll(/<script([^>]*)>/g)) {
      expect(
        s[1].includes("application/ld+json") || s[1].includes("module"),
        `script inesperado: ${s[0]}`
      ).toBe(true);
    }
    expect(Array.from(INDEX_HTML.matchAll(/<script([^>]*)>/g)).length).toBeGreaterThan(2); // 2 ld+json + module
  });
});
