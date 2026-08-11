import { describe, expect, it } from "vitest";
import { fadeSteps, pickActive, type RoomRect } from "./ambient";

/** Helper: construye rects desde fracciones del viewport. */
function rectsFrom(...parts: [string, number, number][]): RoomRect[] {
  return parts.map(([id, top, bottom]) => ({ id, top, bottom }));
}

describe("ambient — pickActive (sala que ocupa ≥50% del viewport)", () => {
  const vh = 1000;

  it("elige la sala que cubre ≥50% del viewport", () => {
    // perfil cubre 700px del viewport (≥50%), hero solo 300px arriba
    const r = rectsFrom(
      ["hero", -700, 300],
      ["perfil", 300, 1000]
    );
    expect(pickActive(r, vh)).toBe("perfil");
  });

  it("devuelve hero cuando es la entrada completa", () => {
    const r = rectsFrom(["hero", 0, 1000]);
    expect(pickActive(r, vh)).toBe("hero");
  });

  it("con dos salas que pasan el 50%, elige la de mayor área visible", () => {
    const r = rectsFrom(
      ["perfil", -100, 600], // 600px visibles
      ["proyectos", 500, 1000] // 500px visibles
    );
    expect(pickActive(r, vh)).toBe("perfil");
  });

  it("ninguna llega al 50% → fallback a la de mayor área visible", () => {
    const r = rectsFrom(
      ["perfil", -800, 100], // 100px visibles
      ["proyectos", 200, 600], // 400px visibles
      ["experiencia", 600, 1000] // 400px visibles
    );
    expect(pickActive(r, vh)).toBe("proyectos");
  });

  it("sin secciones → null", () => {
    expect(pickActive([], vh)).toBeNull();
  });

  it("una sala exactamente al 50% cuenta como activa", () => {
    const r = rectsFrom(["perfil", 0, 500]);
    expect(pickActive(r, vh)).toBe("perfil");
  });

  it("empate a 50% entre dos salas → gana la primera (orden DOM)", () => {
    const r = rectsFrom(["hero", 0, 500], ["perfil", 500, 1000]);
    expect(pickActive(r, vh)).toBe("hero");
  });
});

describe("ambient — fadeSteps (fade in/out del sonido)", () => {
  it("fade in: arranca en silencio y sube linealmente hasta el volumen base", () => {
    const steps = fadeSteps(0, 0.04, 2500, 500);
    expect(steps.length).toBe(5);
    expect(steps[0]).toBeGreaterThan(0);
    expect(steps[0]).toBeLessThan(0.04);
    expect(steps[steps.length - 1]).toBe(0.04);
    // monótona creciente
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThan(steps[i - 1]);
  });

  it("fade out: baja hasta 0 (mute)", () => {
    const steps = fadeSteps(0.04, 0, 450, 150);
    expect(steps.length).toBe(3);
    expect(steps[0]).toBeGreaterThan(0);
    expect(steps[steps.length - 1]).toBe(0);
  });

  it("misma from/to → un solo paso al valor (no-op)", () => {
    expect(fadeSteps(0.04, 0.04, 2500, 60)).toEqual([0.04]);
  });

  it("volumen nunca supera el objetivo ni es negativo", () => {
    const up = fadeSteps(0, 0.04, 2500, 60);
    for (const v of up) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0.04);
    }
  });
});
