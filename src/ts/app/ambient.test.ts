import { describe, expect, it } from "vitest";
import { fadeSteps } from "./ambient";

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
