import { describe, expect, it } from "vitest";
import { assembleHtml } from "../templates/index";
import { COPY_ATTRS } from "../../tools/copy/lint";

/**
 * EL DICCIONARIO i18n: QUÉ CUBRE Y QUÉ NO (precisión de la definición, #127).
 *
 * El MAP se deriva de tres fuentes y el walker sólo consulta NODOS DE TEXTO.
 * Este test fija la definición honesta que el gate de templates NO mide:
 *
 *   - un par está "explicado" si aparece en el render (texto o atributo de copy);
 *   - o si es un par `runtime` (intro, canvas, estados) que el HTML inicial no
 *     garantiza;
 *   - o si es derivado del SSOT y la rama de datos de hoy no lo renderiza
 *     (p. ej. un statusLabel sin proyecto en ese estado). No es deuda: se deriva.
 *
 * Un par que no cae en ninguna categoría ES una clave muerta real: falla.
 * Los pares de SALAS no tienen rama condicional: si no aparecen, es bug.
 */

describe("copy — el diccionario derivado declara sus categorías", () => {
  /**
   * El MAP se deriva de tres fuentes y el walker sólo consulta nodos de texto.
   * Este test fija la definición honesta: un par del diccionario está
   * "explicado" si aparece en el render (texto o atributo de copy) o si es un
   * par `runtime`/derivado del SSOT que la rama de datos de hoy no renderiza.
   * Un par que no cae en ninguna categoría ES una clave muerta real: falla.
   */
  it("todo par está en el render o es runtime/derivado del SSOT", async () => {
    const { COPY, copyPairs } = await import("../content/copy.ts");
    const { mapExtra } = await import("../cv/render.ts");
    const { profileI18nPairs } = await import("../content/cv/i18n.ts");
    const { COPY_ATTRS } = await import("../../tools/copy/lint.ts");

    const norm = (s: string): string => s.replace(/\s+/g, " ").trim();
    const decode = (s: string): string =>
      s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
    const html = decode(assembleHtml());
    const text = norm(
      html
        .replace(/<script[\s\S]*?<\/script>/g, " ")
        .replace(/<style[\s\S]*?<\/style>/g, " ")
        .replace(/<[^>]*>/g, " ")
    );
    const attrValues: string[] = [];
    const tagRe = /<([a-zA-Z][\w-]*)([^>]*)>/g;
    let tag: RegExpExecArray | null;
    while ((tag = tagRe.exec(html))) {
      const tagName = tag[1].toLowerCase();
      const attrRe = /([\w:-]+)="([^"]*)"/g;
      let attr: RegExpExecArray | null;
      while ((attr = attrRe.exec(tag[2]))) {
        const name = attr[1].toLowerCase();
        if (COPY_ATTRS.has(name) || (name === "content" && tagName === "meta")) {
          attrValues.push(norm(attr[2]));
        }
      }
    }
    const rendered = (es: string): boolean => {
      const key = norm(es);
      return !!key && (text.includes(key) || attrValues.some((value) => value.includes(key)));
    };

    const pack = copyPairs();
    const extra = mapExtra();
    const profile = profileI18nPairs();
    const dict: Record<string, string> = { ...pack, ...extra, ...profile };
    const runtime = new Set(
      Object.values(COPY)
        .filter((entry) => entry.runtime)
        .map((entry) => norm(entry.es))
    );
    const profileKeys = new Set(Object.keys(profile));

    const unaccounted = Object.keys(dict).filter(
      (es) => !rendered(es) && !runtime.has(es) && !profileKeys.has(es)
    );
    expect(
      unaccounted,
      `pares sin superficie declarada (ni render, ni runtime, ni SSOT):\n${unaccounted.join("\n")}`
    ).toHaveLength(0);

    // Los pares de SALAS no tienen rama condicional: si no aparecen, es bug.
    const extraSinRender = Object.keys(extra).filter((es) => !rendered(es));
    expect(extraSinRender, `claves de SALAS sin render:\n${extraSinRender.join("\n")}`).toHaveLength(
      0
    );
  });
});
