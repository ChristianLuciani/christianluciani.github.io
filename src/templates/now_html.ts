/**
 * Strip «Ahora» / «Now» (#117) — render ESTÁTICO del feed `now/v1`: el contenido
 * está en el HTML inicial (JS off lo ve, sin layout shift) y no hay fetch en
 * cliente ni inserción posterior. Sin contadores, badges ni animación.
 *
 * Chrome, NO hecho citable: no alimenta JSON-LD, `llms.txt` ni `FAQPage`.
 */
import { NOW } from "../data/now.generated.ts";
import type { NowItem, NowSnapshot } from "../data/now.types.ts";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

/** Los títulos vienen de GitHub: se escapan antes de entrar al HTML. */
function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

function rowHtml(item: NowItem): string {
  return `      <li class="now-item">
        <time class="now-date" datetime="${item.date}">${item.date}</time>
        <a class="now-link" href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a>
      </li>`;
}

/** Sección completa. Con `items` vacío el productor dice que es válido: se declara. */
export function nowHtml(now: NowSnapshot = NOW): string {
  const rows = now.items.map(rowHtml).join("\n");
  const body =
    now.items.length > 0
      ? `    <ol class="now-list">
${rows}
    </ol>`
      : `    <p class="now-empty">Nada en vuelo.</p>`;
  return `<!-- ════════════════════════════════════════════════════
  AHORA — feed now/v1 (chrome, no hecho citable) · #117
════════════════════════════════════════════════════ -->
<section id="now" class="now-strip" aria-labelledby="now-title">
  <div class="now-inner">
    <h2 class="now-title" id="now-title">Ahora</h2>
${body}
    <p class="now-asof">Actualizado <time datetime="${now.asOf}">${now.asOf.slice(0, 10)}</time></p>
  </div>
</section>


`;
}
