/**
 * PLANO: blueprint navegable del museo. Las celdas .bp-room se generan desde
 * SALAS (etiquetas y números) sobre una grilla 3×2 de coordenadas CALCULADAS
 * (x = 60 + col·270, y = 80 + row·160) — añadir/quitar sala reposiciona solo.
 */
import { HERO_NAV, SALAS } from "../cv/salas.ts";
import { numFor, sectionId, visibleSalas } from "../cv/render.ts";

const PLANO_TOP = `<!-- ════════════════════════════════════════════════════
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
    .bp-room .bp-num{fill:#c9a84c;font-family:var(--font-mono);font-size:22px;font-weight:bold}
    .bp-room .bp-name{fill:#d6dde8;font-family:var(--font-mono);font-size:12px;letter-spacing:1px}
    .bp-room:hover .bp-name{fill:var(--teal)}
    @media print{#room-plano{display:none}}
  </style>
  <div class="bp-title" data-scroll="up"><em>Plano</em> del Museo</div>
  <div class="bp-hint" data-scroll="up" data-delay="1">PLANO DEL MUSEO · ÍNDICE — HAZ CLIC EN UN ESPACIO PARA ENTRAR</div>
    <svg class="bp-svg" viewBox="0 0 900 560" xmlns="http://www.w3.org/2000/svg" role="navigation" aria-label="Plano del museo">
    <rect class="bp-frame" x="30" y="40" width="840" height="490"/>
    <rect class="bp-frame" x="36" y="46" width="828" height="478"/>
<polyline class="bp-path" points="180,145 450,145 720,145 720,305 450,305 180,305 180,465 450,465 720,465"/>
`;

const PLANO_BOTTOM = `  </svg>
</section>
<div class="room-divider"></div>

`;

/** Una celda del plano (entrada o sala). */
interface PlanoCell {
  href: string;
  num: string;
  label: string;
}

function planoCells(): PlanoCell[] {
  const cells: PlanoCell[] = [
    { href: `#${HERO_NAV.id}`, num: "00", label: "ENTRADA" }
  ];
  for (const s of visibleSalas()) {
    cells.push({
      href: `#${sectionId(s.id)}`,
      num: numFor(s.id) ?? "",
      label: s.titulo.replace(/<[^>]*>/g, "").toUpperCase()
    });
  }
  return cells;
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
    `    <text class="bp-num"  x="${x + 18}" y="${y + 42}">${c.num}</text>\n` +
    `    <text class="bp-name" x="${x + 18}" y="${y + 110}">${c.label}</text>\n` +
    `  </a>\n`
  );
}

export function planoHtml(): string {
  return PLANO_TOP + planoCells().map(renderCell).join("") + PLANO_BOTTOM;
}

/** Test helper: metadatos de celda por sala visible (orden nav). */
export function planoCellMeta(): { id: string; num: string; label: string }[] {
  const ids = [HERO_NAV.id, ...visibleSalas().map((s) => s.id)];
  return ids.map((id) => {
    const s = SALAS.find((x) => x.id === id);
    const label = s ? s.titulo.replace(/<[^>]*>/g, "").toUpperCase() : "ENTRADA";
    const num = id === HERO_NAV.id ? "00" : (numFor(id) ?? "");
    return { id, num, label };
  });
}
