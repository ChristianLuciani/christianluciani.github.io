import { afterEach, describe, expect, it } from "vitest";
import { factId } from "../content/curation/keys.ts";
import { INGENIERIA_CURATION } from "../content/curation/ingenieria.ts";
import { MUSEO_CURATION } from "../content/curation/museo.ts";
import type { Curation } from "../content/curation/types.ts";
import { SALAS } from "../cv/salas.ts";
import { factUniverse } from "../content/curation/facts.ts";
import { validateCuration } from "../content/curation/validate.ts";
import { navDotsHtml, navUnits, numFor, visibleSalas } from "../cv/render.ts";
import { planoCellMeta } from "../templates/plano_html.ts";
import { activateTheme } from "./index.ts";
import { roomsFromCuration, type RoomVoice } from "./rooms.ts";

/**
 * CONTROL TOTAL DEL LAYOUT (S9 · #135 · SPEC §5.4 · ADR-001 §Contratos).
 *
 * Dos derivaciones tienen que ser la ÚNICA fuente de «qué salas hay, en qué
 * orden, cuáles se ven y cuáles son UNA unidad de navegación»:
 *
 *   · `roomsFromCuration()` — visibilidad + orden + conteos + voz;
 *   · `navUnits()` — la unidad que consumen HUD, plano, numeración e i18n.
 *
 * Los tests fijan el contrato en los DOS temas que lo ejercen: `museo` (sin
 * grupos: nada cambia) e `ingenieria` (reordena, oculta y agrupa).
 */

afterEach(() => {
  activateTheme("museo");
});

/** Curación mínima: la galería oculta, sin orden ni contenido. */
const SIN_GALERIA: Curation = {
  include: [],
  exclude: [
    { id: factId("salas", "galeria"), reason: "prueba: la sala no tiene piezas curadas" }
  ]
};

describe("roomsFromCuration — visibilidad, orden, conteos y voz", () => {
  it("sin curación propia el resultado es SALAS con la galería oculta al final", () => {
    const rooms = roomsFromCuration(SIN_GALERIA);
    expect(rooms.map((room) => room.id)).toEqual([
      "proyectos",
      "bastidor",
      "competencias",
      "experiencia",
      "fisica",
      "grafo",
      "perfil",
      "contacto",
      "galeria"
    ]);
    expect(rooms.filter((room) => room.hidden).map((room) => room.id)).toEqual(["galeria"]);
  });

  it("order.salas manda el orden de las visibles; las ocultas van al final", () => {
    // `order.salas` es COMPLETO cuando se declara: `validateCuration` exige que
    // `order` cubra todo hecho incluido, así que un orden parcial no es una
    // curación válida (F2 del pase fresco de #165).
    const VISIBLES = SALAS.filter((sala) => sala.id !== "galeria").map((sala) => sala.id);
    const ORDEN = ["contacto", "perfil", ...VISIBLES.filter((id) => id !== "contacto" && id !== "perfil")];
    const curation: Curation = {
      include: [...VISIBLES.map((id) => factId("salas", id))],
      exclude: [
        { id: factId("salas", "galeria"), reason: "prueba: la sala no tiene piezas curadas" }
      ],
      order: { salas: ORDEN }
    };
    expect(validateCuration(curation, factUniverse()).errors).toEqual([]);
    const rooms = roomsFromCuration(curation);
    expect(rooms.map((room) => room.id)).toEqual([...ORDEN, "galeria"]);
    expect(rooms[rooms.length - 1]!.hidden).toBe(true);
  });

  it("el subtítulo que cuenta fichas se re-deriva de la curación RECIBIDA", () => {
    const proyectos = roomsFromCuration(SIN_GALERIA).find((room) => room.id === "proyectos")!;
    // Sin exclusiones, el número es el mismo que publica SALAS (plantilla única).
    expect(proyectos.subtitulo).toBe(SALAS.find((sala) => sala.id === "proyectos")!.subtitulo);
    // Excluir una ficha publicada cambia el número; el texto no se escribe a mano.
    const curados = roomsFromCuration(INGENIERIA_CURATION).find((room) => room.id === "proyectos")!;
    expect(curados.subtitulo).toBe("OBRA PUBLICADA · ARTEFACTO AUDITABLE · 2 PROYECTOS");
    expect(curados.subtituloEn).toBe("PUBLISHED WORK · AUDITABLE ARTIFACT · 2 PROJECTS");
  });

  it("una voz hostil en runtime no pisa estructura, conteo ni visibilidad", () => {
    // `RoomVoice` lo impide en compile time; esto lo sostiene si la voz llega
    // casteada o desde JSON. `titulo` SÍ es presentación y debe aplicarse.
    const hostil = {
      proyectos: { titulo: "X", subtitulo: "0 PROYECTOS", hidden: true },
      galeria: { hidden: false }
    } as unknown as RoomVoice;
    const rooms = roomsFromCuration(INGENIERIA_CURATION, hostil);
    const proyectos = rooms.find((room) => room.id === "proyectos")!;
    expect(proyectos.titulo).toBe("X");
    expect(proyectos.subtitulo).toBe("OBRA PUBLICADA · ARTEFACTO AUDITABLE · 2 PROYECTOS");
    expect(proyectos.hidden).toBeUndefined();
    const galeria = rooms.find((room) => room.id === "galeria")!;
    expect(galeria.hidden).toBe(true);
  });

  it("la voz del tema pisa los rótulos de presentación, nunca la estructura", () => {
    const [primera] = roomsFromCuration(SIN_GALERIA, {
      proyectos: { titulo: "Sistemas en <em>Producción</em>", navLabel: "Producción" }
    });
    expect(primera!.id).toBe("proyectos");
    expect(primera!.titulo).toBe("Sistemas en <em>Producción</em>");
    expect(primera!.navLabel).toBe("Producción");
    expect(primera!.funcion).toBe(SALAS[0]!.funcion);
  });
});

describe("navUnits — el tema default no declara grupos", () => {
  it("una unidad por sala visible, numeradas en orden y sin data-rooms", () => {
    const units = navUnits();
    expect(units.map((unit) => unit.rooms)).toEqual(visibleSalas().map((sala) => [sala.id]));
    expect(units.map((unit) => unit.num)).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08"
    ]);
    expect(navDotsHtml()).not.toContain("data-rooms");
    expect(numFor("perfil")).toBe("07");
  });

  it("el plano emite hero + una celda por sala visible", () => {
    const cells = planoCellMeta();
    expect(cells.map((cell) => cell.id)).toEqual(["hero", ...visibleSalas().map((s) => s.id)]);
    expect(cells.map((cell) => cell.num)).toEqual([
      "00",
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08"
    ]);
  });
});

describe("navUnits — ingenieria reordena, oculta y agrupa (S9 · #135)", () => {
  it("el orden, la sala oculta y las unidades salen de la curación y de groups", () => {
    activateTheme("ingenieria");
    expect(visibleSalas().map((sala) => sala.id)).toEqual([
      "proyectos",
      "experiencia",
      "bastidor",
      "fisica",
      "grafo",
      "perfil",
      "contacto"
    ]);
    const units = navUnits();
    expect(units.map((unit) => unit.label)).toEqual([
      "Producción",
      "Trayectoria",
      "Prototipos",
      "Ciencia",
      "Perfil",
      "Contacto"
    ]);
    const ciencia = units.find((unit) => unit.rooms.length > 1)!;
    expect(ciencia.rooms).toEqual(["fisica", "grafo"]);
    expect(ciencia.num).toBe("04");
    expect(ciencia.labelEn).toBe("Science");
    // Las dos salas del grupo COMPARTEN número: son un módulo, no dos destinos.
    expect(numFor("fisica")).toBe("04");
    expect(numFor("grafo")).toBe("04");
    // La sala oculta no se numera ni entra al HUD.
    expect(numFor("competencias")).toBeNull();
    expect(navDotsHtml()).not.toContain("room-competencias");
    expect(navDotsHtml()).toContain('data-target="room-fisica" data-label="Ciencia"');
    expect(navDotsHtml()).toContain('data-rooms="room-fisica room-grafo"');
  });

  it("el plano colapsa el grupo en UNA celda con el rótulo y el número de la unidad", () => {
    activateTheme("ingenieria");
    const cells = planoCellMeta();
    expect(cells.map((cell) => cell.id)).toEqual([
      "hero",
      "proyectos",
      "experiencia",
      "bastidor",
      "fisica",
      "perfil",
      "contacto"
    ]);
    expect(cells.find((cell) => cell.id === "fisica")).toMatchObject({
      num: "04",
      label: "CIENCIA"
    });
    expect(cells.some((cell) => cell.id === "grafo")).toBe(false);
  });

  it("la variante de piel hereda el layout por identidad, no lo copia", async () => {
    const { THEMES } = await import("./index.ts");
    const base = THEMES.ingenieria;
    const nocturno = THEMES["ingenieria-nocturno"];
    expect(nocturno.rooms).toBe(base.rooms);
    expect(nocturno.groups).toBe(base.groups);
  });
});

describe("museo no cambia con la curación por defecto", () => {
  it("el orden visible de museo es el de SALAS y la galería sigue fuera", () => {
    expect(visibleSalas().map((sala) => sala.id)).toEqual([
      "proyectos",
      "bastidor",
      "competencias",
      "experiencia",
      "fisica",
      "grafo",
      "perfil",
      "contacto"
    ]);
    expect(MUSEO_CURATION.order?.salas).toBeUndefined();
  });
});
