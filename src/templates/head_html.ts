import {
  absoluteAssetUrl,
  assetAttrsFor,
} from "../ts/assets/url.ts";

/** Origen canónico del sitio (OG necesita URL absoluta, no relativa). */
const SITE_ORIGIN = "https://christianluciani.github.io";

/**
 * GENERADO por herramientas/extract-monolith (one-shot) desde index.html (Fase-1).
 * NO editar a mano el contenido extraído; editar la fuente original y regenerar,
 * o editar directamente si es un cambio intencional de contenido.
 * HEAD: doctype, meta, JSON-LD, fonts, manual de estilo, <style> global, tag del entry module.
 */

export function headHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Christian Luciani — Museo de una Trayectoria</title>
<meta name="description" content="Christian Luciani — Investigador independiente en Cuenca, Ecuador. Creador de Kontablo, ontología contable universal basada en grafos para la economía agéntica. Física, inteligencia sintética y tecnología educativa.">
<meta name="author" content="Christian Luciani">
<meta property="og:type" content="profile">
<meta property="og:title" content="Christian Luciani — Investigador independiente">
<meta property="og:description" content="Creador de Kontablo, ontología contable universal para la economía agéntica. Investigador independiente en Cuenca, Ecuador.">
<meta property="og:url" content="https://christianluciani.github.io/">
<meta property="og:image" content="${absoluteAssetUrl("/assets/og-image.png", SITE_ORIGIN)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Christian Luciani — Investigador independiente">
<meta name="twitter:description" content="Creador de Kontablo, ontología contable universal para la economía agéntica. Física, inteligencia sintética y tecnología educativa.">
<meta name="twitter:image" content="${absoluteAssetUrl("/assets/og-image.png", SITE_ORIGIN)}">
<link rel="icon" type="image/svg+xml" ${assetAttrsFor("href", "/assets/brand/favicon-aurea.svg")}>
<link rel="icon" type="image/png" sizes="32x32" ${assetAttrsFor("href", "/assets/brand/favicon-aurea-32.png")}>
<link rel="apple-touch-icon" sizes="180x180" ${assetAttrsFor("href", "/assets/brand/apple-touch-icon-aurea.png")}>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Christian Luciani",
  "givenName": "Christian",
  "familyName": "Luciani",
  "jobTitle": "Independent Researcher",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Cuenca",
    "addressCountry": "Ecuador"
  },
  "identifier": {
    "@type": "PropertyValue",
    "propertyID": "ORCID",
    "value": "0000-0002-6955-5384"
  },
  "url": "https://christianluciani.github.io/",
  "sameAs": [
    "https://orcid.org/0000-0002-6955-5384",
    "https://scholar.google.com/citations?user=7GbpmSQAAAAJ&hl=en",
    "https://github.com/ChristianLuciani",
    "https://www.linkedin.com/in/christian-luciani",
    "https://www.researchgate.net/profile/Christian-Luciani"
  ]
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ScholarlyArticle",
      "headline": "Kontablo: A Graph-Based Universal Accounting Ontology for the M2M Agentic Economy",
      "author": { "@type": "Person", "name": "Christian Luciani" },
      "datePublished": "2026",
      "publisher": "Zenodo / SSRN",
      "identifier": "https://doi.org/10.5281/zenodo.20738795",
      "url": "https://doi.org/10.5281/zenodo.20738795"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "Hydrochars from Lignocellulosic Residues for Green Electronics, Environmental Remediation, Energy and Agricultural Applications",
      "author": [
        { "@type": "Person", "name": "Landázuri et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2023",
      "publisher": "ResearchGate",
      "identifier": "https://www.researchgate.net/publication/383276828",
      "url": "https://www.researchgate.net/publication/383276828"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "Highly efficient caffeine-based PVA composite film for UV shielding",
      "author": [
        { "@type": "Person", "name": "Trujillo Galarza et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2025",
      "isPartOf": { "@type": "Periodical", "name": "Carbon Trends" },
      "identifier": "https://doi.org/10.1016/j.cartre.2025.100502",
      "url": "https://doi.org/10.1016/j.cartre.2025.100502"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "Tunable Dielectric Carbon Materials from Hydrothermally Nanostructured Organic Carbon Sources",
      "author": [
        { "@type": "Person", "name": "Landázuri et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2025",
      "isPartOf": { "@type": "Periodical", "name": "ChemPhysChem" },
      "identifier": "https://doi.org/10.1002/cphc.202400711",
      "url": "https://doi.org/10.1002/cphc.202400711"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "Optimization of microfibrillated cellulose isolation from cocoa pod husk via mild oxalic acid hydrolysis",
      "author": [
        { "@type": "Person", "name": "Zambrano et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2023",
      "isPartOf": { "@type": "Periodical", "name": "Heliyon" },
      "identifier": "https://doi.org/10.1016/j.heliyon.2023.e17258",
      "url": "https://doi.org/10.1016/j.heliyon.2023.e17258"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "Optimization of Microcrystalline Cellulose Isolation from Cocoa Pod Husk via Mild Oxalic Acid Hydrolysis",
      "author": [
        { "@type": "Person", "name": "Zambrano et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2022",
      "isPartOf": { "@type": "Periodical", "name": "SSRN Electronic Journal" },
      "identifier": "https://doi.org/10.2139/ssrn.4307097",
      "url": "https://doi.org/10.2139/ssrn.4307097"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "Ivory Nut (Phytelephas equatorialis) Residues: Chemical Composition for Applications in Health Care, Industry and Environmental Remediation — Towards Sustainability",
      "author": [
        { "@type": "Person", "name": "Orejuela Escobar et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2022",
      "publisher": "AIChE Annual Meeting",
      "url": "https://aiche.confex.com/aiche/2022/meetingapp.cgi/Paper/649030"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "Neural control on multiple time scales: Insights from human stick balancing",
      "author": [
        { "@type": "Person", "name": "Cabrera et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2006",
      "isPartOf": { "@type": "Periodical", "name": "Condensed Matter Physics" },
      "identifier": "https://doi.org/10.5488/CMP.9.2.373",
      "url": "https://doi.org/10.5488/CMP.9.2.373"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "Balancing with Noise and Delay",
      "author": [
        { "@type": "Person", "name": "Hosaka et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2006",
      "isPartOf": { "@type": "Periodical", "name": "Progress of Theoretical Physics Supplement" },
      "identifier": "https://doi.org/10.1143/PTPS.161.314",
      "url": "https://doi.org/10.1143/PTPS.161.314"
    }
  ]
}
</script>

<!--
  MANUAL DE ESTILO — LABORATORIO (issue #89, opción A)
  Tokens y componentes derivan de proposals/estilo-lab/estilo.css.
  · Paleta: --bg-0/--bg-1 · --ink/--ink-dim/--ink-meta · --line/--line-soft
    --teal/--gold/--ice/--coral. Los nombres viejos (--night, --deep, --surface,
    --teal, --gold, --text, --muted, --border) son ALIAS de los nuevos.
  · Tipografía: stacks del sistema (0 fuentes web). --font-body/--font-display =
    ui-sans-serif; --font-mono = ui-monospace. Sin Playfair, Fira ni Cormorant.
  · Superficie: contenedor 1220px, tarjetas borde 1px --line-soft radio 15px,
    chips radio 99px, grillas 3/2/1, HUD superior sticky.
  · --ink-meta (#75849a, AA 4,79:1 sobre tarjeta) es el color de TODO texto
    chico; --ink-faint (#5b6a7e) sólo decora.
-->

<style>
/* ══════════════════════════════════════════════
   TOKENS — lenguaje del Laboratorio (issue #89, opción A)
   Una paleta, dos nombres: los tokens viejos son alias de los nuevos
   para no romper las reglas históricas. Sin fuentes web: stacks del sistema.
══════════════════════════════════════════════ */
:root {
  /* fondo y tinta (laboratorio) */
  --bg-0: #050810;
  --bg-1: #0b1120;
  --ink: #e7edf6;
  --ink-dim: #8b9bb0;
  --ink-meta: #75849a;   /* AA 4,79:1 sobre tarjeta — TODO texto chico/label */
  --ink-faint: #5b6a7e;  /* solo decoración (3,30–3,63:1, no es color de texto) */
  --line: rgba(140, 170, 200, 0.14);
  --line-soft: rgba(140, 170, 200, 0.08);

  /* acentos compartidos */
  --teal: #00c9c0;
  --gold: #c9a84c;
  --ice: #7ad7ff;
  --coral: #ff8a70;

  /* tipografía: stacks del sistema, 0 requests a fuentes */
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
  --font-display: var(--font-sans);
  --font-body: var(--font-sans);

  /* alias históricos (mismo valor, nombres viejos conservados) */
  --night: var(--bg-0);
  --deep: var(--bg-1);
  --surface: #111827;
  --text: var(--ink);
  --muted: var(--ink-meta); /* el #6b7a8d caía a 4,05 sobre tarjeta: retirado */
  --border: var(--line);
  --sans: var(--font-sans);
  --mono: var(--font-mono);
  --display: var(--font-display);

  /* superficie */
  --radius: 15px;
  --radius-chip: 99px;
  --card: rgba(255, 255, 255, 0.016);
  --container: 1220px;
}

/* ══════════════════════════════════════════════
   RESET Y BASE
══════════════════════════════════════════════ */
* { margin:0; padding:0; box-sizing:border-box; }
html { scroll-behavior:smooth; -webkit-text-size-adjust:100%; }
html, body { min-height:100%; }
body {
  background:
    radial-gradient(1000px 680px at 12% -5%, rgba(0,201,192,.07), transparent 62%),
    radial-gradient(900px 620px at 92% 0%, rgba(201,168,76,.06), transparent 60%),
    linear-gradient(180deg, var(--bg-1) 0%, var(--bg-0) 62%);
  background-attachment:fixed;
  color:var(--ink);
  font-family:var(--font-body);
  font-size:16px;
  line-height:1.55;
  overflow-x:clip;
  cursor:auto;
  -webkit-font-smoothing:antialiased;
}
img, svg, canvas { max-width:100%; }
a { color:inherit; }
:focus-visible { outline:2px solid var(--teal); outline-offset:3px; }
::selection { background:rgba(0,201,192,.28); color:var(--ink); }

/* ══════════════════════════════════════════════
   SKIP-TO-CONTENT LINK
══════════════════════════════════════════════ */
.skip-link {
  position:absolute; top:-100%; left:1rem;
  padding:.55rem 1rem;
  background:var(--teal); color:var(--bg-0);
  font-family:var(--font-mono); font-size:.7rem; font-weight:500;
  letter-spacing:.14em; text-transform:uppercase;
  text-decoration:none; border-radius:6px;
  z-index:10000;
}
.skip-link:focus { top:1rem; }

/* ══════════════════════════════════════════════
   BARRA DE PROGRESO
══════════════════════════════════════════════ */
#progress {
  position:fixed; top:0; left:0;
  height:2px; background:var(--teal);
  z-index:300;
  box-shadow:0 0 8px var(--teal);
  transition:width .05s;
}

/* ══════════════════════════════════════════════
   HUD / NAVEGACIÓN SUPERIOR
   Número + label siempre visibles; en móvil colapsa a marca + sala actual.
══════════════════════════════════════════════ */
.hud {
  position:sticky; top:0; z-index:200;
  border-bottom:1px solid var(--line-soft);
  background:rgba(5,8,16,.88);
  -webkit-backdrop-filter:blur(12px);
  backdrop-filter:blur(12px);
}
.hud-inner {
  width:min(var(--container), 100%);
  margin:0 auto;
  padding:10px clamp(18px,4vw,52px) 10px clamp(62px,5vw,78px);
  display:flex; align-items:center; gap:18px;
}
.brand {
  display:inline-flex; align-items:baseline; gap:8px;
  text-decoration:none; flex:none;
}
.brand-mark { color:var(--teal); font-size:13px; }
.brand-name {
  font-family:var(--font-mono); font-size:10.5px;
  letter-spacing:.16em; text-transform:uppercase; color:var(--ink-dim);
}
#nav.hud-nav {
  display:flex; align-items:center; gap:2px;
  margin-left:auto; overflow-x:auto;
  scrollbar-width:none;
}
.hud-nav::-webkit-scrollbar { display:none; }
.nav-dot {
  display:inline-flex; align-items:baseline; gap:6px;
  padding:5px 6px; border-radius:var(--radius-chip);
  font-family:var(--font-mono); font-size:10.5px;
  letter-spacing:.04em; text-decoration:none;
  color:var(--ink-dim); white-space:nowrap;
  transition:color .18s, background .18s;
}
.nav-dot .n { color:var(--ink-meta); font-size:9px; letter-spacing:.1em; }
/* La fila del HUD recorta el overflow: el anillo de foco va por dentro. */
.nav-dot:focus-visible { outline-offset:-2px; }
.nav-dot:hover { color:var(--ink); background:rgba(255,255,255,.03); }
.nav-dot.active, .nav-dot[aria-current="true"] {
  color:var(--teal);
  background:rgba(0,201,192,.12);
}
.nav-dot.active .n, .nav-dot[aria-current="true"] .n { color:var(--teal); opacity:.75; }
.hud-current {
  display:none;
  padding:4px 9px; border:1px solid var(--line); border-radius:var(--radius-chip);
  color:var(--ink-meta); font-family:var(--font-mono);
  font-size:9.5px; letter-spacing:.1em; text-transform:uppercase;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.hud-side { display:flex; align-items:center; gap:8px; flex:none; }

/* Botones de la HUD (idioma / sonido) */
#btn-lang, #btn-sound {
  position:static; opacity:1; animation:none;
  font-family:var(--font-mono); cursor:pointer;
  color:var(--ink-meta); background:none;
  transition:color .18s, background .18s, border-color .18s;
}
#btn-lang {
  padding:4px 9px; border:1px solid var(--line); border-radius:var(--radius-chip);
  font-size:9.5px; letter-spacing:.1em; text-transform:uppercase;
}
#btn-lang:hover { color:var(--teal); border-color:rgba(0,201,192,.45); }
#btn-sound {
  width:30px; height:30px; border:1px solid transparent; border-radius:var(--radius-chip);
  display:flex; align-items:center; justify-content:center; padding:0;
}
#btn-sound:hover { color:var(--teal); background:rgba(255,255,255,.03); }
#btn-sound .si-off { display:none; }
#btn-sound.muted { opacity:.5; }
#btn-sound.muted .si-on { display:none; }
#btn-sound.muted .si-off { display:block; }

/* ══════════════════════════════════════════════
   LOADER + FRACTAL LOGO
   Estado 1 (cargando): centrado, grande, girando
   Estado 2 (cargado):  esquina sup-izq, 36px, fijo
══════════════════════════════════════════════ */
#loader {
  position:fixed; inset:0;
  background:var(--bg-0);
  z-index:1000;
  display:flex; align-items:center; justify-content:center;
  flex-direction:column;
  transition:opacity .9s ease, visibility .9s;
}
#loader.hidden { opacity:0; visibility:hidden; }

#brand-logo {
  --brand-size: min(50vmin, 440px);
  position:fixed;
  z-index:1001;
  width:var(--brand-size);
  height:var(--brand-size);
  top:calc(50vh - var(--brand-size));
  left:50%;
  transform:translateX(-50%);
  border:0; padding:0; margin:0; background:none; font:inherit; color:inherit;
  appearance:none;
  transition:
    top    1s cubic-bezier(.16,1,.3,1),
    left   1s cubic-bezier(.16,1,.3,1),
    width  1s cubic-bezier(.16,1,.3,1),
    height 1s cubic-bezier(.16,1,.3,1),
    transform 1s cubic-bezier(.16,1,.3,1),
    filter 1s;
  pointer-events:none;
}
#brand-logo svg { display:block; width:100%; height:100%; overflow:visible; }
#brand-logo:focus-visible { outline:2px solid var(--teal); outline-offset:4px; border-radius:8px; }
#brand-logo .brand-mini { display:none; }
#brand-logo.minimized {
  top:8px;
  left:max(14px, calc((100vw - 1220px) / 2 + 20px));
  width:36px;
  height:36px;
  transform:none;
  filter:brightness(.9);
  pointer-events:auto;
  cursor:pointer;
}
#brand-logo.minimized .brand-full { display:none; }
#brand-logo.minimized .brand-mini { display:block; }
#brand-logo.minimized:hover { filter:brightness(1.3) drop-shadow(0 0 6px var(--teal)); }
#brand-logo { transition:filter .14s ease-out; }
#brand-logo.is-tick { filter:drop-shadow(0 0 8px rgba(201,168,76,.4)); }

#brand-logo .seg { fill:none; stroke-linecap:round; stroke-linejoin:round; }
#brand-logo .ghost { fill:none; stroke:var(--gold); stroke-width:1.4; stroke-dasharray:3 9; stroke-linecap:round; opacity:0; }
#brand-logo .constellation, #brand-logo .sky { opacity:0; animation:brandFadeIn .8s ease forwards; }
#brand-logo .star { transform-box:fill-box; transform-origin:center; }
#brand-logo .star .core { animation:brandTwinkle var(--dc,2.7s) ease-in-out infinite; }
#brand-logo .star .glow { opacity:.16; filter:url(#soft2); animation:brandTwinkle var(--dg,3.4s) ease-in-out infinite; }
#brand-logo .ambient { animation:brandTwinkle var(--da,4.2s) ease-in-out infinite; }
#brand-logo .c-glow { fill:none; stroke:var(--gold); stroke-linecap:round; filter:url(#soft); }
#brand-logo .settle-on .c-glow path { animation:brandBreathe 3.6s ease-in-out infinite; }
@keyframes brandTwinkle { 0%,100%{opacity:var(--lo,.4)} 50%{opacity:var(--hi,1)} }
@keyframes brandFadeIn { to { opacity:1 } }
@keyframes brandBreathe { 0%,100%{opacity:.28} 50%{opacity:.42} }

#intro-block {
  width:100%;
  max-width:min(820px, 90vw);
  text-align:center;
  padding:0 1.5rem;
  margin-top:270px;
  pointer-events:none;
}
/* Pantallas bajas: el fractal no se sale del viewport ni el texto se corta. */
@media (max-height: 600px) {
  #brand-logo {
    --brand-size: min(46vmin, 320px);
    top:calc(50vh - var(--brand-size));
  }
  #intro-block { margin-top:190px; }
}
.intro-phrase {
  margin:0 auto;
  max-width:680px;
  min-height:4.2rem;
  display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:center;
  font-family:var(--font-display);
  font-size:clamp(1.4rem, 3.6vw, 2.4rem);
  line-height:1.4;
  color:var(--ink);
  opacity:0;
  transform:translateY(6px);
  transition:opacity 1.1s ease, transform 1.1s ease;
}
.p-word { margin-right:.3em; opacity:.32; transition:opacity .3s ease, color .3s ease; }
.p-word--focus { opacity:1; color:var(--teal); }
.intro-phrase em { color:var(--teal); font-style:normal; }
.intro-phrase.in   { opacity:1; transform:translateY(0); }
.intro-phrase.out  { opacity:0; transform:translateY(-8px); transition:opacity 1.1s ease, transform 1.1s ease; }

@media (prefers-reduced-motion: reduce) {
  #intro-block { display:none; }
}

/* ══════════════════════════════════════════════
   ANIMACIONES DE SCROLL (data-scroll)
══════════════════════════════════════════════ */
[data-scroll] {
  will-change:transform, opacity;
  transition:
    opacity  .9s cubic-bezier(.16,1,.3,1),
    transform .9s cubic-bezier(.16,1,.3,1);
}
[data-scroll="zoom-in"]    { opacity:0; transform:scale(0.78); }
[data-scroll="zoom-out"]   { opacity:0; transform:scale(1.22); }
[data-scroll="from-left"]  { opacity:0; transform:translateX(-80px) scale(.95); }
[data-scroll="from-right"] { opacity:0; transform:translateX(80px) scale(.95); }
[data-scroll="from-center"]{ opacity:0; transform:scale(0.4) translateY(20px); }
[data-scroll="up"]         { opacity:0; transform:translateY(60px); }

[data-scroll].in-view      { opacity:1; transform:none; }
[data-scroll].out-view-up  { opacity:0; transform:translateY(-50px) scale(.97) !important; transition-duration:.6s; }
[data-scroll].out-view-down{ opacity:0; transform:translateY(50px) scale(.97) !important; transition-duration:.6s; }

[data-delay="1"] { transition-delay:.10s; }
[data-delay="2"] { transition-delay:.20s; }
[data-delay="3"] { transition-delay:.30s; }
[data-delay="4"] { transition-delay:.40s; }
[data-delay="5"] { transition-delay:.50s; }
[data-delay="6"] { transition-delay:.60s; }

/* ══════════════════════════════════════════════
   HERO
══════════════════════════════════════════════ */
#hero {
  position:relative;
  min-height:min(82vh, 720px);
  display:flex; align-items:center;
  overflow:hidden;
  padding:clamp(48px,7vw,92px) clamp(18px,4vw,52px) clamp(44px,6vw,76px);
  border-bottom:1px solid var(--line-soft);
  scroll-margin-top:72px;
}
#hero-canvas {
  position:absolute; inset:0;
  width:100%; height:100%;
  opacity:.32;
  pointer-events:none;
}
@keyframes fadeUp {
  from { opacity:0; transform:translateY(12px); }
  to   { opacity:1; transform:translateY(0); }
}
.hero-content {
  position:relative; z-index:2;
  width:min(var(--container), 100%);
  margin:0 auto;
}
.hero-label {
  display:flex; align-items:center; gap:9px;
  font-family:var(--font-mono); font-size:10.5px;
  color:var(--teal); letter-spacing:.2em; text-transform:uppercase;
  margin-bottom:16px;
  opacity:0; animation:fadeUp .8s .2s both;
}
.hero-label::before { content:""; width:22px; height:1px; background:var(--teal); opacity:.8; }
.hero-name {
  font-family:var(--font-display); font-size:clamp(48px,8.4vw,104px);
  font-weight:500; line-height:.92; letter-spacing:-.05em; color:var(--ink);
  margin-bottom:18px;
  opacity:0; animation:fadeUp .8s .35s both;
}
.hero-name .hero-first { display:block; font-size:1em; font-weight:500; color:var(--ink); }
.hero-name .hero-last  { display:block; color:var(--teal); font-style:normal; font-weight:500; font-size:1em; }
.hero-tagline {
  max-width:58ch;
  color:var(--ink-dim);
  font-size:16px; line-height:1.62;
  opacity:0; animation:fadeUp .8s .5s both;
}
.hero-metrics {
  display:grid;
  grid-template-columns:repeat(3, minmax(0,1fr));
  gap:1px;
  max-width:620px;
  margin:28px 0 0;
  border:1px solid var(--line-soft);
  border-radius:12px;
  background:var(--line-soft);
  overflow:hidden;
  opacity:0; animation:fadeUp .8s .65s both;
}
.hero-metrics > div { padding:13px 15px; background:rgba(11,17,32,.82); }
.hero-metrics dt {
  margin:0 0 4px;
  color:var(--ink-meta);
  font-family:var(--font-mono); font-size:9px;
  letter-spacing:.12em; text-transform:uppercase;
}
.hero-metrics dd {
  margin:0;
  font-family:var(--font-mono);
  font-size:clamp(17px,2vw,22px);
  letter-spacing:-.02em;
  color:var(--ink);
}
.hero-metrics .u { color:var(--ink-meta); font-size:.55em; letter-spacing:.02em; }
.hero-scroll {
  position:absolute; bottom:26px; left:50%; transform:translateX(-50%);
  font-family:var(--font-mono); font-size:9.5px; color:var(--ink-meta);
  letter-spacing:.24em; display:flex; align-items:center; gap:12px;
  opacity:0; animation:fadeUp 1s 1s both;
}
.hero-scroll::before { content:""; display:block; width:36px; height:1px; background:var(--line); }
.scroll-line {
  position:absolute; bottom:0; right:clamp(18px,4vw,52px);
  width:1px; height:64px;
  background:linear-gradient(to bottom, var(--teal), transparent);
  opacity:.5; animation:fadeUp 1s 1s both;
}

/* ══════════════════════════════════════════════
   ESTRUCTURA DE SALAS (contenedor 1220 px)
══════════════════════════════════════════════ */
.room {
  position:relative;
  overflow:hidden;
  padding:clamp(54px,7vw,92px) clamp(18px,4vw,52px);
  scroll-margin-top:72px;
}
.room--alt { background:linear-gradient(180deg, rgba(11,17,32,.55), rgba(11,17,32,.18)); }
.room--hidden { display:none; }
.room--contact { min-height:55vh; display:flex; align-items:center; }
.illusion-canvas { display:block; width:100%; height:100%; }
.room-canvas {
  position:absolute; inset:0;
  width:100%; height:100%;
  pointer-events:none; z-index:0;
}
.room-content {
  position:relative; z-index:1;
  width:min(var(--container), 100%);
  margin:0 auto;
}
.room-divider { height:1px; background:var(--line-soft); }

.room-number {
  display:flex; align-items:center; gap:9px;
  font-family:var(--font-mono); font-size:10.5px;
  color:var(--teal); letter-spacing:.2em; text-transform:uppercase;
  margin-bottom:12px;
}
.room-number::before { content:""; width:22px; height:1px; background:var(--teal); opacity:.8; }
.room-title {
  font-family:var(--font-display); font-size:clamp(30px,3.6vw,46px);
  font-weight:500; color:var(--ink); line-height:1.02; letter-spacing:-.035em;
  margin-bottom:14px;
}
.room-title em { color:var(--gold); font-style:normal; font-weight:500; }
.room-subtitle {
  font-family:var(--font-mono); font-size:10px;
  color:var(--ink-meta); letter-spacing:.14em; text-transform:uppercase;
  margin-bottom:clamp(24px,3vw,36px); padding-bottom:14px;
  border-bottom:1px solid var(--line-soft);
}

/* ══════════════════════════════════════════════
   COMPONENTE: ENTRADA DE TIMELINE
══════════════════════════════════════════════ */
.entry {
  position:relative;
  padding:18px 18px 16px;
  margin-bottom:12px;
  border:1px solid var(--line-soft);
  border-radius:var(--radius);
  background:var(--card);
  transition:border-color .2s, background .2s;
}
.entry::before {
  content:"";
  position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg, var(--teal), transparent 80%);
  opacity:.55;
  border-radius:var(--radius) var(--radius) 0 0;
}
.entry:hover { border-color:rgba(0,201,192,.34); background:rgba(0,201,192,.03); }
.entry-period { font-family:var(--font-mono); font-size:10px; color:var(--teal); letter-spacing:.12em; margin-bottom:6px; }
.entry-title  { font-family:var(--font-display); font-size:19px; font-weight:500; color:var(--ink); line-height:1.25; margin-bottom:4px; letter-spacing:-.015em; }
.entry-org    { font-family:var(--font-mono); font-size:10px; color:var(--ink-meta); margin-bottom:10px; }
.entry-body   { font-size:13.5px; color:var(--ink-dim); line-height:1.65; }
.entry-body li { list-style:none; padding-left:18px; margin-bottom:5px; position:relative; }
.entry-body li::before { content:'→'; position:absolute; left:0; color:var(--teal); font-size:12px; }
.entry-body em, .project-body em, .pub-title em { color:var(--ink); font-style:normal; }

/* ══════════════════════════════════════════════
   COMPONENTE: TARJETAS DE PROYECTO (grilla 3/2/1)
══════════════════════════════════════════════ */
.project-grid {
  display:grid;
  grid-template-columns:repeat(3, minmax(0,1fr));
  gap:12px;
  margin-bottom:12px;
}
.project-card {
  display:flex; flex-direction:column;
  position:relative; overflow:hidden;
  padding:18px 18px 16px;
  border:1px solid var(--line-soft);
  border-radius:var(--radius);
  background:var(--card);
  transition:border-color .2s, background .2s, transform .2s;
}
.project-card::before {
  content:"";
  position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg, var(--teal), transparent 80%);
  opacity:.7;
}
.project-card:hover {
  transform:translateY(-2px);
  border-color:rgba(0,201,192,.4);
  background:rgba(0,201,192,.04);
}
.project-status {
  font-family:var(--font-mono); font-size:9px;
  letter-spacing:.12em; text-transform:uppercase;
  display:inline-block; align-self:flex-start;
  padding:3px 9px; margin-bottom:12px;
  border-radius:var(--radius-chip);
}
.status-active  { background:rgba(0,201,192,.1); color:var(--teal); border:1px solid rgba(0,201,192,.3); }
.status-private { background:rgba(201,168,76,.1); color:var(--gold); border:1px solid rgba(201,168,76,.3); }
.status-paused  { background:rgba(117,132,154,.1); color:var(--ink-meta); border:1px solid rgba(117,132,154,.3); }
.project-title  { font-family:var(--font-display); font-size:19px; font-weight:500; letter-spacing:-.02em; line-height:1.2; color:var(--ink); margin-bottom:8px; }
.project-title em { color:var(--teal); font-style:normal; }
.project-tagline { font-size:12.5px; color:var(--ink-dim); line-height:1.55; margin-bottom:12px; }
.project-body   { font-size:12.5px; color:var(--ink-dim); line-height:1.6; }
.project-body li { list-style:none; padding-left:18px; margin-bottom:4px; position:relative; }
.project-body li::before { content:'→'; position:absolute; left:0; color:var(--teal); font-size:11px; }
.project-note {
  margin-top:auto; padding-top:12px;
  border-top:1px solid var(--line-soft);
  font-size:11.5px; color:var(--gold); line-height:1.6;
}
.project-note .pub-doi + .pub-doi { margin-left:1rem; }
.project-falta {
  margin-top:14px; padding:10px 12px;
  border:1px solid rgba(201,168,76,.28);
  border-left:2px solid var(--gold);
  border-radius:0 8px 8px 0;
  background:rgba(201,168,76,.05);
  font-family:var(--font-mono); font-size:10.5px; line-height:1.6;
  color:var(--ink-meta);
}
.project-falta-label { color:var(--gold); letter-spacing:.12em; text-transform:uppercase; margin-right:.35rem; }
.room-closing {
  max-width:62ch; margin:24px auto 0; text-align:center;
  color:var(--ink-dim); font-size:13.5px; line-height:1.6;
}

/* ══════════════════════════════════════════════
   COMPONENTE: GALERÍA CON PLACEHOLDERS
══════════════════════════════════════════════ */
.gallery-grid {
  display:grid;
  gap:12px;
  margin:18px 0;
}
.gallery-grid.cols-2 { grid-template-columns:repeat(2,1fr); }
.gallery-grid.cols-3 { grid-template-columns:repeat(3,1fr); }
.gallery-grid.cols-4 { grid-template-columns:repeat(4,1fr); }
.gallery-grid--280, .gallery-grid--280 .gallery-slot { min-height:280px; }
.gallery-grid--220, .gallery-grid--220 .gallery-slot { min-height:220px; }
.gallery-grid--260, .gallery-grid--260 .gallery-slot { min-height:260px; }
.gallery-slot {
  position:relative; overflow:hidden;
  background:rgba(0,0,0,.35);
  border:1px solid var(--line-soft);
  border-radius:var(--radius);
  min-height:200px;
  transition:border-color .3s, transform .3s;
}
.gallery-slot:hover { transform:translateY(-2px); border-color:rgba(0,201,192,.35); z-index:2; }
.gallery-slot img { width:100%; height:100%; object-fit:cover; display:block; filter:brightness(.85) saturate(.8); transition:filter .4s; }
.gallery-slot:hover img { filter:brightness(1) saturate(1); }
.gallery-slot:not(:has(img)) {
  display:flex; align-items:center; justify-content:center;
  flex-direction:column; gap:.8rem;
}
.gallery-placeholder-icon { font-size:2rem; opacity:.25; }
.gallery-placeholder-text {
  font-family:var(--font-mono); font-size:9.5px;
  color:var(--ink-meta); letter-spacing:.14em;
  text-align:center; padding:0 1rem;
}
.gallery-caption {
  position:absolute; bottom:0; left:0; right:0;
  padding:.8rem 1rem;
  background:linear-gradient(to top, rgba(5,8,16,.9), transparent);
  font-family:var(--font-mono); font-size:9.5px;
  color:var(--ink); letter-spacing:.1em;
  opacity:0; transition:opacity .3s;
}
.gallery-slot:hover .gallery-caption { opacity:1; }
.gallery-label {
  font-family:var(--font-mono); font-size:10px;
  color:var(--teal); letter-spacing:.16em; text-transform:uppercase;
  margin-bottom:12px;
}
.section-block { margin-top:28px; }
.section-block--spaced { margin-top:36px; }

/* ══════════════════════════════════════════════
   COMPONENTE: DRHAMA (showcase + grilla de celdas)
══════════════════════════════════════════════ */
.drahma-showcase {
  margin-top:12px;
  padding:22px;
  border:1px solid var(--line-soft);
  border-radius:var(--radius);
  background:rgba(255,255,255,.012);
}
.drahma-showcase-head { display:flex; align-items:center; gap:14px; margin-bottom:4px; }
.drahma-showcase-logo {
  height:44px; width:auto; object-fit:contain;
  filter:drop-shadow(0 0 8px rgba(0,201,192,.4));
  opacity:.92;
}
.drahma-showcase-title {
  font-family:var(--font-display); font-size:22px; font-weight:500;
  color:var(--ink); margin:0; letter-spacing:-.02em;
}
.drahma-showcase-title em { color:var(--teal); font-style:normal; }
.drahma-columns {
  display:grid;
  grid-template-columns:1.2fr 1fr;
  gap:clamp(24px,4vw,48px);
  align-items:start;
  margin-top:18px;
}
.drahma-aside { position:sticky; top:88px; }
.drahma-grid {
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:12px;
  margin:18px 0;
}
.drahma-cell {
  position:relative; overflow:hidden;
  padding:16px;
  border:1px solid var(--line-soft);
  border-radius:var(--radius);
  background:var(--card);
  transition:background .3s, border-color .3s;
}
.drahma-cell:hover { background:rgba(0,201,192,.05); border-color:rgba(0,201,192,.28); }
.drahma-cell-icon  { font-size:1.6rem; margin-bottom:10px; }
.drahma-cell-label { font-family:var(--font-mono); font-size:9.5px; color:var(--teal); letter-spacing:.14em; text-transform:uppercase; margin-bottom:6px; }
.drahma-cell-text  { font-size:12.5px; color:var(--ink-dim); line-height:1.55; }
.lab-stem-card {
  margin-top:18px; padding:18px;
  border:1px solid var(--line-soft); border-radius:var(--radius);
  background:var(--card);
}
.lab-stem-label { font-family:var(--font-mono); font-size:9.5px; color:var(--teal); letter-spacing:.16em; text-transform:uppercase; margin-bottom:10px; }
.lab-stem-title { font-family:var(--font-display); font-size:17px; font-weight:500; color:var(--ink); margin-bottom:10px; }
.lab-stem-title em { color:var(--teal); font-style:normal; }
.repo-strategy { margin-top:28px; border-top:1px solid var(--line-soft); padding-top:16px; }
.repo-label { font-family:var(--font-mono); font-size:9.5px; color:var(--teal); letter-spacing:.16em; text-transform:uppercase; margin-bottom:10px; }
.repo-strategy-lede { color:var(--ink-dim); font-size:13px; line-height:1.6; margin-bottom:10px; }

/* ══════════════════════════════════════════════
   COMPONENTE: PUBLICACIONES
══════════════════════════════════════════════ */
.pub-layout {
  display:grid;
  grid-template-columns:minmax(0,1fr) 300px;
  gap:clamp(24px,4vw,56px);
  align-items:start;
}
.pub-aside { position:sticky; top:88px; }
.pub-item {
  display:grid;
  grid-template-columns:64px 56px minmax(0,1fr);
  gap:12px 16px;
  align-items:start;
  padding:16px 0;
  border-bottom:1px solid var(--line-soft);
  transition:background .3s;
}
.pub-item:hover { background:rgba(0,201,192,.03); }
.pub-year    { font-family:var(--font-mono); font-size:10.5px; color:var(--teal); letter-spacing:.12em; padding-top:3px; }
.pub-title   { font-size:14px; color:var(--ink); line-height:1.45; margin-bottom:4px; }
.pub-journal { font-family:var(--font-mono); font-size:10px; color:var(--ink-meta); line-height:1.5; }
.pub-doi     { font-family:var(--font-mono); font-size:10px; color:var(--teal); text-decoration:none; display:inline-block; margin-top:.3rem; }
.pub-doi:hover { text-decoration:underline; }
.pub-item .pub-doi + .pub-doi { margin-left:1rem; }
.pub-thumb {
  width:56px; height:40px; object-fit:cover; object-position:top;
  border:1px solid var(--line-soft); opacity:.8;
  transition:opacity .3s, border-color .3s;
  display:block; flex-shrink:0;
}
.pub-item:hover .pub-thumb { opacity:1; border-color:rgba(0,201,192,.4); }
.pub-thumb.error {
  display:flex; align-items:center; justify-content:center;
  background:rgba(0,201,192,.04); border:1px solid var(--line-soft);
  font-family:var(--font-mono); font-size:.4rem; color:var(--ink-meta);
  letter-spacing:.05em; text-align:center; line-height:1.3;
}
.pub-thumb-placeholder {
  width:56px; height:40px;
  background:rgba(0,201,192,.06); border:1px solid var(--line-soft);
  display:flex; align-items:center; justify-content:center;
  font-family:var(--font-mono); font-size:.45rem; color:var(--ink-meta);
  letter-spacing:.1em; text-align:center; line-height:1.4;
}
.pub-quote { margin-top:18px; font-size:13px; color:var(--ink-meta); line-height:1.7; }

/* ══════════════════════════════════════════════
   COMPONENTE: SKILLS GRID
══════════════════════════════════════════════ */
.skills-grid {
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:12px;
}
.skill-block {
  padding:18px;
  border:1px solid var(--line-soft);
  border-radius:var(--radius);
  background:var(--card);
  transition:background .25s, border-color .25s;
}
.skill-block:hover { background:rgba(0,201,192,.04); border-color:rgba(0,201,192,.28); }
.skill-label { font-family:var(--font-mono); font-size:9.5px; color:var(--teal); letter-spacing:.14em; text-transform:uppercase; margin-bottom:10px; }
.skill-items { list-style:none; }
.skill-items li { font-size:12.5px; color:var(--ink-dim); padding:6px 0; border-bottom:1px solid var(--line-soft); }
.skill-items li:last-child { border-bottom:0; }
.room-footnote { margin-top:36px; padding-top:24px; border-top:1px solid var(--line-soft); }
.interests { margin-top:12px; max-width:70ch; color:var(--ink-dim); font-size:14px; line-height:1.8; }

/* ══════════════════════════════════════════════
   COMPONENTE: ILUSIÓN ÓPTICA CON MARCO
══════════════════════════════════════════════ */
.illusion-frame {
  position:relative;
  border:1px solid var(--line-soft);
  border-radius:var(--radius);
  overflow:hidden;
  background:rgba(0,0,0,.35);
}
.illusion-frame--250 { height:250px; }
.illusion-frame--280 { height:280px; }
.illusion-frame--340 { height:340px; }
.illusion-frame--spaced { margin-top:2.5rem; }
.illusion-label {
  position:absolute; bottom:.8rem; right:1rem;
  font-family:var(--font-mono); font-size:9px;
  color:var(--teal); letter-spacing:.14em; opacity:.7;
}
.illusion-link {
  position:absolute; bottom:.8rem; left:1rem;
  font-family:var(--font-mono); font-size:9px;
  color:var(--ink-meta); letter-spacing:.08em; opacity:0;
  text-decoration:none; transition:opacity .3s;
}
.illusion-frame:hover .illusion-link { opacity:.85; }
.illusion-link:hover { color:var(--teal) !important; opacity:1 !important; }

/* ══════════════════════════════════════════════
   COMPONENTE: NOTA DORADA
══════════════════════════════════════════════ */
.timeline-note {
  padding:16px 18px;
  margin:16px 0;
  border:1px solid rgba(201,168,76,.28);
  border-left:2px solid var(--gold);
  border-radius:0 12px 12px 0;
  background:rgba(201,168,76,.06);
  color:var(--ink-dim);
  font-size:13px; line-height:1.65;
}
.timeline-note strong {
  display:block; margin-bottom:6px;
  font-family:var(--font-mono); font-size:9.5px;
  letter-spacing:.14em; color:var(--gold); font-weight:500;
}

/* ══════════════════════════════════════════════
   COMPONENTE: CITA
══════════════════════════════════════════════ */
.quote-block {
  margin:16px 0;
  padding:16px 20px;
  border-left:2px solid var(--teal);
  border-radius:0 12px 12px 0;
  background:rgba(0,201,192,.03);
  color:var(--ink-dim);
  font-size:15px; line-height:1.6;
}

/* ══════════════════════════════════════════════
   COMPONENTE: PERFIL LATERAL
══════════════════════════════════════════════ */
.profile-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.6fr); gap:clamp(24px,4vw,56px); align-items:start; }
.profile-aside { position:sticky; top:88px; }
.profile-card {
  position:relative;
  padding:22px;
  border:1px solid var(--line-soft);
  border-radius:var(--radius);
  background:var(--card);
}
.profile-card::before {
  content:"";
  position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg, var(--teal), transparent 80%);
  opacity:.6;
  border-radius:var(--radius) var(--radius) 0 0;
}
.profile-text { font-size:14px; line-height:1.7; color:var(--ink); }
.profile-text + .profile-text { margin-top:10px; }
.profile-text--meta { color:var(--ink-dim); font-size:13px; }
.profile-text--meta .hl { color:var(--teal); }

/* ══════════════════════════════════════════════
   FOTO DE PERFIL
══════════════════════════════════════════════ */
.photo-placeholder {
  width:148px; height:148px; border-radius:50%;
  background:rgba(0,201,192,.07);
  border:2px solid var(--teal);
  box-shadow:0 0 0 6px rgba(0,201,192,.08), 0 0 28px rgba(0,201,192,.12);
  display:flex; align-items:center; justify-content:center;
  margin:0 auto 1.8rem; transition:box-shadow .4s;
  position:relative; overflow:hidden;
}
.photo-placeholder:hover { box-shadow:0 0 0 8px rgba(0,201,192,.14), 0 0 40px rgba(0,201,192,.25); }
.photo-ph-inner {
  display:flex; flex-direction:column; align-items:center;
  gap:.5rem; font-family:var(--font-mono); font-size:9px;
  color:var(--ink-meta); letter-spacing:.14em; text-align:center; padding:1rem;
}
.photo-ph-inner--hidden { display:none; }
.photo-placeholder img {
  width:100%; height:100%; object-fit:cover; object-position:center top;
  display:block; filter:brightness(.92) saturate(.75) contrast(1.02);
  transition:filter .5s;
}
.photo-placeholder:hover img { filter:brightness(1) saturate(.9) contrast(1.02); }

/* ══════════════════════════════════════════════
   COMPONENTE: CONTACTO
══════════════════════════════════════════════ */
.contact-grid {
  display:grid;
  grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);
  gap:clamp(24px,4vw,48px);
  align-items:center;
  width:100%;
}
.contact-grid .contact-links { margin-top:0; align-content:flex-start; }
.koch-buzon { height:320px; }
.contact-links { display:flex; flex-wrap:wrap; gap:10px; }
.contact-link {
  display:inline-flex; align-items:center; gap:.55em;
  padding:.6rem 1.1rem;
  border:1px solid var(--line);
  border-radius:var(--radius-chip);
  background:rgba(255,255,255,.012);
  font-family:var(--font-mono); font-size:10.5px;
  color:var(--ink-dim); text-decoration:none;
  letter-spacing:.04em;
  transition:color .2s, border-color .2s, background .2s;
}
.contact-link:hover { color:var(--teal); border-color:rgba(0,201,192,.5); background:rgba(0,201,192,.05); }
.contact-link img.ci { width:1.05em; height:1.05em; flex-shrink:0; }
.contact-note {
  margin-top:40px;
  font-family:var(--font-mono); font-size:9px;
  color:var(--ink-meta); letter-spacing:.14em; text-transform:uppercase;
}

/* ══════════════════════════════════════════════
   COMPONENTE: CONSTELACIÓN
══════════════════════════════════════════════ */
.graph-lede {
  max-width:62ch;
  margin:0 0 18px;
  color:var(--ink-dim);
  font-size:14px; line-height:1.6;
}
.graph-stage { position:relative; height:min(64vh,560px); width:100%; }
#graph-tip {
  position:absolute; display:none;
  max-width:220px;
  padding:.4rem .6rem;
  background:rgba(8,13,24,.96);
  border:1px solid var(--teal);
  border-radius:6px;
  font-family:var(--font-mono); font-size:10px;
  color:var(--ink); pointer-events:none; z-index:5;
}
.is-grey { color:#8892a0; }

/* ══════════════════════════════════════════════
   BOTÓN DE DESCARGA
══════════════════════════════════════════════ */
#btn-download {
  position:fixed; bottom:2rem; right:clamp(1rem,4vw,4rem); z-index:150;
  display:flex; align-items:center; gap:.6rem;
  padding:.75rem 1.2rem;
  background:rgba(0,201,192,.09);
  border:1px solid rgba(0,201,192,.34);
  border-radius:9px;
  color:var(--teal);
  font-family:var(--font-mono);
  font-size:10px; letter-spacing:.14em; text-transform:uppercase;
  cursor:pointer; transition:background .3s, color .3s, box-shadow .3s;
  opacity:0; animation:fadeUp 1s 1s both;
}
#btn-download:hover { background:rgba(0,201,192,.18); box-shadow:0 0 20px rgba(0,201,192,.25); }

/* ══════════════════════════════════════════════
   ESTILOS DE IMPRESIÓN — CV plano A4
══════════════════════════════════════════════ */
#print-cv { display:none; }

@media print {
  body > *:not(#print-cv) { display:none !important; }
  canvas,#loader,#nav,#progress,#btn-download,#btn-sound,#btn-lang,.hud { display:none !important; }
  #print-cv { display:block !important; font-family:Georgia,serif; font-size:11pt; color:#111; line-height:1.6; padding:2cm; background:white; }
  #print-cv h1 { font-size:22pt; margin-bottom:2pt; }
  #print-cv h2 { font-size:13pt; border-bottom:1pt solid #ccc; padding-bottom:3pt; margin:18pt 0 6pt; }
  #print-cv h3 { font-size:11pt; margin-bottom:2pt; }
  #print-cv .p-meta { font-size:9pt; color:#555; }
  #print-cv ul { padding-left:1.2em; }
  #print-cv li { margin-bottom:2pt; }
  #print-cv a { color:#111; text-decoration:none; }
  #print-cv .p-section { margin-bottom:14pt; }
  #print-cv .p-entry { margin-bottom:10pt; }
  @page { margin:2cm; size:A4; }
}

/* ══════════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════════ */
.hl      { color:var(--teal); }
.hl-gold { color:var(--gold); }
.two-col { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:clamp(20px,3vw,40px); }

/* ══════════════════════════════════════════════
   ACCESIBILIDAD — respeta "reducir movimiento"
══════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior:auto; }
  *, *::before, *::after {
    animation-duration:0.001ms !important;
    animation-delay:0s !important;
    animation-iteration-count:1 !important;
    transition-duration:0.001ms !important;
    transition-delay:0s !important;
    scroll-behavior:auto !important;
  }
  [data-scroll] { opacity:1 !important; transform:none !important; }
}

/* ══════════════════════════════════════════════
   RESPONSIVE — sin overflow horizontal en 390/768/1440
══════════════════════════════════════════════ */
@media (max-width: 1100px) {
  /* La nav NO se oculta: pasa a una segunda fila scrolleable, siempre en el
     árbol de accesibilidad y en el tab order (números + labels focusables). */
  .hud-inner { flex-wrap:wrap; row-gap:2px; }
  #nav.hud-nav { order:5; flex:0 0 100%; margin-left:0; overflow-x:auto; }
  .hud-current { display:inline-flex; flex:1 1 auto; min-width:0; margin-left:auto; max-width:34vw; }
  .hud-side { margin-left:0; }
  #hero, .room { scroll-margin-top:96px; }
}
@media (max-width: 900px) {
  .project-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .skills-grid  { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .drahma-grid  { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .drahma-columns { grid-template-columns:minmax(0,1fr); }
  .drahma-aside { position:static; }
  .pub-layout   { grid-template-columns:minmax(0,1fr); }
  .pub-aside    { position:static; }
  .profile-grid, .two-col { grid-template-columns:minmax(0,1fr); }
  .profile-aside { position:static; }
  .contact-grid { grid-template-columns:minmax(0,1fr); gap:28px; }
  .koch-buzon { height:260px; }
  .gallery-grid.cols-3, .gallery-grid.cols-4 { grid-template-columns:repeat(2,1fr); }
  .hero-scroll { display:none; }
}
@media (max-width: 620px) {
  .hud-inner { gap:10px; padding-left:56px; padding-right:14px; }
  .brand-name { font-size:9.5px; letter-spacing:.1em; }
  .hud-current { max-width:30vw; }
  .hero-name { font-size:clamp(44px,15vw,64px); }
  .hero-metrics { grid-template-columns:minmax(0,1fr); max-width:none; }
  .hero-tagline { font-size:15px; }
  .project-grid, .skills-grid, .drahma-grid { grid-template-columns:minmax(0,1fr); }
  .gallery-grid.cols-2, .gallery-grid.cols-3, .gallery-grid.cols-4 { grid-template-columns:minmax(0,1fr); }
  .pub-item { grid-template-columns:52px 48px minmax(0,1fr); gap:10px 12px; }
  .pub-thumb { width:48px; height:36px; }
  .contact-links { gap:8px; }
  .contact-link { font-size:9.5px; padding:.55rem .9rem; }
  .drahma-showcase { padding:16px; }
  .room-footnote { margin-top:28px; }
  #btn-download { bottom:1rem; right:1rem; }
}
</style>
  <script type="module" crossorigin src="/src/main.ts"></script>
</head>`;
}
