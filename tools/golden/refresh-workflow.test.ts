import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ROBOT DE DATOS ↔ GOLDEN POR TEMA (#133 · F6 del pase fresco de #158).
 *
 * `refresh-now.yml` regenera el golden y lo commitea con `Golden-Cambio: datos`.
 * Desde #133 `npm run golden:update` reescribe el baseline de CADA tema
 * registrado: si el robot sigue commiteando sólo `tests/golden/museo.html`, el
 * baseline de un tema no-default queda stale y `main` se pone rojo en el primer
 * refresh con más de un tema.
 *
 * El test lee el workflow (no lo ejecuta) y fija la propiedad que no puede
 * perderse: el diff y el `git add` cubren el DIRECTORIO de baselines.
 */
const WORKFLOW = readFileSync(
  resolve(process.cwd(), ".github/workflows/refresh-now.yml"),
  "utf8"
);

describe("refresh-now — commitea todos los baselines de tema", () => {
  it("el `git add` del robot no enumera baselines por archivo", () => {
    const add = WORKFLOW.split("\n").find((line) => line.trim().startsWith("git add "));
    expect(add, "el workflow no tiene un `git add` del commit del refresh").toBeDefined();
    expect(add).toMatch(/tests\/golden(\s|$)/);
    expect(add).not.toMatch(/tests\/golden\/[a-z0-9-]+\.html/);
  });

  it("la condición de cambio también mira el directorio completo", () => {
    const diff = WORKFLOW.split("\n").find((line) => line.includes("git diff --quiet"));
    expect(diff, "el workflow no declara la condición de cambio").toBeDefined();
    expect(diff).toMatch(/tests\/golden(\s|;)/);
    expect(diff).not.toMatch(/tests\/golden\/[a-z0-9-]+\.html/);
  });
});
