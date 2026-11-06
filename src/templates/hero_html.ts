/**
 * GENERADO por herramientas/extract-monolith (one-shot) desde index.html (Fase-1).
 * NO editar a mano el contenido extraído; editar la fuente original y regenerar,
 * o editar directamente si es un cambio intencional de contenido.
 * HERO: entrada del museo (section + divider).
 */
import { provenanceHtml } from "../data/profile.provenance.ts";
import { t } from "../content/copy.ts";

export function heroHtml(): string {
  return `<!-- ════════════════════════════════════════════════════
  HERO — Entrada al museo
════════════════════════════════════════════════════ -->
<section id="hero">
  <canvas id="hero-canvas" role="img" aria-label="Cubos isométricos pulsantes"></canvas>

  <div class="hero-content">
    <div class="hero-label">${t("hero.label")}</div>
    <h1 class="hero-name" id="hero-name">
      <span class="hero-first">Christian</span>
      <span class="hero-last">Luciani</span>
    </h1>
    <p class="hero-tagline">${t("hero.tagline")}</p>

    <dl class="hero-metrics">
      <div><dt>Kontablo</dt><dd>195<span class="u"> ${t("hero.metric.jurisdictions")}</span></dd></div>
      <div><dt>Drahma</dt><dd>36<span class="u"> ${t("hero.metric.tutors")}</span></dd></div>
      <div><dt>${t("hero.metric.physics")}</dt><dd>20+<span class="u"> ${t("hero.metric.years")}</span></dd></div>
    </dl>

${provenanceHtml()}  </div>

  <div class="hero-scroll">${t("hero.scroll")}</div>
  <div class="scroll-line"></div>
</section>
<div class="room-divider"></div>


`;
}
