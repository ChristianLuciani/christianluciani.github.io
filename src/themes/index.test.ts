import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, THEMES, resolveTheme, themeIds } from "./index.ts";

/**
 * REGISTRO DE NARRATIVAS (SPEC §5.4/§8 FASE 5.3 · ADR-001).
 *
 * El registro es la ÚNICA fuente de ids de tema y el único lugar donde se
 * resuelve `SITE_THEME`: ningún template conoce el id. Este test fija el
 * contrato del selector sin depender del render (eso lo cubre el golden).
 */

describe("themes — registro", () => {
  it("el tema default existe y es la raíz del sitio", () => {
    expect(DEFAULT_THEME).toBe("museo");
    expect(Object.keys(THEMES)).toContain(DEFAULT_THEME);
  });

  it("themeIds() lista exactamente las claves del registro", () => {
    expect([...themeIds()].sort()).toEqual(Object.keys(THEMES).sort());
    expect(themeIds()).toContain("museo");
  });

  it("cada narrativa es coherente con su entrada: id = clave, slug válido, path sin barras", () => {
    for (const [key, narrative] of Object.entries(THEMES)) {
      expect(narrative.id, `id de ${key}`).toBe(key);
      expect(narrative.id).toMatch(/^[a-z0-9-]+$/);
      // "" = raíz; un subpath publicado no lleva "/" en los extremos.
      expect(narrative.path, `path de ${key}`).not.toMatch(/^\/|\/$/);
      expect(narrative.meta.title.trim(), `meta.title de ${key}`).not.toBe("");
      expect(narrative.meta.description.trim(), `meta.description de ${key}`).not.toBe("");
      expect(narrative.meta.ogImage.trim(), `meta.ogImage de ${key}`).not.toBe("");
    }
  });

  it("el tema default publica en la raíz", () => {
    expect(THEMES[DEFAULT_THEME].path).toBe("");
  });
});

describe("themes — resolución de SITE_THEME", () => {
  it("sin selector (undefined, null, vacío o espacios) resuelve el default", () => {
    for (const raw of [undefined, null, "", "  "]) {
      expect(resolveTheme(raw as string | undefined).id).toBe(DEFAULT_THEME);
    }
  });

  it("un id registrado resuelve su narrativa", () => {
    expect(resolveTheme("museo")).toBe(THEMES.museo);
    // no muta el argumento ni normaliza el id a minúsculas
    expect(resolveTheme(" museo ")).toBe(THEMES.museo);
  });

  it("un id desconocido falla listando los temas válidos", () => {
    expect(() => resolveTheme("noexiste")).toThrowError(/SITE_THEME="noexiste"/);
    let message = "";
    try {
      resolveTheme("noexiste");
    } catch (error) {
      message = (error as Error).message;
    }
    for (const id of themeIds()) expect(message).toContain(id);
    expect(message).toContain(DEFAULT_THEME);
  });

  it("no acepta propiedades heredadas del prototipo como tema", () => {
    for (const raw of ["toString", "constructor", "__proto__", "hasOwnProperty"]) {
      expect(() => resolveTheme(raw), raw).toThrowError(/SITE_THEME/);
    }
  });
});
