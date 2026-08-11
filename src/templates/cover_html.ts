/**
 * COVER: botones flotantes, cursor, barra de progreso, loader + fractal y nav
 * lateral. Los .nav-dot se generan desde SALAS (la numeración/labels viven en
 * src/cv/salas.ts); en runtime render.ts los vuelve a regenerar (idempotente).
 */
import { navDotsHtml } from "../cv/render.ts";

// Verbatim: botones, cursor, progreso, fractal/loader. El onclick de
// "btn-download" se eliminó: lo enlaza ui.ts (initUI) — los módulos no pueden
// exponer funciones al atributo onclick global.
const COVER_TOP = `<button id="btn-lang" type="button" aria-label="Switch language / Cambiar idioma">EN</button>

<!-- ── BOTÓN SONIDO (canto de ballenas de fondo) ──── -->
<button id="btn-sound" type="button" aria-pressed="true" title="Silenciar sonido">🔊</button>

<!-- ── BOTÓN DESCARGA CV (imprimir → guardar como PDF) ── -->
<button id="btn-download" type="button" aria-label="Descargar CV en PDF">↓ Descargar CV</button>

<!-- ── CURSOR ──────────────────────────────────────── -->
<div class="cursor" id="cursor"></div>
<div class="cursor-ring" id="cursorRing"></div>

<!-- ── BARRA DE PROGRESO ───────────────────────────── -->
<div id="progress"></div>

<!-- ── FRACTAL LOGO / LOADER ───────────────────────── -->
<!-- Este canvas es tanto el loader como el logo permanente -->
<canvas id="fractal-logo"></canvas>

<div id="loader">
  <div id="intro-block">
    <p id="intro-phrase" class="intro-phrase">¿Pueden el Arte, la Ciencia y la Filosofía convivir en una persona?</p>
  </div>
</div>

<!-- ── NAVEGACIÓN LATERAL ──────────────────────────── -->
<nav id="nav">
`;

const NAV_TAIL = `</nav>


`;

/** Nav lateral: dots generados desde SALAS (hero + salas visibles). */
export function coverHtml(): string {
  const dots = navDotsHtml()
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
  return COVER_TOP + dots + "\n" + NAV_TAIL;
}
