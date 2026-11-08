import { describe, expect, it } from "vitest";
import { assembleHtml } from "./index.ts";
import { THEMES } from "../themes/index.ts";

/**
 * COPY POR TEMA EN EL RENDER (F2 del pase fresco de #159 · #134).
 *
 * `themes:check` no alcanza para detectar copy muerto cuando el string aparece
 * por otra clave (F2/F1 de #158). Estos asserts miran la SUPERFICIE exacta en la
 * que cada clave se publica: el plano y la cabecera del print-CV.
 *
 * Antes del fix, `plano.title.*` y `print.sections.experience` se capturaban en
 * constantes de módulo (evaluadas con museo activo): el pack de ingeniería
 * declaraba «Mapa del Sistema» / «Trayectoria técnica» y el render publicaba
 * «Plano del Museo» / «Trayectoria».
 */

const INGENIERIA = assembleHtml({ theme: THEMES.ingenieria });
const MUSEO = assembleHtml({ theme: THEMES.museo });

describe("render por tema — copy estructural", () => {
  it("el plano publica el título del pack del tema", () => {
    expect(INGENIERIA).toContain("<em>Mapa</em> del Sistema");
    expect(INGENIERIA).not.toContain("<em>Plano</em> del Museo");
    expect(MUSEO).toContain("<em>Plano</em> del Museo");
  });

  it("el hint y el aria del plano son los del tema", () => {
    expect(INGENIERIA).toContain("MAPA DEL SISTEMA · ÍNDICE");
    expect(INGENIERIA).toContain('aria-label="Mapa del sistema"');
    expect(MUSEO).toContain("PLANO DEL MUSEO · ÍNDICE");
  });

  it("la cabecera del print-CV publica la sección del pack del tema", () => {
    expect(INGENIERIA).toContain("<h2>Trayectoria técnica</h2>");
    expect(INGENIERIA).not.toContain("<h2>Trayectoria</h2>");
    expect(MUSEO).toContain("<h2>Trayectoria</h2>");
  });

  it("cover y salas también publican la voz del tema (no la del default)", () => {
    expect(INGENIERIA).toContain('aria-label="Salas del sistema"');
    expect(INGENIERIA).toContain("Diseño Sistemas Ontologías");
    expect(INGENIERIA).toContain("Dependencias, no sólo amplitud");
    expect(INGENIERIA).toContain("Sistemas cognitivos y su interacción");
    expect(MUSEO).toContain('aria-label="Salas del museo"');
  });

  it("el skip-link de body_open se resuelve con el pack del tema", () => {
    expect(INGENIERIA).toContain('class="skip-link">Ir al contenido</a>');
    expect(MUSEO).toContain('class="skip-link">Saltar al contenido</a>');
    expect(INGENIERIA).not.toContain('class="skip-link">Saltar al contenido</a>');
  });
});
