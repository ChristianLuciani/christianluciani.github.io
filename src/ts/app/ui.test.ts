import { afterEach, describe, expect, it, vi } from "vitest";
import { printCV } from "./ui.ts";

/**
 * Regresión del CV desplegado en la parte superior de la página: `printCV()`
 * sólo abre el diálogo de impresión. La visibilidad de los dos bloques del print
 * (`#print-cv` ES y `#print-cv-en` EN) la decide `@media print` en el CSS de la
 * piel; si alguien reintroduce un toggle de `display` desde JS, este test lo
 * delata porque el stub de `window` no tiene `document`.
 */
describe("printCV", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sólo abre el diálogo nativo, sin tocar el DOM", () => {
    const print = vi.fn();
    vi.stubGlobal("window", { print });

    expect(() => printCV()).not.toThrow();
    expect(print).toHaveBeenCalledTimes(1);
  });
});
