import { describe, expect, it } from "vitest";
import { PRINT_RULE_COLOR } from "../templates/print-tokens.ts";
import { assembleHtml } from "../templates/index.ts";
import { skinCssIn } from "../../tools/themes/check.ts";
import { DEFAULT_THEME, THEMES, withNarrative } from "./index.ts";
import { emitSkin, skinFor } from "./skin.ts";
import { emitSkinCss } from "./museo/skin.ts";

/**
 * PIEL POR TEMA (S4 de ADR-001 §D11 · SPEC §5.6).
 *
 * Antes de S4 `emitSkin()` emitía SIEMPRE la piel de `museo`: un tema
 * no-default con `skin.css` propio declaraba una piel que nunca llegaba al
 * render (lo que F4 de #158 convertía en error, porque certificarla era un
 * falso verde). Este test fija la capacidad nueva en tres superficies:
 *
 *   · la resolución (`skinFor`) encuentra la piel del tema activo;
 *   · la emisión (`emitSkin`) es la de ESE tema, no la del default;
 *   · el documento (`assembleHtml`) publica esa piel en su `<style>`.
 *
 * La herencia (tema sin `skin.css`) sigue existiendo y se declara; no es este
 * el lugar para certificarla: lo hace `themes:check` con el CSS del render.
 */

const DEFAULT = skinFor(DEFAULT_THEME);
const INGENIERIA = skinFor("ingenieria");

describe("themes/skin — resolución por tema (S4)", () => {
  it("el tema default trae su propia piel", () => {
    expect(DEFAULT.id).toBe(DEFAULT_THEME);
    expect(DEFAULT.requested).toBe(DEFAULT_THEME);
    expect(DEFAULT.inherited).toBe(false);
    expect(DEFAULT.file).toBe(`src/themes/${DEFAULT_THEME}/skin.css`);
  });

  it("un tema no-default trae SU piel, no la del default", () => {
    expect(INGENIERIA.id).toBe("ingenieria");
    expect(INGENIERIA.inherited).toBe(false);
    expect(INGENIERIA.source).not.toBe(DEFAULT.source);
    // La paleta del default no es la de ingeniería: si el resolver devolviera
    // museo, este assert cae antes que cualquier comparación de bytes.
    expect(INGENIERIA.source).not.toContain("--bg-0: #050810;");
  });

  it("un tema sin skin.css propio hereda la piel del default (y lo declara)", () => {
    const heredada = skinFor("tema-sin-piel");
    expect(heredada.inherited).toBe(true);
    expect(heredada.id).toBe(DEFAULT_THEME);
    expect(heredada.requested).toBe("tema-sin-piel");
    expect(heredada.source).toBe(DEFAULT.source);
  });

  it("un id con separadores no escapa del directorio de pieles", () => {
    const escapes = [skinFor("../museo"), skinFor("museo/../museo"), skinFor("a/b")];
    for (const skin of escapes) {
      expect(skin.inherited, skin.requested).toBe(true);
      expect(skin.source, skin.requested).toBe(DEFAULT.source);
    }
  });
});

describe("themes/skin — emisión de la piel vigente", () => {
  it("emitSkin emite la piel del tema activo, no la del default", () => {
    const ingenieria = withNarrative(THEMES.ingenieria, () => emitSkin(PRINT_RULE_COLOR));
    const museo = withNarrative(THEMES[DEFAULT_THEME], () => emitSkin(PRINT_RULE_COLOR));
    expect(ingenieria).toBe(emitSkinCss(PRINT_RULE_COLOR, INGENIERIA.source));
    expect(ingenieria).not.toBe(museo);
  });

  it("el render de un tema publica SU piel en el <style> del documento", () => {
    const html = assembleHtml({ theme: THEMES.ingenieria });
    expect(skinCssIn(html)).toBe(emitSkinCss(PRINT_RULE_COLOR, INGENIERIA.source));
    // Y no la del default, que es exactamente el bug que S4 cierra.
    expect(skinCssIn(html)).not.toBe(emitSkinCss(PRINT_RULE_COLOR, DEFAULT.source));
  });

  it("el render del default conserva su piel byte a byte", () => {
    const html = assembleHtml({ theme: THEMES[DEFAULT_THEME] });
    expect(skinCssIn(html)).toBe(emitSkinCss(PRINT_RULE_COLOR, DEFAULT.source));
  });
});
