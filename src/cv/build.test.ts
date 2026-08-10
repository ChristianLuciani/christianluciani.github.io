import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assembleHtml } from "../templates/index";
import { SALAS } from "./salas";

/**
 * BUILD TEST (DoD Fase 2): el index.html commiteado DEBE ser el output exacto
 * de assembleHtml() (src/templates + SALAS). Si editas un template y no corrés
 * `node build.ts`, este test falla — es el contrato "editar = tocar src/".
 */

const COMMITTED = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

describe("build — assembleHtml() == index.html commiteado", () => {
  it("byte a byte (index.html es 100% generado)", () => {
    expect(assembleHtml()).toBe(COMMITTED);
  });

  it("contiene todas las salas de SALAS en orden", () => {
    const html = assembleHtml();
    let prev = -1;
    for (const s of SALAS) {
      const at = html.indexOf(`id="room-${s.id}"`);
      expect(at, `room-${s.id} presente`).toBeGreaterThan(-1);
      expect(at, `room-${s.id} en orden`).toBeGreaterThan(prev);
      prev = at;
    }
  });

  it("referencia el entry module (main.ts) para que Vite bundlee", () => {
    const html = assembleHtml();
    expect(html).toMatch(/<script type="module" crossorigin src="\/src\/main\.ts">/);
  });

  it("no contiene scripts inline ejecutables (DoD: todo viene de bundles)", () => {
    const html = assembleHtml();
    const re = /<script([^>]*)>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      expect(
        m[1].includes("application/ld+json") || m[1].includes("module"),
        `script inesperado: ${m[0]}`
      ).toBe(true);
    }
  });

  it("el nav y el plano se generan desde SALAS (no hay duplicación hardcodeada)", () => {
    const html = assembleHtml();
    // El nav del HTML generado coincide con los dots derivados (valores).
    expect(html).toContain('data-target="room-perfil"');
    expect(html).toContain('data-target="room-contacto"');
    // Números de sala presentes vía header generado.
    expect(html).toContain("SALA 01");
    expect(html).toContain("SALA 07");
  });
});
