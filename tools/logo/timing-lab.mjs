/**
 * timing-lab.mjs — datos del laboratorio temporal del logo (experimento, no sitio).
 *
 * Toma la geometría EXACTA del logo principal (`CONFIG_AUREA` de geometry.mjs) y
 * hornea `proposals/logo-timing/geometry.data.js` con:
 *   · las 21 conexiones (nodos, longitud, color/grosor de marca),
 *   · la constelación (estrella por nodo) y el cielo,
 *   · los tres cronogramas candidatos, calculados acá y no en el navegador.
 *
 * Criterios (T_ref = 0,70 s sobre la ÚLTIMA conexión = último tramo de la C):
 *   1. intervalo constante   → t_i = T_ref
 *   2. velocidad constante   → v = L_ref/T_ref; t_i = L_i/v
 *   3. aceleración constante → a = 2·L_ref/T_ref²; t_i = √(2·L_i/a)
 *
 * Encadenado estricto: cada conexión arranca cuando la anterior llega.
 * `lead` = 700 ms de constelación antes de la primera conexión.
 *
 * Uso: node tools/logo/timing-lab.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONFIG_AUREA, buildGeometry, segStyle, starSpec, seeded,
} from "./geometry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const OUT = resolve(REPO, "proposals/logo-timing");

const T_REF_MS = 700;
const LEAD_MS = 700;
const HOLD_MS = 1200;

const cfg = CONFIG_AUREA;
const geo = buildGeometry(cfg.geometry);
const n2 = (x) => +x.toFixed(2);

const segs = geo.segs.map((s, i) => {
  const st = segStyle(i, geo.segs.length, cfg);
  return {
    i,
    a: { x: n2(s.a.x), y: n2(s.a.y) },
    b: { x: n2(s.b.x), y: n2(s.b.y) },
    len: n2(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y)),
    color: st.color,
    width: +st.width.toFixed(2),
    opacity: +st.opacity.toFixed(3),
    isC: !!st.isC,
  };
});

const totalLen = n2(segs.reduce((acc, s) => acc + s.len, 0));
const ref = segs[segs.length - 1];
const refLen = ref.len;

/* ── cronogramas ─────────────────────────────────────────────────────── */
function schedule(durations) {
  let t = LEAD_MS;
  const starts = [];
  const ends = [];
  for (const d of durations) {
    starts.push(+t.toFixed(2));
    t += d;
    ends.push(+t.toFixed(2));
  }
  return {
    durations: durations.map((d) => +d.toFixed(2)),
    starts,
    ends,
    lead: LEAD_MS,
    connectTotal: +(t - LEAD_MS).toFixed(2),
    total: +t.toFixed(2),
  };
}

const dur1 = segs.map(() => T_REF_MS);
const vRef = refLen / (T_REF_MS / 1000); // px/s
const dur2 = segs.map((s) => (s.len / vRef) * 1000);
const aRef = (2 * refLen) / Math.pow(T_REF_MS / 1000, 2); // px/s²
const dur3 = segs.map((s) => Math.sqrt((2 * s.len) / aRef) * 1000);

const timing = {
  1: schedule(dur1),
  2: schedule(dur2),
  3: schedule(dur3),
};

const metrics = {
  1: {
    vRef: n2(vRef),
    vMin: n2(Math.min(...segs.map((s) => s.len / (T_REF_MS / 1000)))),
    vMax: n2(Math.max(...segs.map((s) => s.len / (T_REF_MS / 1000)))),
  },
  2: { v: n2(vRef) },
  3: {
    a: n2(aRef),
    vTip: n2(aRef * (T_REF_MS / 1000)),
    tMin: n2(Math.min(...timing[3].durations)),
    tMax: n2(Math.max(...timing[3].durations)),
  },
};

/* ── nodos: estrella por punto (color/tamaño deterministas de marca) ───── */
const nodes = [segs[0].a, ...segs.map((s) => s.b)].map((p, j) => {
  const sp = starSpec(j, segs.length + 1, cfg.constellation);
  return {
    x: n2(p.x),
    y: n2(p.y),
    color: sp.color,
    coreR: sp.coreR,
    glowR: sp.glowR,
  };
});

/* ── cielo: atmósfera sutil, no compite con la lectura temporal ───────── */
const sky = [];
{
  const rnd = seeded(20261027);
  for (let i = 0; i < 34; i++) {
    const big = rnd() > 0.88;
    sky.push({
      x: n2(20 + rnd() * 760),
      y: n2(20 + rnd() * 760),
      r: +((big ? 1.4 : 0.7) + rnd() * 0.9).toFixed(2),
      color: cfg.constellation.palette[Math.floor(rnd() * cfg.constellation.palette.length)],
      opacity: +((big ? 0.18 : 0.06) + rnd() * 0.12).toFixed(3),
      twinkle: +(3 + rnd() * 2.4).toFixed(2),
    });
  }
}

/* ── viewBox cuadrado centrado en la geometría + margen ───────────────── */
const xs = nodes.map((n) => n.x);
const ys = nodes.map((n) => n.y);
const pad = 56;
const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
const side = Math.ceil(span + pad * 2);
const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
const viewBox = { x: n2(cx - side / 2), y: n2(cy - side / 2), w: side, h: side };

const ghost = geo.outer.map((p) => ({ x: n2(p.x), y: n2(p.y) }));

/* ── chequeos: si el dato horneado no cumple, no se escribe ───────────── */
const fail = [];
const near = (a, b, eps = 0.02) => Math.abs(a - b) <= eps;
if (timing[1].durations.some((d) => !near(d, T_REF_MS))) fail.push("criterio 1: duración ≠ 700 ms");
if (!near(timing[2].durations.at(-1), T_REF_MS)) fail.push("criterio 2: referencia ≠ 700 ms");
if (!near(timing[3].durations.at(-1), T_REF_MS)) fail.push("criterio 3: referencia ≠ 700 ms");
for (const k of [1, 2, 3]) {
  const t = timing[k];
  if (!t.starts.every((s, i) => i === 0 || near(s, t.ends[i - 1], 0.011)))
    fail.push(`criterio ${k}: cadena no contigua`);
  if (t.durations.some((d) => d <= 0)) fail.push(`criterio ${k}: duración ≤ 0`);
}
if (fail.length) {
  console.error(`❌ timing-lab: ${fail.join(" · ")}`);
  process.exit(1);
}

const data = {
  source: "tools/logo/geometry.mjs · CONFIG_AUREA",
  generatedBy: "node tools/logo/timing-lab.mjs",
  tRefMs: T_REF_MS,
  leadMs: LEAD_MS,
  holdMs: HOLD_MS,
  refIndex: segs.length - 1,
  refLen,
  totalLen,
  viewBox,
  metrics,
  timing,
  segs,
  nodes,
  sky,
  ghost,
  cWidth: cfg.cWidth,
  colors: cfg.colors,
  palette: cfg.constellation.palette,
};

mkdirSync(OUT, { recursive: true });
writeFileSync(
  resolve(OUT, "geometry.data.js"),
  `/* GENERADO por tools/logo/timing-lab.mjs — no editar a mano. */\n` +
    `window.LAB_GEO = ${JSON.stringify(data, null, 1)};\n`
);

console.log(`✓ proposals/logo-timing/geometry.data.js`);
console.log(`  ${segs.length} conexiones · recorrido ${totalLen} px · referencia ${refLen} px (link ${ref.i})`);
for (const k of [1, 2, 3]) {
  const t = timing[k];
  console.log(
    `  criterio ${k}: conexiones ${(t.connectTotal / 1000).toFixed(2)} s ` +
      `· total ${(t.total / 1000).toFixed(2)} s ` +
      `· por link ${(Math.min(...t.durations) / 1000).toFixed(3)}–${(Math.max(...t.durations) / 1000).toFixed(3)} s`
  );
}
console.log(`  v_ref ${metrics[1].vRef} px/s · a ${metrics[3].a} px/s²`);
