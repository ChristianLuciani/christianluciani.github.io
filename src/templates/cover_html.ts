/**
 * COVER: HUD superior sticky (marca + nav + idioma/sonido), botón de descarga,
 * barra de progreso y loader + mark animado.
 * Los .nav-dot se generan desde SALAS (la numeración/labels viven en
 * src/cv/salas.ts); en runtime render.ts los vuelve a regenerar (idempotente).
 * El cursor personalizado se retiró: la interacción usa el cursor nativo.
 */
import { navDotsHtml } from "../cv/render.ts";
import { t, ta, tae } from "../content/copy.ts";

function coverTop(): string {
  return `<header class="hud">
  <div class="hud-inner">
    <a class="brand" href="#hero" aria-label="${ta("cover.brandAria")}"
       data-aria-es="${ta("cover.brandAria")}"
       data-aria-en="${tae("cover.brandAria")}">
      <span class="brand-mark" aria-hidden="true">◈</span>
      <span class="brand-name">Christian Luciani</span>
    </a>
    <span class="hud-current" id="hud-current">Entrada</span>
    <nav id="nav" class="hud-nav" aria-label="${ta("cover.navAria")}"
         data-aria-es="${ta("cover.navAria")}" data-aria-en="${tae("cover.navAria")}">
`;
}

function coverTail(): string {
  return `</nav>
    <div class="hud-side">
      <button id="btn-lang" type="button" aria-label="${ta("cover.langAria")}">EN</button>
      <button id="btn-sound" type="button" aria-pressed="true" aria-label="${ta("cover.soundAria")}" title="${ta("cover.soundTitle")}">
        <svg class="si-on" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5z"/>
          <path d="M15.5 8.5a5 5 0 0 1 0 7"/>
          <path d="M18.5 5.5a9 9 0 0 1 0 13"/>
        </svg>
        <svg class="si-off" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5z"/>
          <line x1="16" y1="9" x2="22" y2="15"/>
          <line x1="22" y1="9" x2="16" y2="15"/>
        </svg>
      </button>
    </div>
  </div>
</header>

<!-- ── BOTÓN DESCARGA CV (imprimir → guardar como PDF) ── -->
<button id="btn-download" type="button" aria-label="${ta("cover.downloadAria")}">${t("cover.download")}</button>

<!-- ── BARRA DE PROGRESO ───────────────────────────── -->
<div id="progress"></div>

<!-- ── MARK DE MARCA / LOADER ─────────────────────── -->
<!-- SVG animado (src/ts/brand/logoAnim.js): loader y logo permanente.
     Al minimizarse se habilita y abre el Laboratorio temporal del Espirángulo; en el loader
     está deshabilitado y no es focusable. -->
<button id="brand-logo" type="button" aria-label="${ta("cover.logoAria")}" title="${ta("cover.logoTitle")}" disabled></button>

<div id="loader">
  <div id="intro-block">
    <p id="intro-phrase" class="intro-phrase">${t("cover.introPlaceholder")}</p>
  </div>
  <!-- La intro es opcional: la página no. Un control explícito evita depender
       de "clic en cualquier lado" para saltarla. -->
  <button id="btn-skip-intro" type="button"
          aria-label="${ta("cover.skipAria")}"
          data-aria-es="${ta("cover.skipAria")}"
          data-aria-en="${tae("cover.skipAria")}">
    <span class="skip-intro-label">${t("cover.skipIntro")}</span>
    <span class="skip-intro-arrow" aria-hidden="true">↓</span>
  </button>
</div>
`;
}

/** HUD + nav generado desde SALAS (hero + salas visibles). */
export function coverHtml(): string {
  const dots = navDotsHtml()
    .split("\n")
    .map((line) => `      ${line}`)
    .join("\n");
  return coverTop() + dots + "\n" + coverTail();
}
