/**
 * Strip «Ahora» / «Now» (#117) — render ESTÁTICO del feed `now/v1`.
 *
 * El contenido está en el HTML inicial: no hay fetch en cliente ni inserción
 * posterior, así que se lee con JS deshabilitado y no produce layout shift.
 * Sin contadores, sin badges, sin animación: 5 filas como máximo, fecha + link.
 *
 * Chrome, NO hecho citable (issue #117 §Caution): este bloque no alimenta
 * JSON-LD, `llms.txt` ni `FAQPage`. Lo citable se promueve a `content/` en
 * profile-data — curado, fechado, con fuente.
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
