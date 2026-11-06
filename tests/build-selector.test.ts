import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * SELECTOR DE BUILD (SPEC §8 FASE 5.3 · ADR-001 §2).
 *
 * `build.ts` es la frontera donde `SITE_THEME` entra al build. Se prueba el
 * camino de ERROR por proceso real (`tsx build.ts`): el DoD exige que un id
 * desconocido falle listando los válidos EN VEZ de publicar el default. El
 * camino feliz no se corre acá porque escribiría `index.html` y debilitaría
 * `build.test.ts` (el gate de "el archivo commiteado es el output").
 */

const ROOT = process.cwd();
const TSX = resolve(ROOT, "node_modules/.bin/tsx");

interface Run {
  status: number;
  output: string;
}

function runBuild(siteTheme: string): Run {
  try {
    const stdout = execFileSync(TSX, ["build.ts"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, SITE_THEME: siteTheme }
    });
    return { status: 0, output: stdout };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

describe("build.ts — SITE_THEME", () => {
  it("un tema inexistente falla y lista los temas válidos", () => {
    const run = runBuild("noexiste");
    expect(run.status, "el build no puede salir 0 con un tema inválido").not.toBe(0);
    expect(run.output).toContain('SITE_THEME="noexiste"');
    expect(run.output).toContain("museo");
  });
});
