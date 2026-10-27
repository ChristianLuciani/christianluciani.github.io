/**
 * timing-lab.mjs — datos del laboratorio temporal del logo (experimento, no sitio).
 *
 * Toma la geometría EXACTA del logo principal (`CONFIG_AUREA` de geometry.mjs) y
 * hornea `proposals/logo-timing/geometry.data.js` con:
 *   · las 21 conexiones (nodos, longitud, color/grosor de marca),
 *   · la constelación (estrella por nodo) y el cielo,
 *   · los cronogramas de las DOS familias de referencia (0,70 s y 0,30 s),
 *     calculados acá y no en el navegador.
 *
 * Criterios (T_ref sobre la ÚLTIMA conexión = último tramo de la C):
 *   1. intervalo constante   → t_i = T_ref
 *   2. velocidad constante   → v = L_ref/T_ref; t_i = L_i/v
 *   3. aceleración constante → a = 2·L_ref/T_ref²; t_i = √(2·L_i/a)
 *
 * Encadenado estricto: cada conexión arranca cuando la anterior llega.
 * `lead` = T_ref de constelación antes de la primera conexión (0,70 s / 0,30 s):
 * no es parte del criterio, pero escala con la familia para que la versión
 * rápida se sienta rápida desde la entrada.
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

const REF_SPECS = [700, 300]; // ms: familia base y familia rápida
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

/* ── cronogramas por familia de referencia ───────────────────────────── */
function schedule(durations, lead) {
  let t = lead;
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
    lead,
    connectTotal: +(t - lead).toFixed(2),
    total: +t.toFixed(2),
  };
}

function buildRef(tRefMs) {
  const lead = tRefMs;
  const tRef = tRefMs / 1000;
  const vRef = refLen / tRef; // px/s
  const aRef = (2 * refLen) / (tRef * tRef); // px/s²

  const timing = {
    1: schedule(segs.map(() => tRefMs), lead),
    2: schedule(segs.map((s) => (s.len / vRef) * 1000), lead),
    3: schedule(segs.map((s) => Math.sqrt((2 * s.len) / aRef) * 1000), lead),
  };

  const metrics = {
    1: {
      vRef: n2(vRef),
      vMin: n2(Math.min(...segs.map((s) => s.len / tRef))),
      vMax: n2(Math.max(...segs.map((s) => s.len / tRef))),
    },
    2: { v: n2(vRef) },
    3: {
      a: n2(aRef),
      vTip: n2(aRef * tRef),
      tMin: n2(Math.min(...timing[3].durations)),
      tMax: n2(Math.max(...timing[3].durations)),
    },
  };

  return { tRefMs, leadMs: lead, refLen, totalLen, timing, metrics };
}

const refs = Object.fromEntries(REF_SPECS.map((ms) => [String(ms), buildRef(ms)]));

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
for (const tRefMs of REF_SPECS) {
  const family = refs[String(tRefMs)];
  const label = `ref ${tRefMs} ms`;
  if (!near(family.timing[1].durations.at(-1), tRefMs)) fail.push(`${label}: criterio 1 ≠ T_ref`);
  if (!near(family.timing[2].durations.at(-1), tRefMs)) fail.push(`${label}: criterio 2 ≠ T_ref`);
  if (!near(family.timing[3].durations.at(-1), tRefMs)) fail.push(`${label}: criterio 3 ≠ T_ref`);
  for (const k of [1, 2, 3]) {
    const t = family.timing[k];
    if (!t.starts.every((s, i) => i === 0 || near(s, t.ends[i - 1], 0.011)))
      fail.push(`${label}: criterio ${k} cadena no contigua`);
    if (t.durations.some((d) => d <= 0)) fail.push(`${label}: criterio ${k} duración ≤ 0`);
  }
}
if (fail.length) {
  console.error(`❌ timing-lab: ${fail.join(" · ")}`);
  process.exit(1);
}

const data = {
  source: "tools/logo/geometry.mjs · CONFIG_AUREA",
  generatedBy: "node tools/logo/timing-lab.mjs",
  tRefs: REF_SPECS,
  holdMs: HOLD_MS,
  refIndex: segs.length - 1,
  refLen,
  totalLen,
  viewBox,
  refs,
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
for (const tRefMs of REF_SPECS) {
  const family = refs[String(tRefMs)];
  console.log(`  ── REF ${(tRefMs / 1000).toFixed(2)} s (entrada ${(family.leadMs / 1000).toFixed(2)} s)`);
  for (const k of [1, 2, 3]) {
    const t = family.timing[k];
    console.log(
      `     criterio ${k}: conexiones ${(t.connectTotal / 1000).toFixed(2)} s ` +
        `· total ${(t.total / 1000).toFixed(2)} s ` +
        `· por link ${(Math.min(...t.durations) / 1000).toFixed(3)}–${(Math.max(...t.durations) / 1000).toFixed(3)} s`
    );
  }
  console.log(`     v_ref ${family.metrics[1].vRef} px/s · a ${family.metrics[3].a} px/s²`);
}
