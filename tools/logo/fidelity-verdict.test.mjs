/**
 * fidelity-verdict.test.mjs — el contrato de salida del gate de fidelidad (#75).
 *
 * F6 del pase fresco: el 0/1/2 sólo se probaba e2e por CI (o a mano), así que
 * una regresión en la clasificación no la veía nadie. Acá se fija la política:
 * limpio ⇒ 0, drift medido ⇒ 1, nada medido ⇒ 2, y un estado MIXTO no puede
 * esconder que una versión ni se midió.
 */
import { describe, expect, it } from "vitest";
import { exitCodeFor, summaryFor } from "./fidelity-verdict.mjs";

const ok = (version) => ({ version, outcome: "ok" });
const drift = (version) => ({ version, outcome: "drift" });
const unmeasured = (version) => ({ version, outcome: "unmeasured" });

describe("fidelity-verdict — 0/1/2", () => {
  it("todo medido y coincidente ⇒ 0, sin ruido en el resumen", () => {
    expect(exitCodeFor([ok("aurea"), ok("base")])).toBe(0);
    expect(summaryFor([ok("aurea"), ok("base")]).line).toMatch(/🏆/);
  });

  it("un drift medido ⇒ 1 y el resumen nombra la versión", () => {
    expect(exitCodeFor([drift("aurea"), ok("base")])).toBe(1);
    const { line } = summaryFor([drift("aurea"), ok("base")]);
    expect(line).toMatch(/diverge/);
    expect(line).toMatch(/aurea: diverge/);
    expect(line).not.toMatch(/base/);
  });

  it("nada medido ⇒ 2 (no es drift) y lo dice", () => {
    expect(exitCodeFor([unmeasured("aurea"), unmeasured("base")])).toBe(2);
    expect(summaryFor([unmeasured("aurea")]).line).toMatch(/NO se pudo medir.*aurea: no se pudo medir/);
  });

  it("estado mixto: el drift gana el código, pero el resumen muestra las dos", () => {
    const results = [drift("aurea"), unmeasured("base")];
    expect(exitCodeFor(results)).toBe(1);
    const { line } = summaryFor(results);
    expect(line).toMatch(/aurea: diverge/);
    expect(line).toMatch(/base: no se pudo medir/);
  });

  it("sin resultados es 2, jamás un 0 por vacío", () => {
    expect(exitCodeFor([])).toBe(2);
    expect(summaryFor([]).code).toBe(2);
  });

  it("una versión sola sin medir no se confunde con éxito", () => {
    expect(exitCodeFor([unmeasured("aurea")])).toBe(2);
  });
});
