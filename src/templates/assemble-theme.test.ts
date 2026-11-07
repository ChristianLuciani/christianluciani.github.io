import { describe, expect, it } from "vitest";
import { THEMES, activeNarrative } from "../themes/index.ts";
import type { NarrativeManifest } from "../themes/types.ts";
import { museo } from "../themes/museo/narrative.ts";
import { assembleHtml } from "./index.ts";

/**
 * `assembleHtml({ theme })` — EL TEMA ES UN PARÁMETRO (SPEC §5.4 · ADR-001 §2).
 *
 * Dos cosas distintas se prueban acá:
 *   1. I1: el tema default produce los mismos bytes con y sin selector.
 *   2. El contrato: el render consume la narrativa que recibe (copy y salas),
 *      y falla ruidoso con un id desconocido en vez de caer al default.
 *
 * La variante del test es un manifest construido en memoria, NO un tema
 * registrado: el registro tiene una sola entrada (`museo`) hasta S8.
 */

/** Variante mínima: otra voz (copy) y las salas en otro orden. */
function variant(): NarrativeManifest {
  return {
    ...museo,
    id: "variante",
    copy: {
      ...museo.copy,
      "hero.label": { es: "Museo Alterno de Prueba", en: "Alternate Test Museum" }
    },
    rooms: [...museo.rooms].reverse()
  };
}

describe("assembleHtml — selector de tema", () => {
  it("sin opciones renderiza el tema default (I1)", () => {
    expect(assembleHtml()).toBe(assembleHtml({ theme: "museo" }));
  });

  it("un tema desconocido falla listando los válidos, no cae al default", () => {
    expect(() => assembleHtml({ theme: "noexiste" })).toThrowError(/SITE_THEME="noexiste"/);
    expect(() => assembleHtml({ theme: "noexiste" })).toThrowError(/museo/);
  });

  it("el render consume el copy del tema recibido", () => {
    expect(assembleHtml({ theme: variant() })).toContain("Museo Alterno de Prueba");
  });

  it("el render consume las salas del tema recibido (orden y numeración)", () => {
    const html = assembleHtml({ theme: variant() });
    const reversed = [...museo.rooms].reverse().map((r) => r.id);
    let prev = -1;
    for (const id of reversed) {
      const at = html.indexOf(`id="room-${id}"`);
      expect(at, `room-${id} presente`).toBeGreaterThan(-1);
      expect(at, `room-${id} sigue el orden de la narrativa`).toBeGreaterThan(prev);
      prev = at;
    }
    // HUD y plano derivan de la MISMA narrativa: si sólo cambiara el orden del
    // DOM, el nav seguiría apuntando al orden viejo y el documento sería incoherente.
    expect(html.indexOf('data-target="room-contacto"')).toBeLessThan(
      html.indexOf('data-target="room-proyectos"')
    );
    // Numeración derivada del orden narrativo: la primera visible pasa a ser 01.
    const contacto = html.indexOf('id="room-contacto"');
    const contactoBlock = html.slice(contacto, html.indexOf("</section>", contacto));
    expect(contactoBlock).toContain("SALA 01");
  });

  /**
   * RESTAURACIÓN ANTE UN THROW DENTRO DEL RENDER.
   *
   * Un id inválido lanza en `resolveTheme` ANTES de instalar la narrativa y no
   * ejercita el `finally` de `withNarrative`. Acá el manifest ES VÁLIDO (las
   * salas se resuelven) y el throw ocurre al pedir copy: `headHtml()` hace
   * `t("meta.title")` dentro del ensamblado. Sin el `finally`, el proceso queda
   * con la narrativa rota instalada y el render siguiente falla o publica el
   * tema equivocado.
   */
  it("restaura la narrativa activa cuando el render lanza adentro", () => {
    const baseline = assembleHtml();
    const sinCopy: NarrativeManifest = { ...museo, id: "sin-copy", copy: {} };

    expect(() => assembleHtml({ theme: sinCopy }), "el render debe lanzar dentro").toThrowError(
      /copy: no existe la clave/
    );
    expect(activeNarrative()).toBe(THEMES.museo);
    expect(assembleHtml()).toBe(baseline);

    expect(() => assembleHtml({ theme: variant() })).not.toThrow();
    expect(activeNarrative()).toBe(THEMES.museo);
    expect(assembleHtml()).toBe(baseline);
  });
});
