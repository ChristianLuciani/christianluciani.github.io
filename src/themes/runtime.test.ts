import { afterEach, describe, expect, it } from "vitest";
import { activeNarrative, activeRooms, activateTheme } from "./index.ts";
import { copyPairs, t } from "../content/copy.ts";
import { mapExtra, navDotsHtml, roomEnList } from "../cv/render.ts";
import { introPhrases } from "../cv/intro.ts";
import { i18nDictionary } from "../cv/i18n.ts";
import { bootTheme, documentThemeId } from "../ts/app/theme.ts";

/**
 * IDENTIDAD DEL TEMA EN EL RUNTIME (F1 del pase fresco de #159 · #134).
 *
 * El bundle es compartido y `activeNarrative()` arranca en el default: sin una
 * identidad publicada por la página, `/ingenieria/` montaba el HTML estático de
 * ingeniería y el JS lo pisaba con la narrativa de museo (HUD, títulos y
 * funciones de las 8 salas), el intro y el diccionario EN.
 *
 * Este test fija la resolución por tema en el proceso (que es lo que hace el
 * bundle al arrancar): `bootTheme()` lee `<html data-theme>` y activa esa
 * narrativa ANTES de que i18n/intro/render consulten copy y salas.
 */

afterEach(() => {
  activateTheme("museo");
});

function fakeDocument(theme?: string): Document {
  return {
    documentElement: { dataset: theme === undefined ? {} : { theme } }
  } as unknown as Document;
}

describe("runtime — identidad del tema", () => {
  it("lee el tema de <html data-theme> y lo instala como narrativa activa", () => {
    expect(documentThemeId(fakeDocument("ingenieria"))).toBe("ingenieria");
    expect(bootTheme(fakeDocument("ingenieria")).id).toBe("ingenieria");
    expect(activeNarrative().id).toBe("ingenieria");
  });

  it("sin data-theme resuelve el tema default", () => {
    expect(documentThemeId(fakeDocument())).toBeUndefined();
    expect(bootTheme(fakeDocument()).id).toBe("museo");
    expect(activeNarrative().id).toBe("museo");
  });

  it("un id desconocido falla en vez de publicar el default en silencio", () => {
    expect(() => bootTheme(fakeDocument("noexiste"))).toThrow(/SITE_THEME/);
  });
});

describe("runtime — salas, HUD, i18n e intro por tema", () => {
  it("las salas activas son las del tema (no las de museo)", () => {
    activateTheme("ingenieria");
    const proyectos = activeRooms().find((room) => room.id === "proyectos")!;
    expect(proyectos.titulo).toContain("Sistemas en <em>Producción</em>");
    expect(proyectos.navLabel).toBe("Producción");
    expect(navDotsHtml()).toContain("Producción");
    expect(navDotsHtml()).not.toContain("El Marco");
  });

  it("el diccionario i18n traduce el copy del tema activo", () => {
    activateTheme("ingenieria");
    const map = i18nDictionary();
    expect(map["Arquitecturas · Agentes · Ontologías"]).toBe(
      "Architectures · Agents · Ontologies"
    );
    expect(map["SISTEMAS EN PRODUCCIÓN"]).toBe("SYSTEMS IN PRODUCTION");
    expect(roomEnList()).toContain("Systems in <em>Production</em>");
    // El mismo mapa con museo traduce el copy del default.
    activateTheme("museo");
    expect(i18nDictionary()["Museo de una Trayectoria · 2026"]).toBe(
      "Museum of a Trajectory · 2026"
    );
  });

  it("la intro usa las frases del pack del tema activo", () => {
    activateTheme("ingenieria");
    expect(introPhrases()).toEqual([
      "Diseño de Sistemas",
      "Ingeniería del Conocimiento",
      "Una Instancia Humana"
    ]);
    activateTheme("museo");
    expect(introPhrases()[0]).toBe("Arte Ciencias Filosofía");
  });

  it("el copy servido por t() es el del tema activo", () => {
    activateTheme("ingenieria");
    expect(t("plano.title.word")).toBe("Mapa");
    expect(copyPairs()["Mapa"]).toBe("System");
  });
});
