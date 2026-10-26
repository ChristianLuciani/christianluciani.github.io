/**
 * fidelity-verdict.test.mjs — el contrato de salida del gate de fidelidad (#75).
 *
 * F6 del pase fresco: el 0/1/2 sólo se probaba e2e por CI (o a mano), así que
 * una regresión en la clasificación no la veía nadie. Acá se fija la política:
 * limpio ⇒ 0, drift medido ⇒ 1, nada medido ⇒ 2, y un estado MIXTO no puede
 * esconder que una versión ni se midió.
 *
 * #79 agregó dos huecos al contrato: una corrida PARCIAL (menos versiones de las
 * esperadas) daba 0, y un error INTERNO del gate se reportaba con el consejo de
 * entorno («revisá Chrome»), mandando a depurar el lugar equivocado.
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

describe("fidelity-verdict — corrida parcial (#79)", () => {
  const EXPECTED = ["aurea", "base"];

  it("una versión medida de dos esperadas ⇒ 2, jamás un 0 por incompleta", () => {
    expect(exitCodeFor([ok("aurea")], EXPECTED)).toBe(2);
  });

  it("el resumen declara la corrida parcial y nombra la versión faltante", () => {
    const { line } = summaryFor([ok("aurea")], EXPECTED);
    expect(line).toMatch(/parcial/);
    expect(line).toMatch(/base/);
    expect(line).not.toMatch(/diverge/);
  });

  it("una versión duplicada no tapa a la faltante", () => {
    expect(exitCodeFor([ok("aurea"), ok("aurea")], EXPECTED)).toBe(2);
  });

  it("con `expected` numérico se cuentan identidades, no filas (F1 del pase fresco)", () => {
    expect(exitCodeFor([ok("aurea"), ok("aurea")], 2)).toBe(2);
    expect(exitCodeFor([ok("aurea")], 2)).toBe(2);
  });

  it("con `expected` numérico, dos identidades distintas y ninguna extra ⇒ 0", () => {
    expect(exitCodeFor([ok("aurea"), ok("base")], 2)).toBe(0);
    expect(exitCodeFor([ok("aurea"), ok("base"), ok("extra")], 2)).toBe(0);
  });

  it("sin `expected` el contrato previo no cambia (compatibilidad)", () => {
    expect(exitCodeFor([ok("aurea")])).toBe(0);
  });
});

describe("fidelity-verdict — error interno ≠ entorno (#79)", () => {
  it("un outcome `error` es 2 (no se midió), nunca 1 (drift)", () => {
    expect(exitCodeFor([{ version: "aurea", outcome: "error" }])).toBe(2);
  });

  it("el resumen dice «error interno» y no manda a revisar Chrome", () => {
    const { line } = summaryFor([{ version: "aurea", outcome: "error" }]);
    expect(line).toMatch(/error interno/);
    expect(line).toMatch(/bug del gate/);
    expect(line).not.toMatch(/revisá Chrome/);
    expect(line).not.toMatch(/CHROME_PATH/);
  });

  it("un drift medido sigue ganando sobre un error interno", () => {
    expect(exitCodeFor([drift("aurea"), { version: "base", outcome: "error" }])).toBe(1);
  });
});

describe("fidelity-verdict — mixtos del pase fresco de #82", () => {
  const EXPECTED = ["aurea", "base"];

  it("parcial + drift: el código es 1 y el resumen nombra la versión sin medir (F4)", () => {
    const results = [drift("aurea")];
    expect(exitCodeFor(results, EXPECTED)).toBe(1);
    const { line } = summaryFor(results, EXPECTED);
    expect(line).toMatch(/diverge/);
    expect(line).toMatch(/base: sin medir/);
    expect(line).toMatch(/parcial/);
  });

  it("mixto unmeasured + error nombra las DOS causas y no manda sólo a Chrome (F3)", () => {
    const results = [unmeasured("aurea"), { version: "base", outcome: "error" }];
    const { code, line } = summaryFor(results);
    expect(code).toBe(2);
    expect(line).toMatch(/causas mixtas/);
    expect(line).toMatch(/base: error interno del gate/);
    expect(line).toMatch(/aurea: no se pudo medir/);
  });
});
