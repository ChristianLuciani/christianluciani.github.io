import { describe, expect, it } from "vitest";
import { coverHtml } from "./cover_html.ts";

/**
 * Contrato del skip de la intro: la animación es opcional, así que el control
 * tiene que existir, ser un botón real (teclado) y vivir DENTRO del loader para
 * desaparecer con él. El clic en cualquier lado sigue siendo un atajo, pero no
 * reemplaza a un control visible y etiquetado.
 */
const HTML = coverHtml();

/** Bloque completo del `<div>` que abre en `start`, contando anidados. */
function balancedDiv(html: string, start: number): string {
  const tag = /<div\b[^>]*>|<\/div>/g;
  tag.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tag.exec(html))) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, tag.lastIndex);
  }
  throw new Error("div sin cerrar");
}

describe("cover — skip de la intro", () => {
  const loaderStart = HTML.indexOf('<div id="loader">');
  const skipAt = HTML.indexOf('id="btn-skip-intro"');

  it("el botón vive dentro del loader (no queda huérfano al ocultarse)", () => {
    expect(loaderStart).toBeGreaterThan(-1);
    expect(skipAt).toBeGreaterThan(loaderStart);
    // Debe estar DENTRO del div balanceado del loader, no sólo después de su
    // apertura: un botón movido al cover seguiría pasando el chequeo débil.
    const loader = balancedDiv(HTML, loaderStart);
    expect(loader).toContain('id="btn-skip-intro"');
  });

  it("es un botón accesible y bilingüe", () => {
    const block = HTML.slice(skipAt - 200, HTML.indexOf("</button>", skipAt) + 9);
    expect(block).toContain('type="button"');
    expect(block).toContain('data-aria-es="Saltar intro');
    expect(block).toContain('data-aria-en="Skip intro');
    expect(block).toMatch(/aria-label="Saltar intro/);
    // WCAG 2.5.3: el texto visible debe estar contenido en el nombre accesible.
    expect(block).toContain("Saltar intro");
  });
});
