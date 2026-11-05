import { describe, expect, it } from "vitest";
import { coverHtml } from "./cover_html.ts";

/**
 * Contrato del skip de la intro: la animación es opcional, así que el control
 * tiene que existir, ser un botón real (teclado) y vivir DENTRO del loader para
 * desaparecer con él. El clic en cualquier lado sigue siendo un atajo, pero no
 * reemplaza a un control visible y etiquetado.
 */
const HTML = coverHtml();

describe("cover — skip de la intro", () => {
  const loaderStart = HTML.indexOf('<div id="loader">');
  const skipAt = HTML.indexOf('id="btn-skip-intro"');

  it("el botón vive dentro del loader (no queda huérfano al ocultarse)", () => {
    expect(loaderStart).toBeGreaterThan(-1);
    expect(skipAt).toBeGreaterThan(loaderStart);
    // El loader es el último bloque del cover: nada después del botón salvo sus
    // propios tags de cierre.
    expect(HTML.slice(skipAt)).not.toContain("<section");
  });

  it("es un botón accesible y bilingüe", () => {
    const block = HTML.slice(skipAt - 200, HTML.indexOf("</button>", skipAt) + 9);
    expect(block).toContain('type="button"');
    expect(block).toContain('data-aria-es="Saltar la animación inicial');
    expect(block).toContain('data-aria-en="Skip the opening animation');
    expect(block).toMatch(/aria-label="Saltar la animación inicial/);
    expect(block).toContain("Saltar intro");
  });
});
