/**
 * generate-logo.mjs — genera el paquete de assets del logo (issue #54)
 * DESDE geometry.mjs (≡ DOM aprobado PR #53, gateado por
 * verify-dom-fidelity.mjs).
 *
 * Entrega:
 *   · SVG por capas:  background / constellation / spiral / c-triespiral
 *   · variante settled (estado final de la animación: sin estrellas de vértices)
 *   · lockup con tipografía (viewBox 800×940)
 *   · PNG 512/1024/2048/4096 (transparente + dark #050810)
 *   · print 300dpi A4/A3 (transparente + dark)
 *   · favicon 16/32 simplificado (C + supernova, legible <24px) + apple-touch 180
 *   · og-image 1200×630 (dark + nombre)
 *
 * Uso: node tools/logo/generate-logo.mjs [--only-aurea|--only-base]
 *      [--out assets/brand/logo] (o LOGO_OUT env)
 */
import { execFileSync } from "node:child_process";
import { accessSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  config, buildGeometry, buildSky, constellationPoints, segStyle, cPathD, starSpec, seeded,
} from "./geometry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const argv = process.argv.slice(2); // --out se parsea ANTES de fijar OUT
const OUT = resolve(REPO, (argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : process.env.LOGO_OUT) || "assets/brand/logo");
// tmp FUERA del árbol commiteado: si Chrome falla a mitad no deja basura en assets/
const TMP = join(HERE, ".chrome-tmp");
const NIGHT = "#050810";
const DEEP = "#0b1120"; // --bg-1 del HTML aprobado (centro del gradiente)
const HALO = "rgba(0,201,192,.07)"; // halo teal del .stage::before aprobado
const NAME = "CHRISTIAN LUCIANI";
const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  process.env.CHROME_PATH,
].filter(Boolean);

const n2 = (x) => +x.toFixed(2);
const n4 = (x) => +x.toFixed(4);
const pickChrome = () => {
  for (const c of CHROME_CANDIDATES) { try { accessSync(c); return c; } catch { /* next */ } }
  console.error("❌ Chrome no encontrado (CHROME_PATH o /Applications/Google Chrome.app)");
  process.exit(1);
};

function chromeScreenshot(chrome, htmlFile, outPng, { w, h, transparent = false } = {}) {
  mkdirSync(dirname(outPng), { recursive: true });
  const args = [
    "--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--virtual-time-budget=800",
    "--window-size=" + w + "," + h,
    "--screenshot=" + outPng,
    `file://${htmlFile}`,
  ];
  if (transparent) args.push("--default-background-color=00000000");
  execFileSync(chrome, args, { stdio: ["ignore", "ignore", "ignore"] });
}

/* ── capas SVG (estrellas congeladas en pico; halo = glifo de marca) ──

   Tratamiento de halo (observación visual del operador, 2026-09-25):
   · más translúcido y con caída rápida — el halo se difumina con un
     radialGradient (currentColor ⇒ hereda el color del nodo) en vez de un
     relleno sólido difuminado;
   · radio ALEATORIZADO por estrella/nodo con semilla fija (determinista):
     cada nodo tiene su propio halo, no un múltiplo fijo del core;
   · color del halo = color característico del nodo — nodo y estrella se
     integran como una constelación real.
   La GEOMETRÍA (posiciones de cores) sigue gateada ≡ DOM aprobado; el
   halo es decisión de marca aplicada al render. */

const filterDefs = () => `  <defs>
    <radialGradient id="halo-star" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="currentColor" stop-opacity="0.28"/>
      <stop offset="30%" stop-color="currentColor" stop-opacity="0.09"/>
      <stop offset="65%" stop-color="currentColor" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="halo-nova" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="currentColor" stop-opacity="0.16"/>
      <stop offset="40%" stop-color="currentColor" stop-opacity="0.05"/>
      <stop offset="75%" stop-color="currentColor" stop-opacity="0.01"/>
      <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
    </radialGradient>
    <filter id="halo-blur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>`;

const layerBackground = (sky) => {
  if (!sky.length) return "";
  const circles = sky.map((s) =>
    `      <circle cx="${n2(s.cx)}" cy="${n2(s.cy)}" r="${n4(s.r)}" fill="${s.color}" opacity="${n4(s.hi)}"/>`
  ).join("\n");
  return `  <g id="logo-background" data-name="Background">\n${circles}\n  </g>`;
};

/* jerarquía de protagonismo (operador, 2026-09-25): la supernova gana
   presencia (+2pt de core) y las estrellas "bright" de las aristas
   (la punta de la C + rnd>0.72) bajan un punto — no roban protagonismo
   al origen. Es tratamiento de render: el spec de la animación (#53) no
   cambia; #55 puede espejarlo ahí si se quiere. */
const BRAND = {
  novaCoreBoost: 2,       // px de core extra para la supernova
  brightCoreScale: 0.78,  // -22% en las bright de las aristas
  brightHaloScale: 0.85,  // su halo también baja proporcional
};

const layerConstellation = (g, cfg, { settled = false } = {}) => {
  const pts = constellationPoints(g.segs);
  const rows = [];
  pts.forEach((p, j) => {
    if (settled && j > 0) return; // disueltas al ser tocadas por la línea
    const sp = starSpec(j, pts.length, cfg.constellation);
    // radio del halo: aleatorizado por nodo con semilla fija (determinista)
    const rndH = seeded(90210 + j * 977);
    const isBright = j !== 0 && sp.glowR > sp.coreR * 3; // punta + rnd>.72: las grandes de las aristas
    const coreR = j === 0 ? sp.coreR + BRAND.novaCoreBoost
      : isBright ? sp.coreR * BRAND.brightCoreScale : sp.coreR;
    const haloR = n2(j === 0 ? coreR * 5.0
      : coreR * (isBright ? (3.4 + rndH() * 2.6) * BRAND.brightHaloScale : 2.2 + rndH() * 2.4));
    rows.push(`  <g id="logo-star-${j}" data-name="star ${j}">`);
    if (j === 0) rows.push(
      `    <circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="${n2(sp.glowR * 3.2)}" fill="url(#halo-nova)" color="${sp.color}"/>`,
      `    <circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="${n2(sp.glowR * 1.9)}" fill="url(#halo-nova)" color="${sp.color}"/>`
    );
    rows.push(
      `    <circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="${haloR}" fill="url(#halo-star)" color="${sp.color}"/>`,
      `    <circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="${n2(coreR)}" fill="${sp.color}" opacity="${n4(sp.hi)}"/>`,
      `  </g>`
    );
  });
  return rows.join("\n");
};

const layerSpiral = (g, cfg) => {
  const total = g.segs.length;
  const lines = g.segs
    .map((s, i) => ({ s, st: segStyle(i, total, cfg) }))
    .filter(({ st }) => !st.isC)
    .map(({ s, st }) =>
      `      <line x1="${n2(s.a.x)}" y1="${n2(s.a.y)}" x2="${n2(s.b.x)}" y2="${n2(s.b.y)}" stroke="${st.color}" stroke-width="${n4(st.width)}" opacity="${n4(st.opacity)}"/>`
    ).join("\n");
  return `  <g id="logo-spiral" data-name="Spiral" stroke-linecap="round" fill="none">\n${lines}\n  </g>`;
};

const layerC = (g, cfg) => {
  const d = cPathD(g.segs).replace(/\s+/g, " ");
  return `  <g id="logo-c-triespiral" data-name="C TriSpiral" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="${d}" stroke="${cfg.colors.c}" stroke-width="${n2(cfg.cWidth + 6)}" opacity="0.3" filter="url(#halo-blur)"/>
    <path d="${d}" stroke="${cfg.colors.c}" stroke-width="${n2(cfg.cWidth)}" opacity="1"/>
  </g>`;
};

const layerTypography = (baseline) =>
  `  <g id="logo-typography" data-name="Typography" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" font-size="21" font-weight="500" fill="#c9a84c" letter-spacing="8.82">
    <text x="400" y="${n2(baseline)}" text-anchor="middle">${NAME}</text>
  </g>`;

const svgDoc = (g, cfg, sky, { settled = false, typography = false } = {}) => {
  const vbH = typography ? 940 : 800;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- GENERADO por tools/logo/generate-logo.mjs — geometry.mjs ≡ DOM aprobado (PR #53). NO EDITAR A MANO -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 ${vbH}" width="800" height="${vbH}" role="img" aria-label="Logo: triángulo espiral de conocimiento con nodos en cada vértice y una C final de Christian">
  <title>Christian Luciani — espiral de conocimiento</title>
${filterDefs()}
${layerBackground(sky)}
${layerConstellation(g, cfg, { settled })}
${layerSpiral(g, cfg)}
${layerC(g, cfg)}
${typography ? layerTypography(905) : ""}
</svg>`;
};

/* ── wrappers de rasterización (SVG inline; Chrome rasteriza filtros fidelísimos) ── */

const unwrapSvg = (doc) => doc.replace(/^\s*<\?xml[^>]*\?>\s*/, "").replace(/<!--[\s\S]*?-->\s*/, "");

/* ambiente night APROBADO del HTML (PR #53): gradiente radial del body
   (radial 1100×780 sobre stage 620, --bg-1→--bg-0) + halo teal del
   .stage::before (closest-side rgba(0,201,192,.07)→transparent 72%,
   inset -6%). Los PNG dark NO son #050810 plano: esto escalado al mark. */
const nightBody = (markPx, cx = "50%", cy = "50%") =>
  `background:radial-gradient(${Math.round(markPx * 1100 / 620)}px ${Math.round(markPx * 780 / 620)}px at ${cx} ${cy}, ${DEEP} 0%, ${NIGHT} 62%)`;
const nightHalo = (left, top, box) =>
  `#halo{position:fixed;left:${Math.round(left - box * 0.06)}px;top:${Math.round(top - box * 0.06)}px;width:${Math.round(box * 1.12)}px;height:${Math.round(box * 1.12)}px;background:radial-gradient(closest-side, ${HALO}, transparent 72%)}`;

const squarePage = (svgStr, size, bg) => {
  const night = bg === "night";
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;${night ? nightBody(size) : "background:transparent"}}
svg{display:block;position:relative;z-index:1;width:${size}px!important;height:${size}px!important}
${night ? nightHalo(0, 0, size) : ""}</style>
</head><body>${night ? '<div id="halo"></div>' : ""}${unwrapSvg(svgStr)}</body></html>`;
};

/* página print A4/A3 300dpi: logo cuadrado centrado con margen 8% */
const printPage = (svgStr, w, h, bg) => {
  const night = bg === "night";
  const box = Math.min(w, h) - Math.round(h * 0.08 * 2);
  const top = Math.round((h - box) / 2), left = Math.round((w - box) / 2);
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;${night ? nightBody(box, `${left + box / 2}px`, `${top + box / 2}px`) : "background:transparent"}}
svg{position:fixed;top:${top}px;left:${left}px;width:${box}px!important;height:${box}px!important;z-index:1}
${night ? nightHalo(left, top, box) : ""}</style>
</head><body>${night ? '<div id="halo"></div>' : ""}${unwrapSvg(svgStr)}</body></html>`;
};

/* og-image 1200×630: mark grande a la izquierda + nombre/dominio a la derecha */
const ogPage = (svgStr) => {
  const inline = unwrapSvg(svgStr).replace(/<svg /, `<svg id="mark" `);
  const [first, ...rest] = NAME.split(" ");
  return `<!doctype html><html><head><meta charset="utf-8">
<style>
html,body{margin:0;padding:0;overflow:hidden;${nightBody(560, "350px", "315px")}}
#mark{position:fixed;top:35px;left:70px;width:560px!important;height:560px!important;z-index:1}
${nightHalo(70, 35, 560)}
#name{position:fixed;top:236px;left:704px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
  font-size:40px;font-weight:600;letter-spacing:16px;line-height:1.55;color:#c9a84c;white-space:nowrap;z-index:1}
#domain{position:fixed;top:356px;left:706px;font-family:'Fira Code',ui-monospace,monospace;
  font-size:19px;letter-spacing:2px;color:#6b7a8d;white-space:nowrap;z-index:1}
</style></head><body><div id="halo"></div>${inline}<div id="name">${first}${rest.length ? `<br>${rest.join(" ")}` : ""}</div><div id="domain">christianluciani.github.io</div></body></html>`;
};

/* favicon simplificado: la C (firma) + supernova, recortados al bbox con
   padding — el mark completo es ilegible <24px (review fresco PR #58).
   viewBox cuadrado computado del contenido real de la C, no hardcodeado. */
const faviconDoc = (g, cfg) => {
  const pts = constellationPoints(g.segs);
  const nums = cPathD(g.segs).match(/-?[\d.]+/g).map(Number);
  const cPts = [];
  for (let i = 0; i < nums.length; i += 2) cPts.push({ x: nums[i], y: nums[i + 1] });
  const all = [pts[0], ...cPts]; // supernova + los 3 puntos de la C
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const pad = span * 0.14 + 12;
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const side = span + pad * 2;
  const d = cPathD(g.segs).replace(/\s+/g, " ");
  const sp = starSpec(0, pts.length, cfg.constellation);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- GENERADO por tools/logo/generate-logo.mjs — NO EDITAR A MANO -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n2(cx - side / 2)} ${n2(cy - side / 2)} ${n2(side)} ${n2(side)}" role="img" aria-label="C de Christian — favicon simplificado">
  <title>C — espiral de conocimiento (favicon)</title>
${filterDefs()}
  <g id="logo-supernova" data-name="Supernova">
    <circle cx="${n2(pts[0].x)}" cy="${n2(pts[0].y)}" r="${n2(sp.glowR * 3.2)}" fill="url(#halo-nova)" color="${sp.color}"/>
    <circle cx="${n2(pts[0].x)}" cy="${n2(pts[0].y)}" r="${n2(sp.glowR * 1.9)}" fill="url(#halo-nova)" color="${sp.color}"/>
    <circle cx="${n2(pts[0].x)}" cy="${n2(pts[0].y)}" r="${n2(sp.coreR + BRAND.novaCoreBoost)}" fill="${sp.color}" opacity="1"/>
  </g>
  <g id="logo-c-triespiral" data-name="C TriSpiral" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="${d}" stroke="${cfg.colors.c}" stroke-width="${n2(cfg.cWidth + 6)}" opacity="0.3" filter="url(#halo-blur)"/>
    <path d="${d}" stroke="${cfg.colors.c}" stroke-width="${n2(cfg.cWidth)}" opacity="1"/>
  </g>
</svg>`;
};

function main() {
  const versions = argv.includes("--only-base") ? ["base"] : argv.includes("--only-aurea") ? ["aurea"] : ["aurea", "base"];
  const chrome = pickChrome();
  mkdirSync(OUT, { recursive: true });
  mkdirSync(TMP, { recursive: true });

  for (const version of versions) {
    const cfg = config(version);
    const g = buildGeometry(cfg.geometry);
    const sky = buildSky(cfg);
    const written = [];

    const shoot = (name, html, { w, h = w, transparent }) => {
      const tmpHtml = join(TMP, name + ".html");
      writeFileSync(tmpHtml, html, "utf8");
      chromeScreenshot(chrome, tmpHtml, join(OUT, name), { w, h, transparent });
      written.push(name);
    };

    /* SVG masters */
    const layersSvg = svgDoc(g, cfg, sky, { settled: false });
    const settledSvg = svgDoc(g, cfg, sky, { settled: true });
    const lockupSvg = svgDoc(g, cfg, sky, { settled: false, typography: true });
    const favSvg = faviconDoc(g, cfg);
    for (const [name, doc] of [
      [`logo-${version}-layers.svg`, layersSvg],
      [`logo-${version}-settled.svg`, settledSvg],
      [`logo-${version}-lockup.svg`, lockupSvg],
      [`favicon-${version}.svg`, favSvg],
    ]) {
      writeFileSync(join(OUT, name), doc, "utf8");
      written.push(name);
    }

    /* master PNG 512..4096 (full, transparente + dark) */
    for (const s of [512, 1024, 2048, 4096]) {
      shoot(`logo-${version}-${s}.png`, squarePage(layersSvg, s, "transparent"), { w: s, transparent: true });
      shoot(`logo-${version}-${s}-dark.png`, squarePage(layersSvg, s, "night"), { w: s, transparent: false });
    }

    /* print 300dpi A4/A3 (transparente + dark) */
    for (const [label, { w, h }] of [["print-a4", { w: 2480, h: 3508 }], ["print-a3", { w: 3508, h: 4961 }]]) {
      shoot(`logo-${version}-${label}.png`, printPage(layersSvg, w, h, "transparent"), { w, h, transparent: true });
      shoot(`logo-${version}-${label}-dark.png`, printPage(layersSvg, w, h, "night"), { w, h, transparent: false });
    }

    /* favicon simplificado (16/32: legible por diseño, no por suerte) + apple-touch */
    for (const s of [16, 32]) {
      shoot(`favicon-${version}-${s}.png`, squarePage(favSvg, s, "transparent"), { w: s, transparent: true });
    }
    shoot(`apple-touch-icon-${version}.png`, squarePage(settledSvg, 180, "night"), { w: 180, transparent: false });

    /* og-image 1200×630 (dark + nombre) — usa el MARK puro (sin typography) */
    shoot(`og-image-${version}.png`, ogPage(layersSvg), { w: 1200, h: 630, transparent: false });

    console.log(`✅ ${version}: ${written.length} assets → ${OUT}`);
  }

  rmSync(TMP, { recursive: true, force: true });
  console.log(`🎨 assets listos en ${OUT}`);
}

process.on("unhandledRejection", (e) => { console.error(e); process.exit(1); });
main();