import { afterEach, describe, expect, it } from "vitest";
import { CURATIONS, curationFor } from "../content/curation/index.ts";
import { assembleHtml } from "../templates/index.ts";
import { bootTheme } from "../ts/app/theme.ts";
import { AA_DEBT as VARIANT_DEBT, SKIN_CONTRAST_PAIRS as VARIANT_PAIRS } from "./ingenieria-nocturno/contrast.ts";
import { AA_DEBT as BASE_DEBT, SKIN_CONTRAST_PAIRS as BASE_PAIRS } from "./ingenieria/contrast.ts";
import { THEMES, activateTheme, activeRooms, buildThemes, resolveTheme, themeIds } from "./index.ts";
import { skinFor } from "./skin.ts";

afterEach(() => {
  activateTheme("museo");
});

/**
 * SEGUNDA PIEL SOBRE LA MISMA NARRATIVA (S10 · #136).
 *
 * La prueba de que piel y narrativa son ejes independientes no es "se ve
 * distinto": es que la variante no tenga NADA que mantener aparte del CSS. Por
 * eso los asserts son de IDENTIDAD (`toBe`), no de igualdad de valor: si el
 * copy, las salas, las ilusiones, la metadata o la curación fueran copias, este
 * test pasaría hoy y fallaría en silencio la primera vez que alguien edite el
 * tema base.
 */

const BASE = "ingenieria";
const VARIANT = "ingenieria-nocturno";

/** HTML sin el bloque de piel: dos temas que comparten narrativa sólo difieren ahí. */
function withoutSkin(html: string): string {
  return html.replace(/<style>([\s\S]*?)<\/style>/, (tag) => (/:root\s*\{/.test(tag) ? "<style></style>" : tag));
}

function skinOf(html: string): string | undefined {
  for (const match of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
    if (/:root\s*\{/.test(match[1])) return match[1];
  }
  return undefined;
}

describe("segunda piel — registro y linaje", () => {
  it("se registra como variante explícita de ingenieria", () => {
    const variant = THEMES[VARIANT];
    expect(variant.id).toBe(VARIANT);
    expect(variant.variantOf).toBe(BASE);
    // Publica en su propio subpath: es una página, no un modo de la misma.
    expect(variant.path).toBe("ingenieria-nocturno");
    expect(themeIds()).toEqual(["museo", "ingenieria", "ingenieria-nocturno"]);
  });

  it("reusa copy, salas, ilusiones, metadata y dirección POR REFERENCIA", () => {
    const variant = THEMES[VARIANT];
    const base = THEMES[BASE];
    expect(variant.copy).toBe(base.copy);
    expect(variant.rooms).toBe(base.rooms);
    expect(variant.illusions).toBe(base.illusions);
    expect(variant.meta).toBe(base.meta);
    expect(variant.site).toBe(base.site);
  });

  it("la curación es LA MISMA entrada del registro (no un clon de las decisiones)", () => {
    expect(CURATIONS[VARIANT]).toBe(CURATIONS[BASE]);
    expect(curationFor(VARIANT)).toBe(CURATIONS[BASE]);
  });

  it("el contrato de contraste reusa los pares: cambian los valores, no las combinaciones", () => {
    // La piel de la variante tiene las mismas reglas que la base: los pares
    // texto/fondo declarados son los mismos por referencia (una combinación
    // nueva en el CSS rompería `themes:check`).
    expect(VARIANT_PAIRS).toBe(BASE_PAIRS);
    expect(VARIANT_DEBT).toEqual([]);
    expect(BASE_DEBT).toEqual([]);
  });
});

describe("segunda piel — render y selector", () => {
  it("el render de la variante sólo cambia la piel respecto del base", () => {
    const baseHtml = assembleHtml({ theme: THEMES[BASE] });
    const variantHtml = assembleHtml({ theme: THEMES[VARIANT] });
    // Todo el documento (head, salas, print, copy) es el mismo: la narrativa se
    // reusó. Si alguien duplicara el copy y lo editara, este assert cae.
    expect(withoutSkin(variantHtml)).toBe(withoutSkin(baseHtml));
    expect(skinOf(variantHtml)).toBeDefined();
    expect(skinOf(variantHtml)).not.toBe(skinOf(baseHtml));
  });

  it("la piel de la variante es propia: no hereda la del default", () => {
    const skin = skinFor(VARIANT);
    expect(skin.inherited).toBe(false);
    expect(skin.id).toBe(VARIANT);
    expect(skin.source).not.toBe(skinFor(BASE).source);
  });

  it("SITE_THEME publica sólo la variante y resuelve su manifest", () => {
    expect(buildThemes({ SITE_THEME: VARIANT }).map((theme) => theme.id)).toEqual([VARIANT]);
    expect(resolveTheme(VARIANT)).toBe(THEMES[VARIANT]);
  });

  it("el runtime resuelve la variante y sirve las salas del tema base", () => {
    // La página publica `<html data-theme="ingenieria-nocturno">`: el bundle
    // activa SU manifest, cuyas salas son el mismo arreglo que las de ingenieria.
    const document = {
      documentElement: { dataset: { theme: VARIANT } }
    } as unknown as Document;
    expect(bootTheme(document).id).toBe(VARIANT);
    expect(activeRooms()).toBe(THEMES[BASE].rooms);
  });
});
