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
  "proyectos",
  "bastidor",
  "competencias",
  "experiencia",
  "fisica",
  "grafo",
  "perfil",
  "contacto",
  "galeria"
];

/** Baseline capturado del ROOM_EN[] (nuevo orden: proyectos primero). */
const ROOM_EN_BASELINE = [
  "The <em>Frame</em>",
  "The <em>Stretcher</em>",
  "The <em>Palette</em>",
  "The <em>Frieze</em>",
  "The <em>Library</em>",
  "The <em>Compass</em>",
  "The <em>Self-Portrait</em>",
  "The <em>Mailbox</em>",
  "The <em>Archive</em>"
];

describe("SALAS — integridad", () => {
  it("tiene las 9 salas en orden DOM (galería incluida, oculta)", () => {
    expect(SALAS.map((s) => s.id)).toEqual(IDS);
  });

  it("ids únicos", () => {
    expect(new Set(SALAS.map((s) => s.id)).size).toBe(SALAS.length);
  });

  it("solo la galería está oculta; el resto son las 8 salas visibles", () => {
    expect(SALAS.filter((s) => s.hidden).map((s) => s.id)).toEqual(["galeria"]);
    expect(visibleSalas().map((s) => s.id)).toEqual(
      IDS.filter((id) => id !== "galeria")
    );
  });

  it("navLabel/navLabelEn de cada sala alimentan el HUD (el plano deriva del título)", () => {
    for (const s of visibleSalas()) {
      expect(typeof s.navLabel).toBe("string");
      expect(s.navLabel.length).toBeGreaterThan(0);
      expect(typeof s.navLabelEn).toBe("string");
      expect(s.navLabelEn.length).toBeGreaterThan(0);
    }
    // La galería (oculta) no participa del plano.
    expect(SALAS.find((s) => s.id === "galeria")!.hidden).toBe(true);
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

  it("cada sala declara su función real, en ES y EN, sin espacios sueltos", () => {
    for (const s of SALAS) {
      expect(s.funcion.length, `funcion de ${s.id}`).toBeGreaterThan(0);
      expect(s.funcionEn.length, `funcionEn de ${s.id}`).toBeGreaterThan(0);
      expect(s.funcion).toBe(s.funcion.replace(/\s+/g, " ").trim());
      expect(s.funcionEn).toBe(s.funcionEn.replace(/\s+/g, " ").trim());
    }
    // La línea llana no repite la metadata en mayúsculas de la sala.
    for (const s of SALAS) expect(s.funcion).not.toBe(s.subtitulo);
  });
});

describe("render — derivados puros", () => {
  it("sectionId antepone el prefijo room-", () => {
    expect(sectionId("perfil")).toBe("room-perfil");
    expect(sectionId("fisica")).toBe("room-fisica");
  });

  it("navTargets = hero + salas visibles en orden (proyectos primero)", () => {
    expect(navTargets()).toEqual([
      "hero",
      "room-proyectos",
      "room-bastidor",
      "room-competencias",
      "room-experiencia",
      "room-fisica",
      "room-grafo",
      "room-perfil",
      "room-contacto"
    ]);
  });

  it("numFor: 01..07 en nuevo orden; null para ocultas", () => {
    expect(numFor("proyectos")).toBe("01");
    expect(numFor("bastidor")).toBe("02");
    expect(numFor("competencias")).toBe("03");
    expect(numFor("experiencia")).toBe("04");
    expect(numFor("fisica")).toBe("05");
    expect(numFor("grafo")).toBe("06");
    expect(numFor("perfil")).toBe("07");
    expect(numFor("contacto")).toBe("08");
    expect(numFor("galeria")).toBeNull();
    expect(numFor("inexistente")).toBeNull();
  });

  it("roomEnList: 9 títulos EN en orden DOM, igual al ROOM_EN histórico", () => {
    expect(roomEnList()).toEqual(ROOM_EN_BASELINE);
  });

  it("mapExtra: claves de sala del MAP generadas desde SALAS", () => {
    const extra = mapExtra();
    expect(extra["SALA 01"]).toBe("ROOM 01");
    expect(extra["SALA 04"]).toBe("ROOM 04");
    expect(extra["SALA 07"]).toBe("ROOM 07");
    expect(extra["SALA 05"]).toBe("ROOM 05"); // fisica en nuevo orden
    expect(extra).not.toHaveProperty("SALA 09"); // stale eliminado
    // Subtítulos (todas las salas, incl. oculta)
    expect(extra["PERFIL PROFESIONAL · CUENCA, ECUADOR"]).toBe(
      "PROFESSIONAL PROFILE · CUENCA, ECUADOR"
    );
    expect(extra["GALERÍA · FOTOGRAFÍAS · DOCUMENTOS · MOMENTOS"]).toBe(
      "GALLERY · PHOTOGRAPHS · DOCUMENTS · MOMENTS"
    );
    // Títulos en mayúsculas: el plano los rotula así y el EN no debe quedar hardcodeado.
    expect(extra["EL MARCO"]).toBe("THE FRAME");
    expect(extra["EL BASTIDOR"]).toBe("THE STRETCHER");
    expect(extra["LA PALETA"]).toBe("THE PALETTE");
    expect(extra["EL FRISO"]).toBe("THE FRIEZE");
    expect(extra["EL COMPÁS"]).toBe("THE COMPASS");
    expect(extra["EL AUTORRETRATO"]).toBe("THE SELF-PORTRAIT");
    // Función real de cada sala: entra al MAP para que EN no muestre ES.
    expect(extra["Mapa de relaciones entre áreas, proyectos y publicaciones."]).toBe(
      "Map of relationships between areas, projects and publications."
    );
    expect(extra["SALA"]).toBe("ROOM");
    // Números (8 visibles) + subtítulos (9, incl. oculta) + funciones (9) +
    // títulos en mayúsculas (8 visibles: sólo el plano los consume) + SALA.
    expect(extra).not.toHaveProperty("EL ARCHIVO"); // galería oculta: el plano no la rotula
    expect(Object.keys(extra).length).toBe(8 + 9 + 9 + 8 + 1);
  });

  it("navDotsHtml: hero + salas visibles con data-target/data-label en orden", () => {
    const html = navDotsHtml();
    expect(html).toContain(`data-target="${HERO_NAV.id}" data-label="${HERO_NAV.navLabel}"`);
    expect(html).toContain('data-target="room-perfil" data-label="Autorretrato" data-label-en="Self-Portrait"');
    expect(html).toContain('data-target="room-fisica" data-label="Biblioteca"');
    expect(html).toContain('data-target="room-grafo" data-label="Compás"');
    expect(html).not.toContain("room-galeria"); // oculta → fuera del nav
    // Orden: hero primero, contacto último
    const heroIdx = html.indexOf('data-target="hero"');
    const perfilIdx = html.indexOf('data-target="room-perfil"');
    const contactoIdx = html.indexOf('data-target="room-contacto"');
    expect(heroIdx).toBeLessThan(perfilIdx);
    expect(perfilIdx).toBeLessThan(contactoIdx);
  });
});
