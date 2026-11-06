import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard de la clase que no debe volver: un listener global de click que llama
 * a `skipToPage`. Competía con los controles que viven SOBRE el loader
 * (`.skip-link`, nav) y les robaba el foco aun sin ser el target del usuario.
 * El skip es el botón, no "clic en cualquier lado".
 *
 * LÍMITE DECLARADO: la suite es node-only; no reemplaza la aserción de foco en
 * Chrome headless que cerraría la clase 1 completa. Este guard cubre la
 * regresión concreta (volver a capturar clicks de la página).
 */
const SOURCE = readFileSync(resolve(process.cwd(), "src/cv/intro.ts"), "utf8");

describe("intro — skip sin captura global de clicks", () => {
  it("no registra listeners de click sobre document/window", () => {
    expect(SOURCE).not.toMatch(
      /\b(?:document|window)\.addEventListener\(\s*["']click["']/
    );
  });
});
