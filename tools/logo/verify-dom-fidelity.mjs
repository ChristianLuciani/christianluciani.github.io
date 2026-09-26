/**
 * verify-dom-fidelity.mjs — gate de fidelidad del puerto geometry.mjs.
 *
 * Carga los HTMLs aprobados (PR #53) en Chrome headless y compara la
 * geometría RENDERIZADA contra geometry.mjs, en dos modos:
 *   · reduced (--force-prefers-reduced-motion): estado final limpio —
 *     segmentos del espiral (coordenadas + stroke/width/opacity exactos)
 *     y el path de la C (áurea). Sin hot-lines ni constelación.
 *   · normal (virtual-time): cielo (ambient + galaxia) y constelación
 *     de vértices — posición/radio/fill exactos.
 *
 * Cualquier drift del puerto ⇒ exit 1 con la diferencia exacta.
 *
 * Uso: node tools/logo/verify-dom-fidelity.mjs
 */
import { execFileSync } from "node:child_process";
import { accessSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONFIG_AUREA, CONFIG_BASE, buildGeometry, buildSky, constellationPoints,
  segStyle, cPathD, lerpColor,
} from "./geometry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  process.env.CHROME_PATH,
].filter(Boolean);

const round = (n) => Math.round(n * 100) / 100;
const num = (s) => (s == null ? null : parseFloat(s));
const parseAttrs = (tag) => {
  const attrs = {};
  for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
};

function dumpDom(chrome, file, { reduced = false } = {}) {
  const args = [
    "--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
    "--virtual-time-budget=1500", "--dump-dom", `file://${file}`,
  ];
  if (reduced) args.push("--force-prefers-reduced-motion");
  return execFileSync(chrome, args, {
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

const extractTags = (dump, tagName) =>
  [...dump.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "g"))].map((m) => parseAttrs(m[0]));

let failed = false;
function fail(msg) {
  console.error(`❌ FIDELIDAD: ${msg}`);
  process.exitCode = 1;
  failed = true;
}

/* estilo tolerante: comparar por diff ≤ 0.05 (precisión de serialización) */
const close = (a, b) => a != null && b != null && Math.abs(a - b) <= 0.05;

function styleValue(style, prop) {
  const m = style?.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i"));
  return m ? m[1].trim() : undefined;
}
/* normaliza “rgb(1, 2, 3)” → “rgb(1,2,3)” */
const normColor = (c) => c?.replace(/\s+/g, "");

/* chrome serializa colores como rgb(r,g,b); mi expected ya es rgb(...) */
function verify(version, htmlPath) {
  const cfg = version === "base" ? CONFIG_BASE : CONFIG_AUREA;
  const chrome = CHROME_CANDIDATES.find((c) => { try { accessSync(c); return true; } catch { return false; } });
  if (!chrome) { console.error("❌ Chrome no encontrado"); process.exit(1); }

  const g = buildGeometry(cfg.geometry);
  const pts = constellationPoints(g.segs);
  const sky = buildSky(cfg);
  const total = g.segs.length;
  const file = resolve(htmlPath);

  /* ── modo reduced: geometría + estilos, sin hot-lines ── */
  const dumpR = dumpDom(chrome, file, { reduced: true });
  const linesR = extractTags(dumpR, "line").filter((a) => a.x1 != null);
  const expected = new Map();
  for (const s of g.segs) {
    const st = segStyle(s.idx, total, cfg);
    if (version === "aurea" && st.isC) continue; // en áurea la C es un path
    expected.set(`${round(s.a.x)},${round(s.a.y)},${round(s.b.x)},${round(s.b.y)}`, st);
  }
  const domSegs = new Map();
  for (const a of linesR) { // first-wins: las glow copies (appended después) no pisan
    const key = `${round(num(a.x1))},${round(num(a.y1))},${round(num(a.x2))},${round(num(a.y2))}`;
    if (!domSegs.has(key)) domSegs.set(key, a);
  }
  if (domSegs.size !== expected.size)
    fail(`${version}: espiral — DOM tiene ${domSegs.size} líneas únicas, esperadas ${expected.size}`);
  else console.log(`✅ ${version}: espiral ${expected.size} líneas únicas — coordenadas coinciden`);
  let styleOk = 0;
  for (const [key, st] of expected) {
    const a = domSegs.get(key);
    if (!a) { fail(`${version}: falta la línea ${key}`); continue; }
    if (normColor(a.stroke) !== normColor(st.color) || !close(num(a["stroke-width"]), st.width) || !close(num(a.opacity), st.opacity))
      fail(`${version}: estilo de línea ${key}: DOM=${a.stroke}/${a["stroke-width"]}/${a.opacity} esperado=${st.color}/${st.width}/${st.opacity}`);
    else styleOk++;
  }
  if (styleOk === expected.size)
    console.log(`✅ ${version}: stroke/width/opacity de cada tramo coinciden (rampa ${lerpColor(cfg.colors.spiralFrom, cfg.colors.spiralTo, 0)} → ${lerpColor(cfg.colors.spiralFrom, cfg.colors.spiralTo, 1)})`);

  if (version === "aurea") {
    // el path real lleva stroke propio; el glow (appended antes en el grupo)
    // hereda stroke del CSS y no lo tiene ⇒ filtramos por stroke attr
    const paths = extractTags(dumpR, "path").filter((a) => a.d?.startsWith("M ") && a.stroke != null);
    const want = cPathD(g.segs).replace(/\s+/g, "");
    const cPath = paths.find((a) => a.d.replace(/\s+/g, "") === want);
    if (!cPath) fail(`${version}: path de la C no encontrado en el DOM`);
    else if (normColor(cPath.stroke) !== normColor(cfg.colors.c) || !close(num(cPath["stroke-width"]), cfg.cWidth))
      fail(`${version}: estilo del path C: DOM=${cPath.stroke}/${cPath["stroke-width"]} esperado=${cfg.colors.c}/${cfg.cWidth}`);
    else console.log(`✅ ${version}: path de la C (gold ${cfg.colors.c}, width ${cfg.cWidth}) coincide`);
  }

  /* ── modo normal: cielo + constelación ── */
  const dump = dumpDom(chrome, file);
  const circles = extractTags(dump, "circle");
  const coreCircles = circles.filter((a) => a.class?.includes("core"));
  const domCores = new Set(coreCircles.map((a) => `${round(num(a.cx))},${round(num(a.cy))}`));
  const missing = pts.map((p) => `${round(p.x)},${round(p.y)}`).filter((k) => !domCores.has(k));
  if (missing.length) fail(`${version}: constelación — faltan ${missing.length} núcleos (ej: ${missing[0]})`);
  else console.log(`✅ ${version}: ${pts.length} núcleos de constelación en sus vértices (centro + supernova)`);

  const ambCircles = circles.filter((a) => a.class?.includes("ambient"));
  const domSky = new Map(ambCircles.map((a) => [
    `${round(num(a.cx))},${round(num(a.cy))},${round(num(a.r))}`,
    normColor(styleValue(a.style, "fill")),
  ]));
  let skyMiss = 0, skyFillMiss = 0;
  for (const s of sky) {
    const key = `${round(s.cx)},${round(s.cy)},${round(s.r)}`;
    const got = domSky.get(key);
    if (got === undefined) { skyMiss++; continue; }
    if (got !== normColor(lerpColor(s.color, s.color, 0))) skyFillMiss++;
  }
  if (skyMiss || skyFillMiss)
    fail(`${version}: cielo — ${skyMiss} estrellas faltantes, ${skyFillMiss} fills divergentes (de ${sky.length})`);
  else console.log(`✅ ${version}: cielo ${sky.length} estrellas (ambient+galaxia) — posición/radio/fill idénticos al DOM`);
}

const root = resolve(HERE, "../..");
for (const [version, file] of [
  ["aurea", "proposals/logo-triangulo-espiral/aurea7.html"],
  ["base", "proposals/logo-triangulo-espiral/index.html"],
]) {
  try { verify(version, join(root, file)); } catch (e) { fail(`${version}: ${e.message}`); }
}
console.log(process.exitCode ? "🚫 FIDELIDAD: el puerto diverge del DOM aprobado" : "🏆 FIDELIDAD: geometry.mjs ≡ DOM aprobado (PR #53)");