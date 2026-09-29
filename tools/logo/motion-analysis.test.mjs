/**
 * motion-analysis.test.mjs — política del gate de movimiento (issue #55).
 *
 * Estos tests son la razón de existir de `motion-analysis.mjs`: la adquisición
 * (Chrome, fotogramas) no corre en CI, pero el VEREDICTO sí tiene que estar
 * cubierto siempre. Cada caso que el gate tiene que atrapar se prueba acá con
 * series sintéticas — si la política se afloja sin querer, esto se pone rojo
 * mucho antes que el gate (que necesita Chrome y un artefacto).
 */
import { describe, it, expect } from "vitest";
import {
  THRESHOLDS, analyze, bezierY, bloomOver, breatheFrames, checkStructure,
  maxRise, scaleOf, settleStep, sustainedRise,
} from "./motion-analysis.mjs";

/** filas sintéticas: {T, light, halo, tipRedMax, tipMax, body} */
const rows = (spec) => spec.map(([T, light, halo, body, tipRedMax = 0.3, tipMax = 0.66]) =>
  ({ T, light, halo, body, tipRedMax, tipMax }));

/* ── sonda mínima: la punta y la respiración, como las lee el gate ───────── */
const probe = ({ scales = [1, 1], easing = "cubic-bezier(0.33, 0.6, 0.4, 1)", keys = [["0%, 100%", "0.5"], ["50%", "0.78"]], rest = "0.5", targets = [".settle-on .c-glow path"] } = {}) => ({
  breathe: { frames: keys.map(([key, opacity]) => ({ key, opacity })), rest, targets },
  anims: [],
});
const landmark = ({ easing = "cubic-bezier(0.33, 0.6, 0.4, 1)", scales = [1, 1] } = {}) => ({
  punta: { delay: 1000, duration: 680, easing, kf: scales.map((s, i) => ({ offset: i, opacity: i === 0 ? "0.85" : "0", transform: `scale(${s})` })) },
  settle: 1600, drawEnd: 1500, C: {}, r: 26, rHalo: 70,
});

describe("motion-analysis — primitivas", () => {
  it("maxRise encuentra la suba dentro de la ventana y no mira fuera", () => {
    const r = rows([[0, 10], [10, 12], [20, 11], [30, 13], [40, 3]]);
    expect(maxRise(r, "light", 0, 35).delta).toBeCloseTo(2, 6);   // 10→12 y 11→13
    expect(maxRise(r, "light", 25, 40).delta).toBeCloseTo(2, 6);   // 20→30 entra por su extremo
    expect(maxRise(r, "light", 35, 40).delta).toBeCloseTo(-10, 6); // sólo 30→40
    expect(maxRise(r, "light", 0, 5).delta).toBe(-Infinity);       // ventana sin pares
  });

  it("maxRise no compara a través del salto entre ventanas del plan", () => {
    /* el plan salta de la disolución al settle: ese salto no es una suba del efecto */
    const r = rows([[0, 10], [100, 1], [1000, 9]]);
    expect(maxRise(r, "light", 0, 1000, { stepMs: 100 }).delta).toBeCloseTo(-9, 6);
    expect(maxRise(r, "light", 0, 1000).delta).toBeCloseTo(8, 6);   // sin filtro, sí
  });

  it("bloomOver mide la suba sobre el mínimo previo (una luz que se apaga no sube)", () => {
    expect(bloomOver(rows([[0, 10], [10, 8], [20, 5]]), "light", 0, 20).delta).toBeCloseTo(0, 6);
    /* sin fotogramas previos a la ventana el mínimo arranca adentro: nunca -Infinity */
    expect(bloomOver(rows([[5, 10], [10, 8], [20, 5]]), "light", 5, 20).delta).toBeCloseTo(0, 6);
    const bump = bloomOver(rows([[0, 10], [10, 4], [20, 7]]), "light", 0, 20);
    expect(bump.delta).toBeCloseTo(3, 6);
    expect(bump.t).toBe(20);
  });

  it("sustainedRise compara tercios: apagado → negativo, encendido → positivo", () => {
    expect(sustainedRise(rows([[0, 10], [10, 8], [20, 6], [30, 4], [40, 2], [50, 1]]), "light", 0, 50).delta).toBeLessThan(0);
    expect(sustainedRise(rows([[0, 1], [10, 2], [20, 3], [30, 4], [40, 5], [50, 6]]), "light", 0, 50).delta).toBeGreaterThan(0);
  });

  it("settleStep toma el fotograma inmediatamente anterior y posterior al settle", () => {
    const s = settleStep(rows([[1500, 0, 0, 0.2], [1590, 0, 0, 0.2], [1610, 0, 0, 0.1]]), 1600);
    expect(s.before.T).toBe(1590);
    expect(s.after.T).toBe(1610);
    expect(s.delta).toBeCloseTo(-0.1, 6);
  });

  it("breatheFrames avisa si el plan no tiene fotogramas cerca del settle", () => {
    const r = rows([[1000, 0, 0, 0.2], [5000, 0, 0, 0.3]]);
    expect(breatheFrames(r, 1600, { stepMs: 100 }).ok).toBe(false);
    const conFotos = rows([[1640, 0, 0, 0.2], [2500, 0, 0, 0.21]]);
    const b = breatheFrames(conFotos, 1600, { stepMs: 100 });
    expect(b.ok).toBe(true);
    expect(b.delta).toBeCloseTo(0.01, 6);
  });

  it("scaleOf lee escalas serializadas y bezierY las curvas (con y sin overshoot)", () => {
    expect(scaleOf("scale(1.3)")).toBeCloseTo(1.3, 6);
    expect(scaleOf("scale(1.2, 0.9)")).toBeCloseTo(1.2, 6);
    expect(scaleOf("none")).toBe(1);
    expect(scaleOf(undefined)).toBe(1);
    expect(bezierY("cubic-bezier(0.3, 1.4, 0.5, 1)")).toEqual([1.4, 1]);
    expect(bezierY("cubic-bezier(0.33, 0.6, 0.4, 1)")).toEqual([0.6, 1]);
    expect(bezierY("ease-out")).toBeNull();
  });
});

describe("motion-analysis — invariantes del cronograma (v16 vs fix)", () => {
  it("la v16 falla: escala que crece, curva con overshoot y respiración en el grupo", () => {
    const fails = checkStructure(
      probe({ targets: [".settle-on .c-glow"] }),
      landmark({ scales: [1, 1.3], easing: "cubic-bezier(0.3, 1.4, 0.5, 1)" }),
    );
    expect(fails.join("\n")).toMatch(/se agranda al apagarse/);
    expect(fails.join("\n")).toMatch(/tiene overshoot/);
    expect(fails.join("\n")).toMatch(/y no al TRAZO/);
    expect(fails).toHaveLength(3);
  });

  it("el fix pasa: fade puro, curva sin overshoot y respiración en el trazo", () => {
    expect(checkStructure(probe(), landmark({ scales: [1, 1] }))).toEqual([]);
  });

  it("atrapa la opacidad que se re-enciende y la respiración que arranca corrida", () => {
    const L = landmark();
    L.punta.kf = [{ offset: 0, opacity: "0.85", transform: "scale(1)" }, { offset: 0.5, opacity: "0.9", transform: "scale(1)" }, { offset: 1, opacity: "0", transform: "scale(1)" }];
    expect(checkStructure(probe(), L).join("\n")).toMatch(/se re-enciende/);
    const shifted = checkStructure(probe({ keys: [["0%, 100%", "0.35"], ["50%", "0.78"]] }), landmark());
    expect(shifted.join("\n")).toMatch(/eso ES el escalón del settle/);
  });

  it("exige que la respiración declare sus dos extremos", () => {
    const soloMedio = checkStructure(probe({ keys: [["50%", "0.78"]] }), landmark());
    expect(soloMedio.join("\n")).toMatch(/no declara su fotograma inicial/);
    expect(soloMedio.join("\n")).toMatch(/no declara su fotograma final/);
  });
});

describe("motion-analysis — veredicto completo (analyze)", () => {
  /* serie limpia: la punta se apaga monótona, el glow respira, el settle no salta */
  const clean = rows([
    [1000, 20, 8, 0.2, 0.32], [1100, 12, 5, 0.2, 0.25], [1200, 6, 2.5, 0.2, 0.18],
    [1300, 2, 1, 0.2, 0.15], [1400, 0.6, 0.3, 0.2, 0.15], [1500, 0.1, 0.1, 0.2, 0.15],
    [1590, 0, 0, 0.2, 0.15], [1610, 0, 0, 0.2, 0.15], [2500, 0, 0, 0.21, 0.15],
  ]);
  const analyzeClean = (r = clean) => analyze({ probe: probe(), L: landmark(), rows: r }, { stepMs: 100 });

  it("una disolución limpia pasa sin hallazgos", () => {
    const out = analyzeClean();
    expect(out.fails).toEqual([]);
    expect(out.starSeen).toBeGreaterThan(THRESHOLDS.starSeen);
    expect(out.breathe.ok).toBe(true);
  });

  it("atrapa el destello sostenido: la luz sube mientras se apaga", () => {
    const conBump = rows([[1000, 20, 8, 0.2, 0.32], [1100, 14, 6, 0.2, 0.28], [1200, 16, 6, 0.2, 0.26], [1300, 9, 4, 0.2, 0.2], [1400, 2, 1, 0.2, 0.15], [1590, 0, 0, 0.2, 0.15], [1610, 0, 0, 0.2, 0.15], [2500, 0, 0, 0.21, 0.15]]);
    expect(analyzeClean(conBump).fails.join("\n")).toMatch(/destello/);
  });

  it("atrapa el glow que se abre fuera del trazo", () => {
    const conHalo = rows([[1000, 20, 8, 0.2, 0.32], [1100, 12, 14, 0.2, 0.25], [1200, 6, 6, 0.2, 0.18], [1400, 1, 1, 0.2, 0.15], [1590, 0, 0, 0.2, 0.15], [1610, 0, 0, 0.2, 0.15], [2500, 0, 0, 0.21, 0.15]]);
    expect(analyzeClean(conHalo).fails.join("\n")).toMatch(/glow fuera del trazo/);
  });

  it("atrapa el salto del settle y la respiración inerte", () => {
    const conSalto = rows([[1000, 20, 8, 0.2, 0.32], [1100, 12, 5, 0.2, 0.25], [1300, 4, 2, 0.2, 0.18], [1590, 0, 0, 0.24, 0.15], [1610, 0, 0, 0.15, 0.15], [2500, 0, 0, 0.15, 0.15]]);
    const out = analyzeClean(conSalto);
    expect(out.fails.join("\n")).toMatch(/salto al entrar el settle/);
    expect(out.fails.join("\n")).toMatch(/el glow no respira/);
  });

  it("falla si el encuadre no ve la estrella o si el congelado deriva (no aprueba en silencio)", () => {
    const sinEstrella = clean.map((r) => ({ ...r, tipRedMax: 0.15 }));
    expect(analyzeClean(sinEstrella).fails.join("\n")).toMatch(/no se ve antes y no se apaga después/);
    const derivado = clean.map((r) => ({ ...r, t: r.T + 40 }));
    expect(analyzeClean(derivado).fails.join("\n")).toMatch(/deriva 40ms/);
  });

  it("expone la ventana y el pico de la disolución para el reporte", () => {
    const out = analyzeClean();
    expect(out.from).toBe(900);      // d0 - 100
    expect(out.to).toBe(1830);       // d1 + 150
    expect(out.peak).toBeCloseTo(20, 6);
  });
});
