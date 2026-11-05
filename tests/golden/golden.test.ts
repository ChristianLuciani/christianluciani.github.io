import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assembleHtml } from "../../src/templates/index.ts";
import { SALAS } from "../../src/cv/salas.ts";
import { describeDrift, firstDiff, sectionDrifts, sectionsOf } from "../../tools/golden/sections.ts";
import { baselineFile } from "../../tools/golden/paths.ts";

/**
 * GOLDEN DEL RENDER (SPEC §8 FASE 5, D9).
 *
 * `index.html` es generado y `build.test.ts` lo compara con `assembleHtml()`:
 * ese test protege "el archivo commiteado es el output", NO detecta que un
 * refactor cambió el render (ambos lados cambian juntos). Este golden es la
 * copia congelada contra la que se mide el invariante I1: el tema default
 * publica byte a byte lo mismo en cada PR de la fase.
 *
 * Regenerar SÓLO en un PR que cambia el render a propósito: `npm run golden:update`.
 */

const GOLDEN_PATH = baselineFile(process.cwd());
const GOLDEN = existsSync(GOLDEN_PATH) ? readFileSync(GOLDEN_PATH, "utf8") : null;
const LIVE = assembleHtml();

/** Bases de CDN: definidas ⇒ el render de este proceso no es el de Pages. */
const CDN_BASES = ["VITE_ASSET_BASE_URL", "VITE_BRAND_KIT_BASE_URL"].map((name) =>
  (process.env[name] ?? "").trim()
);
const ENV_READY = CDN_BASES.every((value) => value === "");

/**
 * Baseline como `string` o error con la instrucción. Evita el `as string` que
 * apagaba `strictNullChecks`: sin baseline, el test falla diciendo qué correr en
 * vez de reventar con `TypeError: Cannot read properties of null`.
 */
function requireGolden(): string {
  if (GOLDEN === null) {
    throw new Error(`falta ${GOLDEN_PATH}; generá el baseline con \`npm run golden:update\` y commitealo`);
  }
  return GOLDEN;
}

describe("golden — el render del tema default no cambia", () => {
  it("corre sin base de CDN (el golden se congela con Pages como origen)", () => {
    // Las rutas de assets se resuelven al importar los templates: un entorno con
    // CDN produce otro HTML y haría fallar el golden por configuración, no por
    // render. `""` y ausente son el mismo caso para el repo (vacía = Pages).
    expect(
      CDN_BASES,
      "definí VITE_ASSET_BASE_URL y VITE_BRAND_KIT_BASE_URL vacías (o sin definir) para correr el golden"
    ).toEqual(["", ""]);
  });

  it("existe el golden congelado", () => {
    expect(
      GOLDEN,
      `falta ${GOLDEN_PATH}; generá el baseline con \`npm run golden:update\` y commitealo`
    ).not.toBeNull();
  });

  // Con CDN definida el render no es comparable: se saltan en vez de mostrar un
  // diff críptico. El test de arriba ya falla con la instrucción exacta.
  describe.skipIf(!ENV_READY)("comparaciones", () => {
    it("el documento completo es byte a byte el del baseline", () => {
      const drift = firstDiff(requireGolden(), LIVE, "documento");
      expect(drift, drift ? describeDrift(drift) : "").toBeNull();
    });

    it("ninguna sección cambió (el fallo nombra la sala)", () => {
      const drifts = sectionDrifts(requireGolden(), LIVE);
      expect(drifts.map(describeDrift)).toEqual([]);
    });

    it("el golden cubre head, print, cover, hero, plano, 9 salas y footer", () => {
      const names = sectionsOf(requireGolden()).map((s) => s.name);
      for (const required of ["head", "print-cv", "cover", "hero", "plano", "footer"]) {
        expect(names, `sección ${required}`).toContain(required);
      }
      expect(names.filter((n) => n.startsWith("sala-"))).toHaveLength(SALAS.length);
      // El CSS global vive en head: si se extrae a un archivo (FASE 5), el golden
      // sigue cubriéndolo porque el <style> emitido no puede cambiar.
      expect(sectionsOf(requireGolden())[0].html).toContain("<style>");
    });

    it("muerde un espacio de diferencia", () => {
      const mutated = LIVE.replace("</body>", "</body> ");
      const drifts = sectionDrifts(requireGolden(), mutated);
      expect(drifts).toHaveLength(1);
      expect(drifts[0].section).toBe("footer");
    });

    it("muerde una sección que desaparece (cambio estructural)", () => {
      const mutated = LIVE.replace('<section id="room-plano">', "<section>");
      const drifts = sectionDrifts(requireGolden(), mutated);
      expect(drifts.map((d) => d.section)).toContain("estructura");
      expect(drifts[0].actual).toContain("plano");
    });
  });
});
