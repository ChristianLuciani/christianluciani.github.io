/**
 * geometry.test.mjs — invariantes de la geometría del logo (issue #54).
 * Codifica los hechos verificados en la sesión de origen (PR #53):
 * ancla C idéntica base↔áurea (0.0000px), ratios φ por generación,
 * determinismo y el cierre en A (la "C" abierta).
 */
import { describe, it, expect } from "vitest";
import {
  CONFIG_AUREA, CONFIG_BASE, config, buildGeometry, buildSky,
  constellationPoints, segStyle, cPathD, cBand, seeded, starSpec,
} from "./geometry.mjs";

const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

describe("geometry — ancla de la C (invariante base↔áurea)", () => {
  it("el triángulo externo (la C) coincide 0.0000px con la fórmula base a 7 generaciones", () => {
    // El ancla es la MISMA fórmula paramétrica (R, scalePerLoop, rotPerLoop,
    // globalRot, baseAngles): el triángulo externo de la áurea es idéntico al
    // que la fórmula base produciría con 7 generaciones — 0.0000px.
    // Nota: respecto de la v10 (5 gen) el espiral completo queda +6° rotado
    // horario (2 vueltas más × 3°/vuelta) — hecho de diseño, no desvío.
    const base7 = buildGeometry({ ...CONFIG_BASE.geometry, generations: 7 });
    const aurea = buildGeometry(CONFIG_AUREA.geometry);
    const bOuter = base7.outer, aOuter = aurea.outer;
    expect(bOuter.map((p) => p.v)).toEqual(aOuter.map((p) => p.v));
    for (let i = 0; i < 3; i++) expect(dist(bOuter[i], aOuter[i])).toBeCloseTo(0, 4);
    expect(dist(base7.segs.at(-1).b, aurea.segs.at(-1).b)).toBeCloseTo(0, 4);
  });

  it("el ancla paramétrica está intacta: radios de la C = R·1.5^(-2/3), R·1.5^(-1/3), R", () => {
    const geo = CONFIG_AUREA.geometry;
    const g = buildGeometry(geo);
    // vert[k] = segs[k].b (k≥0); la punta k=20 además está extendida 1%
    const radii = g.outer.map((p) => Math.hypot(p.x - geo.center.x, p.y - geo.center.y));
    expect(radii[0]).toBeCloseTo(geo.R * Math.pow(geo.scalePerLoop, -2 / 3), 4);
    expect(radii[1]).toBeCloseTo(geo.R * Math.pow(geo.scalePerLoop, -1 / 3), 4);
    // la punta A se estira extendLast: queda dentro de R + 1% del último lado
    expect(radii[2]).toBeGreaterThan(geo.R);
    expect(radii[2]).toBeLessThan(geo.R * 1.05);
  });

  it("el espiral termina en el vértice A (arriba): triángulo abierto = la C", () => {
    const g = buildGeometry(CONFIG_AUREA.geometry);
    expect(g.outer.map((p) => p.v)).toEqual(["B", "C", "A"]);
  });

  it("los triángulos internos áureos decrecen por φ (ratios 1.618 verificados)", () => {
    const geo = CONFIG_AUREA.geometry;
    const g = buildGeometry(geo);
    // vert[k] = segs[k].b; vértice B de cada generación: k = 0,3,6,…,18
    const vertAt = (k) => g.segs[k].b;
    const radiusAt = (k) => Math.hypot(vertAt(k).x - geo.center.x, vertAt(k).y - geo.center.y);
    const phi = geo.phi;
    for (let g2 = 0; g2 < geo.generations - 1; g2++) {
      const kOuter = 18 - g2 * 3;
      const kInner = kOuter - 3; // 0 válido: vert0 = segs[0].b (B del más interno)
      expect(radiusAt(kOuter) / radiusAt(kInner)).toBeCloseTo(phi, 2);
    }
  });

  it("el giro entre internos áureos es 3°×φ (twistGolden) hacia atrás", () => {
    const geo = CONFIG_AUREA.geometry;
    const g = buildGeometry(geo);
    const vertAt = (k) => g.segs[k].b;
    const angleAt = (k) => (Math.atan2(vertAt(k).y - geo.center.y, vertAt(k).x - geo.center.x) * 180) / Math.PI;
    for (let g2 = 0; g2 < geo.generations - 1; g2++) {
      const kOuter = 18 - g2 * 3;
      const kInner = kOuter - 3;
      const dAng = ((angleAt(kOuter) - angleAt(kInner)) % 360 + 360) % 360;
      expect(dAng).toBeCloseTo(geo.twistGolden, 1);
    }
  });

  it("el giro entre internos áureos es 3°×φ", () => {
    const geo = CONFIG_AUREA.geometry;
    expect(geo.twistGolden).toBeCloseTo(3 * geo.phi, 3);
  });

  it("determinista: misma geometría en cada corrida", () => {
    const a = buildGeometry(CONFIG_AUREA.geometry);
    const b = buildGeometry(CONFIG_AUREA.geometry);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("segStyle — rampa del espiral y la C", () => {
  const cfg = CONFIG_AUREA;
  const total = buildGeometry(cfg.geometry).segs.length;

  it("las 2 últimas líneas son la C: oro, width 10, opacidad 1", () => {
    const st = segStyle(total - 2, total, cfg);
    expect(st).toEqual({ opacity: 1, width: 10, color: "#c9a84c", isC: true });
    expect(segStyle(total - 1, total, cfg).isC).toBe(true);
  });

  it("el espiral sube de azul profundo a teal con opacidad creciente", () => {
    const first = segStyle(0, total, cfg);
    const last = segStyle(total - 3, total, cfg);
    expect(first.color).toBe("rgb(22,50,79)"); // #16324f
    expect(last.color).toBe("rgb(0,201,192)"); // #00c9c0
    expect(first.opacity).toBeCloseTo(0.1);
    expect(last.opacity).toBeCloseTo(0.72);
    expect(first.width).toBeCloseTo(2.2);
    expect(last.width).toBeCloseTo(4.2);
  });

  it("cPathD conecta B→C→punta (un solo path, join limpio)", () => {
    const g = buildGeometry(CONFIG_AUREA.geometry);
    const d = cPathD(g.segs);
    expect(d.split(" L ").length).toBe(3);
    expect(d.startsWith("M")).toBe(true);
  });
});

describe("cielo — sky (ambient + galaxia) determinista", () => {
  it("áurea: 30 ambient + 46 galaxia = 76 estrellas", () => {
    const sky = buildSky(CONFIG_AUREA);
    expect(sky.filter((s) => s.kind === "ambient").length).toBe(30);
    expect(sky.filter((s) => s.kind === "galaxy").length).toBe(46);
    expect(sky.length).toBe(76);
  });

  it("base v10: 32 ambient, sin galaxia", () => {
    const sky = buildSky(CONFIG_BASE);
    expect(sky.length).toBe(32);
    expect(sky.every((s) => s.kind === "ambient")).toBe(true);
  });

  it("determinista y dentro del lienzo", () => {
    const sky = buildSky(CONFIG_AUREA);
    const sky2 = buildSky(CONFIG_AUREA);
    expect(JSON.stringify(sky)).toBe(JSON.stringify(sky2));
    for (const s of sky) {
      expect(s.r).toBeGreaterThan(0);
      expect(s.hi).toBeGreaterThan(s.lo);
    }
  });
});

describe("config()", () => {
  it("base y aurea devuelven sus CONFIG canónicos", () => {
    expect(config("base")).toBe(CONFIG_BASE);
    expect(config("aurea")).toBe(CONFIG_AUREA);
  });
});

describe("cBand() — la C como barra con bisel (centros y ancho, contorno nuevo)", () => {
  const g = buildGeometry(CONFIG_AUREA.geometry);
  const W = CONFIG_AUREA.cWidth;

  it("conserva los centros de cPathD: B, C y punta A", () => {
    const band = cBand(g.segs, W);
    const cIdx = g.segs.length - 2;
    expect(band.B).toEqual(g.segs[cIdx].a);
    expect(band.C).toEqual(g.segs[cIdx].b);
    expect(band.A).toEqual(g.segs[cIdx + 1].b);
    expect(band.h).toBe(W / 2);
  });

  it("el ancho de la barra es exactamente cWidth, en base y punta", () => {
    const band = cBand(g.segs, W);
    expect(band.cornerCut).toBe(CONFIG_AUREA.cFinish.cornerCut); // default = acabado, no 2.2
    expect(dist(band.perp[0][0], band.perp[0][1])).toBeCloseTo(W, 6);
    expect(dist(band.perp[1][0], band.perp[1][1])).toBeCloseTo(W, 6);
  });

  it("el contorno es único, cerrado, con marco redondeado y terminales circulares", () => {
    const band = cBand(g.segs, W);
    expect(band.outline.startsWith("M ")).toBe(true);
    expect(band.outline.trim().endsWith("Z")).toBe(true);
    // 2 esquinas de marco (inglete redondeado) + 2 semicírculos de terminal
    expect((band.outline.match(/ Q /g) || []).length).toBe(2);
    expect((band.outline.match(/ A /g) || []).length).toBe(2);
    // los dos arcos son convexos (sweep 0): terminal circular hacia afuera
    expect((band.outline.match(new RegExp(`A ${band.h} ${band.h} 0 0 0`, "g")) || []).length).toBe(2);
  });

  it("extremos con terminal circular y sin caps/tapas sueltas", () => {
    const band = cBand(g.segs, W);
    expect(band.ends.map((e) => e.role)).toEqual(["base", "tip"]);
    expect(band).not.toHaveProperty("caps");
    expect(band).not.toHaveProperty("quads");
  });

  it("los dos clips separan los brazos por la bisectriz del vértice", () => {
    const band = cBand(g.segs, W);
    const [c1, c2] = band.clip;
    // ambos semiplanos arrancan en el mismo punto de la bisectriz (C − w·L)
    const num = (d) => d.match(/-?[\d.]+/g).map(Number);
    expect(num(c1).slice(0, 2)).toEqual(num(c2).slice(0, 2));
    // el punto lejano de cada clip cae del lado de su brazo (B o A)
    const uB = { x: band.B.x - band.C.x, y: band.B.y - band.C.y };
    const uA = { x: band.A.x - band.C.x, y: band.A.y - band.C.y };
    const nB = Math.hypot(uB.x, uB.y), nA = Math.hypot(uA.x, uA.y);
    const w = { x: uB.x / nB + uA.x / nA, y: uB.y / nB + uA.y / nA };
    const side = (p) => Math.sign(w.x * (p.y - band.C.y) - w.y * (p.x - band.C.x));
    const far = (d) => { const n = num(d); return { x: n[4], y: n[5] }; };
    expect(side(far(c1))).toBe(side(band.B));
    expect(side(far(c2))).toBe(side(band.A));
    expect(side(band.B)).not.toBe(side(band.A));
  });

  it("el inglete equidista h de ambas líneas centrales", () => {
    const band = cBand(g.segs, W);
    const distLine = (p, a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / Math.hypot(dx, dy);
    };
    expect(distLine(band.miter.Xo, band.B, band.C)).toBeCloseTo(band.h, 6);
    expect(distLine(band.miter.Xi, band.B, band.C)).toBeCloseTo(band.h, 6);
  });

  it("determinista", () => {
    const a = cBand(g.segs, W);
    const b = cBand(g.segs, W);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("el cuarto color (ámbar dorado) vive en el acabado, una sola fuente", () => {
    // el acabado es la única fuente: no hay tokens duplicados en `colors`
    expect(CONFIG_AUREA.cFinish.tint.amber).toBe("#d99a2b");
    expect(CONFIG_BASE.cFinish.tint.amber).toBe("#d99a2b");
    expect(CONFIG_AUREA.colors).not.toHaveProperty("amber");
    expect(CONFIG_AUREA.colors).not.toHaveProperty("cLight");
  });

  it("el acabado se queda en la familia del oro (sin marrones de cobre)", () => {
    const deep = CONFIG_AUREA.cFinish.perp.at(-1).color;
    expect(deep).toBe("#8f661c");
    expect(CONFIG_AUREA.cFinish.bloom.color).toBe("#dfa637");
  });
});

describe("constellationPoints()", () => {
  it("centro + un punto por vértice (22 en áurea)", () => {
    const g = buildGeometry(CONFIG_AUREA.geometry);
    const pts = constellationPoints(g.segs);
    expect(pts.length).toBe(1 + g.segs.length);
    expect(pts[0]).toEqual({ x: 400, y: 418 });
  });
});

describe("seeded()", () => {
  it("mismo semillero = misma secuencia", () => {
    const a = seeded(42), b = seeded(42);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
  });
});

describe("golden values — anclas congeladas del gate DOM (captan drift de seeds sin Chrome)", () => {
  // Valores congelados de la geometría que verify-dom-fidelity.mjs probó
  // ≡ DOM aprobado (PR #53). Si cambia una semilla, un orden de rnd() o una
  // fórmula del cielo/constelación, ESTOS tests fallan en CI sin Chrome.
  const j2 = (x) => Math.round(x * 100) / 100;

  it("cielo áurea: ambient[0] y galaxy[0] en su posición/radio/color verificados", () => {
    const sky = buildSky(CONFIG_AUREA);
    const amb0 = sky.find((s) => s.kind === "ambient");
    const gal0 = sky.find((s) => s.kind === "galaxy");
    expect(j2(amb0.cx)).toBe(245.1);
    expect(j2(amb0.cy)).toBe(284.29);
    expect(j2(amb0.r)).toBe(1.35);
    expect(amb0.color).toBe("#ffb49e");
    expect(j2(amb0.hi)).toBe(0.31);
    expect(j2(gal0.cx)).toBe(444.03);
    expect(j2(gal0.cy)).toBe(382.36);
    expect(j2(gal0.r)).toBe(0.9);
    expect(gal0.color).toBe("#f6d7c4");
  });

  it("constelación áurea: starSpec del vértice 1 y de la punta congelados", () => {
    const _g = buildGeometry(CONFIG_AUREA.geometry);
    const pts = constellationPoints(_g.segs);
    const sp1 = starSpec(1, pts.length, CONFIG_AUREA.constellation);
    expect(j2(pts[1].x)).toBe(409.22);
    expect(j2(pts[1].y)).toBe(423.3);
    expect(sp1.color).toBe("#ff6f5e");
    expect(sp1.coreR).toBe(1.27);
    expect(sp1.glowR).toBe(3.3);
    const spT = starSpec(pts.length - 1, pts.length, CONFIG_AUREA.constellation);
    expect(spT.color).toBe("#ff6f5e");
    expect(spT.coreR).toBe(2.93);
    expect(j2(pts.at(-1).x)).toBe(492.54); // punta extendida
    expect(j2(pts.at(-1).y)).toBe(181.52);
  });

  it("cielo v10 (base): primera estrella congelada (semilla 20260901 legacy)", () => {
    const b0 = buildSky(CONFIG_BASE)[0];
    expect(j2(b0.cx)).toBe(326.15);
    expect(j2(b0.cy)).toBe(245.1);
    expect(j2(b0.r)).toBe(1.28);
  });
});