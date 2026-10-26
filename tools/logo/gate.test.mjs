/**
 * gate.test.mjs — el cableado del gate de fidelidad (#79).
 *
 * El contrato 0/1/2 ya se probaba como política (`fidelity-verdict.test.mjs`),
 * pero NO el cableado: qué acumula `fail()`/`canNotMeasure()`, qué pasa con un
 * artefacto que Chrome no puede renderizar (vacío, ilegible, un directorio) y
 * qué distingue un fallo de ENTORNO de un bug del gate. CI sólo corría el camino
 * limpio, así que una regresión en estas ramas no la veía nadie.
 */
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { artifactProblem, runGate, Unmeasurable } from "./gate.mjs";

const withDir = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), "gate-artifact-"));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const quiet = () => {};
const VERSIONS = ["aurea", "base"];
const run = (verify) => runGate({ versions: VERSIONS, verify, error: quiet });

describe("artifactProblem — preflight del artefacto (#79)", () => {
  it("un HTML legible y no vacío no tiene problema", () => withDir((dir) => {
    const file = join(dir, "aurea.html");
    writeFileSync(file, "<html><body></body></html>");
    expect(artifactProblem(file)).toBeNull();
  }));

  it("inexistente ⇒ «no existe» (el caso que ya cubría existsSync)", () => withDir((dir) => {
    expect(artifactProblem(join(dir, "no-existe.html"))).toMatch(/no existe/);
  }));

  it("vacío (0 bytes) ⇒ «está vacío»: renderizarlo daría un drift falso", () => withDir((dir) => {
    const file = join(dir, "aurea.html");
    writeFileSync(file, "");
    expect(artifactProblem(file)).toMatch(/está vacío \(0 bytes\)/);
  }));

  it("un DIRECTORIO con el nombre del HTML ⇒ «no es un archivo»", () => withDir((dir) => {
    const file = join(dir, "index.html");
    mkdirSync(file);
    expect(artifactProblem(file)).toMatch(/no es un archivo/);
  }));

  it.skipIf(process.getuid?.() === 0)("sin permiso de lectura ⇒ «sin permiso de lectura», no drift", () => withDir((dir) => {
    const file = join(dir, "aurea.html");
    writeFileSync(file, "<html></html>");
    chmodSync(file, 0o000);
    expect(artifactProblem(file)).toMatch(/sin permiso de lectura/);
  }));
});

describe("Unmeasurable", () => {
  it("es un Error: el catch lo distingue de un bug con instanceof", () => {
    const err = new Unmeasurable("Chrome no encontrado");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("Unmeasurable");
  });
});

describe("runGate — fail()/canNotMeasure() → results (#79)", () => {
  it("todo medido y limpio ⇒ 0, y cada versión deja su resultado", () => {
    const { results, verdict } = run(() => {});
    expect(results).toEqual([
      { version: "aurea", outcome: "ok" },
      { version: "base", outcome: "ok" },
    ]);
    expect(verdict.code).toBe(0);
  });

  it("fail() marca drift SÓLO en su versión y el código es 1", () => {
    const { results, verdict } = run((version, { fail }) => {
      if (version === "aurea") fail("línea de más");
    });
    expect(results).toEqual([
      { version: "aurea", outcome: "drift" },
      { version: "base", outcome: "ok" },
    ]);
    expect(verdict.code).toBe(1);
  });

  it("canNotMeasure() marca no-medido y el código es 2", () => {
    const { results, verdict } = run((_, { canNotMeasure }) => canNotMeasure("sin Chrome"));
    expect(results.every((r) => r.outcome === "unmeasured")).toBe(true);
    expect(verdict.code).toBe(2);
  });

  it("un drift medido GANA aunque la otra versión no se pueda medir", () => {
    const { results, verdict } = run((version, report) => {
      if (version === "aurea") report.fail("difiere");
      else report.canNotMeasure("sin Chrome");
    });
    expect(results.map((r) => r.outcome)).toEqual(["drift", "unmeasured"]);
    expect(verdict.code).toBe(1);
    const line = verdict.line;
    expect(line).toMatch(/aurea: diverge/);
    expect(line).toMatch(/base: no se pudo medir/);
  });

  it("un Unmeasurable del entorno ⇒ no-medido, con el consejo de entorno", () => {
    const { verdict } = run(() => { throw new Unmeasurable("Chrome no encontrado"); });
    expect(verdict.code).toBe(2);
    expect(verdict.line).toMatch(/NO se pudo medir/);
    expect(verdict.line).toMatch(/CHROME_PATH/);
  });

  it("un TypeError (bug del gate) NO se disfraza de problema de entorno", () => {
    const { verdict } = run(() => { throw new TypeError("cannot read properties of undefined"); });
    expect(verdict.code).toBe(2);
    expect(verdict.line).toMatch(/error interno/);
    expect(verdict.line).not.toMatch(/CHROME_PATH/);
  });

  it("una versión que explota igual deja su resultado: nunca una corrida parcial", () => {
    const { results } = run(() => { throw new TypeError("boom"); });
    expect(results).toHaveLength(VERSIONS.length);
    expect(results.map((r) => r.version)).toEqual(VERSIONS);
  });
});
