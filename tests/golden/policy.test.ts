import { describe, expect, it } from "vitest";
import { decide } from "../../tools/golden/policy.ts";

/**
 * Evidencia de la guarda de CI: la rama de fallo y la de declaración se prueban
 * acá, no en un `run:` de YAML que nunca se ejecuta en el PR que la introduce.
 */
describe("golden — política de declaración", () => {
  const base = { baselineInBase: true, changed: true, body: "" };

  it("pasa sin declaración cuando el render no cambió", () => {
    expect(decide({ ...base, changed: false }).ok).toBe(true);
  });

  it("pasa sin declaración cuando el PR introduce el baseline", () => {
    const r = decide({ ...base, baselineInBase: false });
    expect(r.ok).toBe(true);
    expect(r.reason).toContain("baseline nuevo");
  });

  it("falla si el golden cambió y el body no declara nada", () => {
    const r = decide({ ...base, body: "## Qué\n\nUn refactor sin cambios de render.\n" });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("sin declarar");
  });

  it("pasa con la declaración exacta", () => {
    expect(decide({ ...base, body: "## Qué\n\nRender: cambia (rediseño)\n" }).ok).toBe(true);
  });

  it("acepta la declaración sin distinguir mayúsculas ni espacios", () => {
    expect(decide({ ...base, body: "render:   CAMBIA" }).ok).toBe(true);
  });

  it("no acepta 'Render: no cambia' como declaración", () => {
    expect(decide({ ...base, body: "Render: no cambia\n" }).ok).toBe(false);
  });

  it("no acepta la palabra suelta en medio de una frase", () => {
    expect(decide({ ...base, body: "esto cambia el render: cambia todo\n" }).ok).toBe(false);
  });
});
