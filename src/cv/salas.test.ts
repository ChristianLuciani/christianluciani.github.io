import { describe, expect, it } from "vitest";
import { HERO_NAV, SALAS } from "./salas";
import {
  mapExtra,
  navDotsHtml,
  navTargets,
  numFor,
  roomEnList,
  sectionId,
  visibleSalas
} from "./render";

const IDS = [
  "perfil",
  "proyectos",
  "experiencia",
  "galeria",
  "fisica",
  "competencias",
  "grafo",
  "contacto"
];

/** Baseline capturado del ROOM_EN[] que vivía hardcodeado en index.html (Fase 1 lo centraliza). */
const ROOM_EN_BASELINE = [
  "The <em>Visitor</em>",
  "Active <em>Projects</em>",
  "The <em>Path</em>",
  "The <em>Evidence</em>",
  "The <em>Library</em>",
  "The <em>Toolbox</em>",
  "The <em>Constellation</em>",
  "<em>Connect</em>"
];

describe("SALAS — integridad", () => {
  it("tiene las 8 salas en orden DOM (galería incluida, oculta)", () => {
    expect(SALAS.map((s) => s.id)).toEqual(IDS);
  });

  it("ids únicos", () => {
    expect(new Set(SALAS.map((s) => s.id)).size).toBe(SALAS.length);
  });

  it("solo la galería está oculta; el resto son las 7 salas visibles", () => {
    expect(SALAS.filter((s) => s.hidden).map((s) => s.id)).toEqual(["galeria"]);
    expect(visibleSalas().map((s) => s.id)).toEqual(
      IDS.filter((id) => id !== "galeria")
    );
  });

  it("planoLabel: todas las visibles tienen etiqueta uppercase para el plano", () => {
    for (const s of visibleSalas()) {
      expect(s.planoLabel, `planoLabel de ${s.id}`).toBe(s.planoLabel?.toUpperCase());
    }
    // Experiencia usa TRAYECTORIA en el plano (≠ navLabel).
    const exp = SALAS.find((s) => s.id === "experiencia")!;
    expect(exp.planoLabel).toBe("TRAYECTORIA");
    expect(exp.planoLabel).not.toBe(exp.navLabel.toUpperCase());
    // La galería (oculta) no participa del plano.
    expect(SALAS.find((s) => s.id === "galeria")!.planoLabel).toBeUndefined();
  });

  it("todo título y traducción llevan <em> (estilo museístico)", () => {
    for (const s of SALAS) {
      expect(s.titulo).toMatch(/<em>/);
      expect(s.tituloEn).toMatch(/<em>/);
    }
  });

  it("subtítulos byte-exactos (claves del MAP: el i18n usa norm() sobre el DOM)", () => {
    const subs = SALAS.map((s) => s.subtitulo);
    expect(new Set(subs).size).toBe(subs.length);
    // Sin espacios colgantes ni dobles: `norm()` colapsa espacios, así que un
    // subtítulo con doble espacio nunca matchearía su clave generada.
    for (const sub of subs) {
      expect(sub).toBe(sub.replace(/\s+/g, " ").trim());
    }
  });
});

describe("render — derivados puros", () => {
  it("sectionId antepone el prefijo room-", () => {
    expect(sectionId("perfil")).toBe("room-perfil");
    expect(sectionId("fisica")).toBe("room-fisica");
  });

  it("navTargets = hero + salas visibles en orden", () => {
    expect(navTargets()).toEqual([
      "hero",
      "room-perfil",
      "room-proyectos",
      "room-experiencia",
      "room-fisica",
      "room-competencias",
      "room-grafo",
      "room-contacto"
    ]);
  });

  it("numFor: 01..07 secuencial en orden visible; null para ocultas", () => {
    expect(numFor("perfil")).toBe("01");
    expect(numFor("proyectos")).toBe("02");
    expect(numFor("experiencia")).toBe("03");
    expect(numFor("fisica")).toBe("04");
    expect(numFor("competencias")).toBe("05");
    expect(numFor("grafo")).toBe("06");
    expect(numFor("contacto")).toBe("07");
    expect(numFor("galeria")).toBeNull();
    expect(numFor("inexistente")).toBeNull();
  });

  it("roomEnList: 8 títulos EN en orden DOM, igual al ROOM_EN histórico", () => {
    expect(roomEnList()).toEqual(ROOM_EN_BASELINE);
  });

  it("mapExtra: claves de sala del MAP generadas desde SALAS", () => {
    const extra = mapExtra();
    expect(extra["SALA 01"]).toBe("ROOM 01");
    expect(extra["SALA 04"]).toBe("ROOM 04");
    expect(extra["SALA 07"]).toBe("ROOM 07");
    expect(extra["SALA 05"]).toBe("ROOM 05"); // competencias
    expect(extra).not.toHaveProperty("SALA 08"); // stale eliminado
    // Subtítulos (todas las salas, incl. oculta)
    expect(extra["PERFIL PROFESIONAL · CUENCA, ECUADOR"]).toBe(
      "PROFESSIONAL PROFILE · CUENCA, ECUADOR"
    );
    expect(extra["GALERÍA · FOTOGRAFÍAS · DOCUMENTOS · MOMENTOS"]).toBe(
      "GALLERY · PHOTOGRAPHS · DOCUMENTS · MOMENTS"
    );
    expect(Object.keys(extra).length).toBe(7 + 8); // 7 números + 8 subtítulos
  });

  it("navDotsHtml: hero + salas visibles con data-target/data-label en orden", () => {
    const html = navDotsHtml();
    expect(html).toContain(`data-target="${HERO_NAV.id}" data-label="${HERO_NAV.navLabel}"`);
    expect(html).toContain('data-target="room-perfil" data-label="Perfil"');
    expect(html).toContain('data-target="room-fisica" data-label="Biblioteca"');
    expect(html).toContain('data-target="room-grafo" data-label="Constelación"');
    expect(html).not.toContain("room-galeria"); // oculta → fuera del nav
    // Orden: hero primero, contacto último
    const heroIdx = html.indexOf('data-target="hero"');
    const perfilIdx = html.indexOf('data-target="room-perfil"');
    const contactoIdx = html.indexOf('data-target="room-contacto"');
    expect(heroIdx).toBeLessThan(perfilIdx);
    expect(perfilIdx).toBeLessThan(contactoIdx);
  });
});
