/**
 * PLANO: blueprint navegable. Las celdas .bp-room se generan desde las salas de
 * la narrativa activa (etiquetas y números) sobre una grilla 3×2 de coordenadas CALCULADAS
 * (x = 60 + col·270, y = 80 + row·160) — añadir/quitar sala reposiciona solo.
 */
import { HERO_NAV } from "../cv/salas.ts";
import { navUnits, sectionId } from "../cv/render.ts";
import { t, ta } from "../content/copy.ts";

function planoTop(): string {
  return `<!-- ════════════════════════════════════════════════════
  PLANO / ÍNDICE — blueprint navegable del museo
════════════════════════════════════════════════════ -->
<section id="room-plano">
  <style>
    #room-plano{padding:5rem 6% 4rem;background:var(--deep);text-align:center}
    .bp-title{font-family:var(--font-display);font-size:1.7rem;color:#fff;margin-bottom:.4rem}
    .bp-title em{color:var(--teal);font-style:italic}
    .bp-hint{font-family:var(--font-mono);font-size:.6rem;letter-spacing:.22em;color:var(--muted);text-transform:uppercase;margin-bottom:2.4rem}
    .bp-svg{max-width:760px;width:100%;height:auto;margin:0 auto;display:block}
    .bp-frame{fill:none;stroke:var(--teal);stroke-width:1;opacity:.45}
    .bp-path{fill:none;stroke:#c9a84c;stroke-width:1;stroke-dasharray:4 5;opacity:.45}
    .bp-room rect{fill:rgba(0,201,192,.04);stroke:var(--teal);stroke-width:1.2;transition:fill .25s}
    .bp-room:hover rect{fill:rgba(0,201,192,.17)}
    .bp-room .bp-sala{fill:var(--muted);font-family:var(--font-mono);font-size:9px;letter-spacing:1.8px}
    .bp-room .bp-num{fill:#c9a84c;font-family:var(--font-mono);font-size:22px;font-weight:bold}
    .bp-room .bp-name{fill:#d6dde8;font-family:var(--font-mono);font-size:12px;letter-spacing:1px}
    .bp-room:hover .bp-sala{fill:var(--teal)}
    .bp-room:hover .bp-name{fill:var(--teal)}
    @media print{#room-plano{display:none}}
  </style>
  <div class="bp-title" data-scroll="up"><em>${t("plano.title.word")}</em> ${t("plano.title.rest")}</div>
  <div class="bp-hint" data-scroll="up" data-delay="1">${t("plano.hint")}</div>
    <svg class="bp-svg" viewBox="0 0 900 560" xmlns="http://www.w3.org/2000/svg" role="navigation" aria-label="${ta("plano.aria")}">
    <rect class="bp-frame" x="30" y="40" width="840" height="490"/>
    <rect class="bp-frame" x="36" y="46" width="828" height="478"/>
<polyline class="bp-path" points="180,145 450,145 720,145 720,305 450,305 180,305 180,465 450,465 720,465"/>
`;
}

const PLANO_BOTTOM = `  </svg>
</section>
<div class="room-divider"></div>

`;

/** Una celda del plano (entrada o UNIDAD de navegación). */
interface PlanoCell {
  href: string;
  /** Etiqueta de categoría sobre el número (SALA en ES, ROOM en EN). */
  sala: string;
  num: string;
  label: string;
}

/** Texto del plano: la unidad rotula con su rótulo, en mayúsculas y sin markup. */
function planoLabel(title: string): string {
  return title.replace(/<[^>]*>/g, "").toUpperCase();
}

/**
 * METADATOS de las celdas del plano, en orden de navegación.
 *
 * Una celda por UNIDAD (`navUnits()`): un grupo de salas ocupa UNA celda y
 * comparte el número de sus salas. El tema default no declara grupos, así que
 * produce exactamente la misma lista que antes (hero + una celda por sala).
 */
export function planoCellMeta(): { id: string; sala: string; num: string; label: string }[] {
  const cells: { id: string; sala: string; num: string; label: string }[] = [
    { id: HERO_NAV.id, sala: t("plano.sala"), num: "00", label: t("plano.entry") }
  ];
  for (const unit of navUnits()) {
    cells.push({
      id: unit.id,
      sala: t("plano.sala"),
      num: unit.num,
      label: planoLabel(unit.title)
    });
  }
  return cells;
}

function planoCells(): PlanoCell[] {
  return planoCellMeta().map((cell) => ({
    href: cell.id === HERO_NAV.id ? `#${HERO_NAV.id}` : `#${sectionId(cell.id)}`,
    sala: cell.sala,
    num: cell.num,
    label: cell.label
  }));
}

/** Celda sobre grilla 3×2 (orden de nav: hero + salas visibles). */
function renderCell(c: PlanoCell, i: number): string {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = 60 + col * 270;
  const y = 80 + row * 160;
  return (
    `  <a href="${c.href}" class="bp-room">\n` +
    `    <rect x="${x}" y="${y}" width="240" height="130" rx="2"/>\n` +
    `    <text class="bp-sala" x="${x + 18}" y="${y + 20}">${c.sala}</text>\n` +
    `    <text class="bp-num"  x="${x + 18}" y="${y + 50}">${c.num}</text>\n` +
    `    <text class="bp-name" x="${x + 18}" y="${y + 112}">${c.label}</text>\n` +
    `  </a>\n`
  );
}

export function planoHtml(): string {
  return planoTop() + planoCells().map(renderCell).join("") + PLANO_BOTTOM;
}

