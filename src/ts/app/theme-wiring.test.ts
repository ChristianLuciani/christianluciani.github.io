import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { activateTheme, activeNarrative } from "../../themes/index.ts";

/**
 * CABLEADO DE F1 (F1 residual del segundo pase del PR #159).
 *
 * `runtime.test.ts` prueba que `activateTheme()` funciona, pero no que el bundle
 * la ejecute ANTES de i18n/intro/render. Este test apunta al wiring real:
 *
 *   1. `src/ts/app/theme.ts` es el PRIMER import de `src/main.ts` (si se borra o
 *      se mueve, i18n/intro/render se evalúan con la narrativa default);
 *   2. `theme.ts` ejecuta `bootTheme()` al importarse (no sólo exporta la función);
 *   3. el efecto existe: importar el módulo con una página `data-theme` activa
 *      deja la narrativa instalada.
 *
 * Un test que sólo importa `runtime.test.ts` pasa si se comenta el import del
 * bundle; éste no.
 */

const ROOT = process.cwd();
const MAIN = readFileSync(resolve(ROOT, "src/main.ts"), "utf8");
const THEME = readFileSync(resolve(ROOT, "src/ts/app/theme.ts"), "utf8");

/** Specifiers de los imports estáticos, en el orden de evaluación de ESM. */
function importSpecifiers(source: string): string[] {
  return [
    ...source.matchAll(/^\s*import\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["'];?/gm)
  ].map((match) => match[1]);
}

describe("wiring F1 — el bundle arranca por la identidad del tema", () => {
  afterEach(() => {
    activateTheme("museo");
    delete (globalThis as { document?: unknown }).document;
  });

  it("`src/ts/app/theme.ts` es el PRIMER import de `main.ts`", () => {
    const imports = importSpecifiers(MAIN);
    expect(imports[0]).toBe("./ts/app/theme.ts");
    // El boot tiene que preceder a los módulos que leen copy/salas al importar.
    for (const consumer of ["./cv/i18n", "./cv/intro", "./cv/render"]) {
      expect(imports.indexOf(consumer), `${consumer} debe importarse después`).toBeGreaterThan(0);
      expect(imports.indexOf(consumer)).toBeGreaterThan(imports.indexOf("./ts/app/theme.ts"));
    }
  });

  it("`theme.ts` ejecuta `bootTheme()` al importarse (no alcanza con exportarla)", () => {
    expect(THEME).toMatch(/^bootTheme\(\);\s*$/m);
    // Y lo hace a nivel de módulo, no dentro de una función que nunca se llama.
    const atModuleScope = THEME.split("\n").findIndex((line) => /^bootTheme\(\);$/.test(line));
    expect(atModuleScope).toBeGreaterThan(-1);
  });

  it("el efecto corre: importar el módulo con una página activa instala su tema", async () => {
    (globalThis as { document?: unknown }).document = {
      documentElement: { dataset: { theme: "ingenieria" } }
    };
    await import("./theme.ts");
    expect(activeNarrative().id).toBe("ingenieria");
  });
});
