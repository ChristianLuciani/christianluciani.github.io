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
 *   · favicon 16/32 + apple-touch 180 (settled)
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
  config, buildGeometry, buildSky, constellationPoints, segStyle, cPathD, starSpec,
} from "./geometry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const OUT = resolve(REPO, process.env.LOGO_OUT || "assets/brand/logo");
const TMP = join(OUT, ".chrome-tmp");
const NIGHT = "#050810";
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

/* ── capas SVG (estrellas congeladas en pico: fotograma de máxima intensidad) ── */

const filterDefs = () => `  <defs>
    <filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8"/></filter>
    <filter id="glow2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.5"/></filter>
  </defs>`;

const layerBackground = (sky) => {
  if (!sky.length) return "";
  const circles = sky.map((s) =>
    `      <circle cx="${n2(s.cx)}" cy="${n2(s.cy)}" r="${n4(s.r)}" fill="${s.color}" opacity="${n4(s.hi)}"/>`
  ).join("\n");
  return `  <g id="logo-background" data-name="Background">\n${circles}\n  </g>`;
};

const layerConstellation = (g, cfg, { settled = false } = {}) => {
  const pts = constellationPoints(g.segs);
  const rows = [];
  pts.forEach((p, j) => {
    if (settled && j > 0) return; // disueltas al ser tocadas por la línea
    const sp = starSpec(j, pts.length, cfg.constellation);
    rows.push(`  <g id="logo-star-${j}" data-name="star ${j}">`);
    if (j === 0) rows.push(`    <circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="${n2(sp.glowR * 2)}" fill="${sp.color}" opacity="0.2" filter="url(#glow2)"/>`);
    rows.push(
      `    <circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="${n2(sp.glowR)}" fill="${sp.color}" opacity="${n4(sp.hiG)}" filter="url(#glow2)"/>`,
      `    <circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="${n2(sp.coreR)}" fill="${sp.color}" opacity="${n4(sp.hi)}"/>`,
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
    <path d="${d}" stroke="${cfg.colors.c}" stroke-width="${n2(cfg.cWidth + 6)}" opacity="0.5" filter="url(#glow)"/>
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

const squarePage = (svgStr, size, bg) => `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:${bg === "transparent" ? "transparent" : bg}}
svg{display:block;width:${size}px!important;height:${size}px!important}</style>
</head><body>${unwrapSvg(svgStr)}</body></html>`;

/* página print A4/A3 300dpi: logo cuadrado centrado con margen 8% */
const printPage = (svgStr, w, h, bg) => {
  const box = Math.min(w, h) - Math.round(h * 0.08 * 2);
  const top = Math.round((h - box) / 2), left = Math.round((w - box) / 2);
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:${bg === "transparent" ? "transparent" : bg}}
svg{position:fixed;top:${top}px;left:${left}px;width:${box}px!important;height:${box}px!important}</style>
</head><body>${unwrapSvg(svgStr)}</body></html>`;
};

/* og-image 1200×630: mark grande a la izquierda + nombre/dominio a la derecha */
const ogPage = (svgStr) => {
  const inline = unwrapSvg(svgStr).replace(/<svg /, `<svg id="mark" `);
  return `<!doctype html><html><head><meta charset="utf-8">
<style>
html,body{margin:0;padding:0;background:${NIGHT};overflow:hidden}
#mark{position:fixed;top:35px;left:70px;width:560px!important;height:560px!important}
#name{position:fixed;top:236px;left:704px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
  font-size:40px;font-weight:600;letter-spacing:16px;line-height:1.55;color:#c9a84c;white-space:nowrap}
#domain{position:fixed;top:356px;left:706px;font-family:'Fira Code',ui-monospace,monospace;
  font-size:19px;letter-spacing:2px;color:#6b7a8d;white-space:nowrap}
</style></head><body>${inline}<div id="name">CHRISTIAN<br>LUCIANI</div><div id="domain">christianluciani.github.io</div></body></html>`;
};

function main() {
  const argv = process.argv.slice(2);
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
    for (const [name, doc] of [
      [`logo-${version}-layers.svg`, layersSvg],
      [`logo-${version}-settled.svg`, settledSvg],
      [`logo-${version}-lockup.svg`, lockupSvg],
    ]) {
      writeFileSync(join(OUT, name), doc, "utf8");
      written.push(name);
    }

    /* master PNG 512..4096 (full, transparente + dark) */
    for (const s of [512, 1024, 2048, 4096]) {
      shoot(`logo-${version}-${s}.png`, squarePage(layersSvg, s, "transparent"), { w: s, transparent: true });
      shoot(`logo-${version}-${s}-dark.png`, squarePage(layersSvg, s, NIGHT), { w: s, transparent: false });
    }

    /* print 300dpi A4/A3 (transparente + dark) */
    for (const [label, { w, h }] of [["print-a4", { w: 2480, h: 3508 }], ["print-a3", { w: 3508, h: 4961 }]]) {
      shoot(`logo-${version}-${label}.png`, printPage(layersSvg, w, h, "transparent"), { w, h, transparent: true });
      shoot(`logo-${version}-${label}-dark.png`, printPage(layersSvg, w, h, NIGHT), { w, h, transparent: false });
    }

    /* favicon + apple-touch (settled: limpio en tamaños chicos) */
    for (const s of [16, 32]) {
      shoot(`favicon-${version}-${s}.png`, squarePage(settledSvg, s, "transparent"), { w: s, transparent: true });
    }
    shoot(`apple-touch-icon-${version}.png`, squarePage(settledSvg, 180, NIGHT), { w: 180, transparent: false });

    /* og-image 1200×630 (dark + nombre) — usa el MARK puro (sin typography) */
    shoot(`og-image-${version}.png`, ogPage(layersSvg), { w: 1200, h: 630, transparent: false });

    console.log(`✅ ${version}: ${written.length} assets → ${OUT}`);
  }

  rmSync(TMP, { recursive: true, force: true });
  console.log(`🎨 assets listos en ${OUT}`);
}

process.on("unhandledRejection", (e) => { console.error(e); process.exit(1); });
main();