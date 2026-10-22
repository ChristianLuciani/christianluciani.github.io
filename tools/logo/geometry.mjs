/**
 * geometry.mjs — geometría paramétrica del logo (puerto fiel de
 * proposals/logo-triangulo-espiral/aurea7.html y su versión base index.html).
 *
 * Fuente única de verdad del issue #54: el SVG por capas y los assets se
 * GENERAN desde acá; nada se dibuja a mano. El puerto es verbatim — la
 * secuencia de rnd() de cada generador (sky/galaxia/constelación) se copia
 * exacta para que las estrellas caigan idénticas a la animación aprobada
 * (PR #53). La fidelidad se verifica con tools/logo/verify-dom-fidelity.mjs
 * (compara contra el DOM real renderizado por Chrome).
 */

/* Acabado de la C (cuarto color de marca: ámbar dorado).
   La C deja de ser un trazo plano de oro: se dibuja como una barra con
   bisel transversal (gradiente perpendicular al tramo: sombra abajo, luz
   arriba) y un barrido de color a lo largo de la firma (ámbar cálido en B
   → oro en el vértice C → luz en la punta A). Es tratamiento de render: la
   geometría (cPathD, centros, anchos) no cambia.
   TODO el acabado vive en la familia del oro: el cuarto color suma
   calidez, no reemplaza el metal (feedback del operador, 2026-10-22:
   "el cobre es muy oscuro, la idea es oro").
   `bloom` es el halo del fondo oscuro; sobre superficies claras NO se usa
   (el oro translúcido sobre blanco vira a verdoso) y en su lugar se aplica
   `shadow`: una sombra cálida neutra. */
export const C_FINISH = {
  perp: [ // gradiente a través del grosor: borde iluminado → borde en sombra
    { offset: 0, color: "#fffbe6" },
    { offset: 0.16, color: "#f8e4a8" },
    { offset: 0.5, color: "#ddb04a" },
    { offset: 0.84, color: "#b1852c" },
    { offset: 1, color: "#8f661c" }, // sombra: oro profundo, nunca marrón
  ],
  tint: { // barrido a lo largo de la C (se superpone al bisel)
    amber: "#d99a2b", amberOpacity: 0.5,   // en B: la firma nace ámbar
    light: "#fffbe6", lightOpacity: 0.32,  // en A: la punta recibe la luz
  },
  bloom: { color: "#dfa637", opacity: 0.28, width: 6, blur: 8 },
  shadow: { color: "#6b5218", opacity: 0.2, dy: 2.2, blur: 2.4 },
};

/* CONFIG de aurea7.html (base v10 = misma sin mode/galaxy/timing fast) */
export const CONFIG_AUREA = {
  geometry: {
    center: { x: 400, y: 418 },
    R: 250,
    mode: "aurea",
    phi: 1.618,
    twistGolden: 4.854, // 3°×φ
    scalePerLoop: 1.5,
    rotPerLoop: 3,
    globalRot: 1,
    generations: 7, // 6 internas + la C
    extendLast: 0.01,
    vertexOrder: ["B", "C", "A"],
    baseAngles: { A: -90, B: 40, C: 140 },
  },
  ramp: { from: 0.1, to: 0.72 },
  rampWidth: { from: 2.2, to: 4.2 },
  cWidth: 10,
  colors: {
    spiralFrom: "#16324f",
    spiralTo: "#00c9c0",
    c: "#c9a84c",
    amber: "#d99a2b", // cuarto color: ámbar dorado (calidez, no otro metal)
    cLight: "#fffbe6", // luz del bisel (no es color de marca: es el brillo)
  },
  cFinish: C_FINISH,
  constellation: {
    palette: ["#ff8a70", "#ff6f5e", "#ffb49e", "#f6d7c4", "#cfe0ff"],
    dissolve: 680,
    ambient: 30,
    galaxy: 46,
    skyCode: "sutil", // cielo sutil y disperso de aurea7.html
  },
  ghostOutline: true,
};

/* CONFIG de index.html (base v10 congelada) */
export const CONFIG_BASE = {
  geometry: {
    center: { x: 400, y: 418 },
    R: 250,
    scalePerLoop: 1.5,
    rotPerLoop: 3,
    globalRot: 1,
    generations: 5,
    extendLast: 0.01,
    vertexOrder: ["B", "C", "A"],
    baseAngles: { A: -90, B: 40, C: 140 },
  },
  ramp: { from: 0.1, to: 0.72 },
  rampWidth: { from: 2.2, to: 4.2 },
  cWidth: 10,
  colors: {
    spiralFrom: "#16324f",
    spiralTo: "#00c9c0",
    c: "#c9a84c",
    amber: "#d99a2b",
    cLight: "#fffbe6",
  },
  cFinish: C_FINISH,
  constellation: {
    palette: ["#ff8a70", "#ff6f5e", "#ffb49e", "#f6d7c4", "#cfe0ff"],
    dissolve: 680,
    ambient: 32,
    skyCode: "v10", // cielo de index.html (v10): r plano .8+1.4, sin big
  },
  ghostOutline: true,
};

export const config = (version) => {
  if (version === "base") return CONFIG_BASE;
  if (version === "aurea") return CONFIG_AUREA;
  throw new Error(`config: versión desconocida "${version}" (esperadas: base | aurea)`);
};

/* ── utilidades (verbatim de aurea7.html) ── */
const lerp = (a, b, t) => a + (b - a) * t;
export const lerpColor = (h1, h2, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(h1), b = p(h2);
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(",")})`;
};
// pseudo-azar con semilla fija: misma constelación en cada replay
export const seeded = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

/* varianza de constelación real: tamaño, color e intensidad por estrella (verbatim) */
export function starSpec(j, total, C) {
  if (j === 0) { // supernova central: permanece, es el origen
    return {
      color: "#ffb3a0", coreR: 4.2, glowR: 14,
      lo: 0.55, hi: 1, loG: 0.16, hiG: 0.3,
      dC: "3.2", dG: "4", d1: "-0.4", d2: "-1.1",
    };
  }
  const rnd = seeded(90210 + j * 131);
  const color = C.palette[Math.floor(rnd() * C.palette.length)];
  const bright = j === total - 1 || rnd() > 0.72; // la punta brilla más
  const coreR = +(bright ? 2.7 + rnd() * 1.2 : 1.2 + rnd() * 1.5).toFixed(2);
  const lo = +(bright ? 0.55 + rnd() * 0.2 : 0.15 + rnd() * 0.3).toFixed(2);
  const hi = +(bright ? 1 : 0.55 + rnd() * 0.4).toFixed(2);
  return {
    color, coreR, glowR: +(coreR * (bright ? 3.6 : 2.6)).toFixed(1),
    lo, hi, loG: +(lo * 0.5).toFixed(2), hiG: +(0.2 + hi * 0.18).toFixed(2),
    dC: (1.9 + rnd() * 2).toFixed(2), dG: (2.6 + rnd() * 2).toFixed(2),
    d1: (-(rnd() * 2.2)).toFixed(2), d2: (-(rnd() * 3.1)).toFixed(2),
  };
}

/* ── geometría del espiral (verbatim de aurea7.html, buildGeometry) ──
   10 puntos: centro → B0 C0 A0 → B1 C1 A1 → B2 C2 A2 (t = vuelta/fracción)
   Radio crece exponencialmente → espiral de tramos rectos.
   El ciclo B→C→A hace que las últimas 2 líneas sean: B2→C2 (base) y
   C2→A2 (lado izquierdo): triángulo abierto a la derecha = la "C". */
export function buildGeometry(g) {
  if (g.mode === "aurea") return buildAurea(g);
  const { x: cx, y: cy } = g.center;
  const steps = g.generations * 3; // vértices; k_max ≡ 2 mod 3 ⇒ termina en A
  const T_MAX = (steps - 1) / 3;
  const verts = [];
  for (let k = 0; k < steps; k++) {
    const t = k / 3;
    const v = g.vertexOrder[k % 3];
    const ang = (g.baseAngles[v] + g.rotPerLoop * t + (g.globalRot || 0) +
      Math.min(0, (k - (steps - 3)) / 3)) * Math.PI / 180;
    // ↑ giro extra entre triángulos internos: 4° por vuelta sin mover la C
    const r = g.R * Math.pow(g.scalePerLoop, t - T_MAX);
    verts.push({ v, x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
  }
  if (g.extendLast) { // estira el último tramo más allá de la punta de la C
    const a = verts[verts.length - 1], b = verts[verts.length - 2];
    const dx = a.x - b.x, dy = a.y - b.y;
    a.x += dx * g.extendLast;
    a.y += dy * g.extendLast;
  }
  const all = [{ x: cx, y: cy }, ...verts];
  const segs = [];
  for (let i = 0; i < all.length - 1; i++) segs.push({ a: all[i], b: all[i + 1], idx: i });
  return { segs, outer: verts.slice(-3) }; // outer = vértices del triángulo final
}

/* ── geometría áurea: anclada en la C (idéntica a la base) ──
   El triángulo externo ES el de la base (posición y geometría intactas).
   Los internos se derivan hacia atrás en proporción áurea respecto a él:
   · distancia: cada triángulo interno = el externo / φ (por generación)
   · rotación: giro entre internos = giro externo (4°) × φ */
export function buildAurea(g) {
  const { x: cx, y: cy } = g.center;
  const steps = g.generations * 3;
  const phi = g.phi || (1 + Math.sqrt(5)) / 2;
  const anchorR = (k) => g.R * Math.pow(g.scalePerLoop, k / 3 - (steps - 1) / 3);
  const anchorA = (k) => g.baseAngles[g.vertexOrder[k % 3]] + g.rotPerLoop * (k / 3) + (g.globalRot || 0);
  const verts = [];
  for (let k = 0; k < steps; k++) {
    const back = (steps / 3 - 1) - Math.floor(k / 3); // vueltas hacia adentro (0 = la C)
    const anchorK = (steps - 3) + (k % 3);            // vértice correspondiente en la C
    const r = anchorR(anchorK) / Math.pow(phi, back);
    const ang = (anchorA(anchorK) - (g.twistGolden || 4 * phi) * back) * Math.PI / 180;
    verts.push({ v: g.vertexOrder[k % 3], x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
  }
  if (g.extendLast) {
    const a = verts[verts.length - 1], b = verts[verts.length - 2];
    const dx = a.x - b.x, dy = a.y - b.y;
    a.x += dx * g.extendLast; a.y += dy * g.extendLast;
  }
  const all = [{ x: cx, y: cy }, ...verts];
  const segs = [];
  for (let i = 0; i < all.length - 1; i++) segs.push({ a: all[i], b: all[i + 1], idx: i });
  return { segs, outer: verts.slice(-3) };
}

/* estilo por segmento (verbatim de segStyle, parametrizado por CONFIG) */
export function segStyle(idx, total, cfg) {
  const c = cfg;
  if (idx >= total - 2) // últimas 2 líneas = la "C"
    return { opacity: 1, width: c.cWidth, color: c.colors.c, isC: true };
  const t = idx / (total - 3);
  return {
    opacity: lerp(c.ramp.from, c.ramp.to, t),
    width: lerp(c.rampWidth.from, c.rampWidth.to, t),
    color: lerpColor(c.colors.spiralFrom, c.colors.spiralTo, t),
    isC: false,
  };
}

/* la C como UN solo path (join redondeado real; ver aurea7.html) */
export function cPathD(segs) {
  const cIdx = segs.length - 2;
  const cA = segs[cIdx].a, cB = segs[cIdx].b, cTip = segs[cIdx + 1].b;
  return `M ${cA.x} ${cA.y} L ${cB.x} ${cB.y} L ${cTip.x} ${cTip.y}`;
}

/* ── la C como BARRA con bisel (acabado ámbar→oro→luz) ──
   Misma silueta y mismos centros que el trazo de ancho `width`: cada tramo
   se convierte en un cuadrilátero de ancho width centrado en la línea, con
   la normal orientada "hacia arriba" (luz cenital). Los quads son la base
   del gradiente transversal (bisel).
   Los extremos libres (B y A) terminan en CORTE TRANSVERSAL PLANO: sin cap
   redondo, para que la barra no lea como un tubo con cara circular
   (feedback del operador, 2026-10-22).
   El vértice C se resuelve con un INGLETE: ambos tramos se cortan en la
   MISMA línea (intersección de los bordes exteriores Xo e interiores Xi),
   de modo que las dos piezas encajan sin hueco ni solape. No hay tapa
   circular ni parche en la esquina.
   La geometría de referencia (cPathD) no se toca. */
export function cBand(segs, width) {
  const cIdx = segs.length - 2;
  const B = segs[cIdx].a, C = segs[cIdx].b, A = segs[cIdx + 1].b;
  const h = width / 2;
  const unit = (p, q) => {
    const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
    return { x: dx / len, y: dy / len };
  };
  const normal = (p, q) => {
    const u = unit(p, q);
    let nx = -u.y, ny = u.x;
    if (ny > 0) { nx = -nx; ny = -ny; } // normal siempre hacia arriba (y−)
    return { x: nx, y: ny };
  };
  const offsetLineIntersection = (p1, u1, p2, u2) => {
    const cross = (a, b) => a.x * b.y - a.y * b.x;
    const r = { x: p2.x - p1.x, y: p2.y - p1.y };
    const den = cross(u1, u2);
    const t = Math.abs(den) < 1e-9 ? 0 : cross(r, u2) / den;
    return { x: p1.x + u1.x * t, y: p1.y + u1.y * t };
  };
  const n1 = normal(B, C), n2 = normal(C, A);
  const u1 = unit(B, C), u2 = unit(C, A);
  // inglete: los dos bordes (exterior +h, interior −h) de ambos tramos
  const Xo = offsetLineIntersection(
    { x: B.x + n1.x * h, y: B.y + n1.y * h }, u1,
    { x: C.x + n2.x * h, y: C.y + n2.y * h }, u2
  );
  const Xi = offsetLineIntersection(
    { x: B.x - n1.x * h, y: B.y - n1.y * h }, u1,
    { x: C.x - n2.x * h, y: C.y - n2.y * h }, u2
  );
  /* cada tramo: borde exterior → corte de inglete → borde interior → extremo
     plano. Ambos comparten exactamente la línea Xo–Xi: encajan sin hueco. */
  const quad = (a, b, c, d) => ({
    path: `M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y} L ${d.x} ${d.y} Z`,
    a, b, c, d,
  });
  const q1 = {
    ...quad(
      { x: B.x + n1.x * h, y: B.y + n1.y * h }, Xo, Xi,
      { x: B.x - n1.x * h, y: B.y - n1.y * h }
    ),
    // eje del bisel: perpendicular REAL al tramo (el corte de inglete no lo es)
    perp: [
      { x: B.x + n1.x * h, y: B.y + n1.y * h },
      { x: B.x - n1.x * h, y: B.y - n1.y * h },
    ],
  };
  const q2 = {
    ...quad(
      Xo,
      { x: A.x + n2.x * h, y: A.y + n2.y * h },
      { x: A.x - n2.x * h, y: A.y - n2.y * h },
      Xi
    ),
    perp: [
      { x: A.x + n2.x * h, y: A.y + n2.y * h },
      { x: A.x - n2.x * h, y: A.y - n2.y * h },
    ],
  };
  return {
    B, C, A, h,
    normal,
    quads: [q1, q2],
    ends: [{ p: B, role: "base" }, { p: A, role: "tip" }], // corte plano, sin cap
    miter: { Xo, Xi }, // la línea Xo–Xi es el corte compartido del vértice
  };
}

/* ── cielo (verbatim: aurea7.html “sutil” / index.html “v10”) ──
   El orden de rnd() es exacto al HTML de cada versión: cada estrella
   consume el mismo número y orden de tiradas, así el cielo cae idéntico. */
export function buildSky(cfg) {
  const C = cfg.constellation;
  if (C.skyCode === "v10") return buildSkyV10(C);
  return buildSkySutil(cfg);
}

/* cielo sutil y disperso (aurea7.html): ambient + brazos de galaxia */
function buildSkySutil(cfg) {
  const C = cfg.constellation;
  const stars = [];
  if (!C.ambient) return stars;
  const rnd = seeded(20260901);
  for (let i = 0; i < C.ambient; i++) {
    const big = rnd() > 0.9; // algunas estrellas de fondo más presentes
    stars.push({
      kind: "ambient",
      cx: 40 + rnd() * 720,
      cy: 40 + rnd() * 720,
      r: big ? 1.5 + rnd() * 0.9 : 0.7 + rnd() * 1.1,
      // animation-delay:${(-rnd() * 4.2).toFixed(2)}s
      delay: -rnd() * 4.2,
      color: C.palette[Math.floor(rnd() * C.palette.length)],
      lo: big ? 0.22 + rnd() * 0.12 : 0.08 + rnd() * 0.12,
      hi: big ? 0.5 + rnd() * 0.25 : 0.28 + rnd() * 0.3,
      da: 3 + rnd() * 2,
    });
  }
  if (C.galaxy > 0) { // brazos de galaxia: mismo sentido de giro y crecimiento φ que el logo
    const geo = cfg.geometry;
    const rndG = seeded(5150);
    const arms = 2, sp = Math.floor(C.galaxy / arms), span = Math.PI * 1.9;
    const growth = 5.4, phase = -0.6; // radio ×5.4, barrido más amplio y disperso
    for (let arm = 0; arm < arms; arm++) {
      for (let s2 = 0; s2 < sp; s2++) {
        const f = s2 / (sp - 1); // 0 = núcleo, 1 = borde del brazo
        const th = phase + f * span + arm * (Math.PI * 2 / arms) + (rndG() - 0.5) * 0.3;
        const rad = 58 * Math.pow(growth, f) * (1 + (rndG() - 0.5) * 0.24);
        const inner = 1.35 - f * 0.5; // apenas más presencia hacia el núcleo
        stars.push({
          kind: "galaxy",
          cx: geo.center.x + rad * Math.cos(th),
          cy: geo.center.y + rad * Math.sin(th),
          r: (0.6 + rndG() * 1.0) * inner,
          delay: -rndG() * 4.2,
          color: C.palette[Math.floor(rndG() * C.palette.length)],
          lo: 0.06 + rndG() * 0.1,
          hi: 0.22 + rndG() * 0.24,
          da: 3 + rndG() * 2,
        });
      }
    }
  }
  return stars;
}

/* cielo v10 (index.html): ambient sin galaxia, fórmula propia */
function buildSkyV10(C) {
  const stars = [];
  if (!C.ambient) return stars;
  const rnd = seeded(20260901);
  for (let i = 0; i < C.ambient; i++) {
    stars.push({
      kind: "ambient",
      cx: 40 + rnd() * 720,
      cy: 40 + rnd() * 720,
      r: 0.8 + rnd() * 1.4,
      delay: -rnd() * 4.2,
      color: C.palette[Math.floor(rnd() * C.palette.length)],
      lo: 0.08 + rnd() * 0.12,
      hi: 0.28 + rnd() * 0.3,
      da: 3 + rnd() * 2,
    });
  }
  return stars;
}

/* puntos de la constelación de vértices: centro + cada vértice del espiral */
export function constellationPoints(segs) {
  return [segs[0].a, ...segs.map((s) => s.b)];
}