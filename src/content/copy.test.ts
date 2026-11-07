import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, THEMES, withNarrative } from "../themes/index.ts";
import { activeCopy, copy, t } from "./copy.ts";

/**
 * PUNTO ÚNICO DE COPY (ADR-001 §2 · SPEC §5.4).
 *
 * Los templates no importan un pack: piden claves a este módulo, que resuelve
 * el pack de la NARRATIVA ACTIVA. Este test fija esa resolución y que una clave
 * inexistente sea un error de build (no un fallback silencioso).
 */

describe("content/copy — pack del tema vigente", () => {
  it("sin tema explícito el pack es el del tema default, sin copiarlo", () => {
    expect(activeCopy()).toBe(THEMES[DEFAULT_THEME].copy);
  });

  it("withNarrative cambia el pack vigente y lo restaura al salir", () => {
    const otro = { ...THEMES[DEFAULT_THEME], copy: { "hero.label": { es: "OTRO", en: "OTHER" } } };
    withNarrative(otro, () => {
      expect(t("hero.label")).toBe("OTRO");
    });
    expect(activeCopy()).toBe(THEMES[DEFAULT_THEME].copy);
    expect(t("hero.label")).toBe(THEMES[DEFAULT_THEME].copy["hero.label"]!.es);
  });

  it("una clave inexistente falla nombrando la clave", () => {
    expect(() => copy("no.existe")).toThrowError(/no\.existe/);
  });
});
