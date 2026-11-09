/**
 * Publicación de las páginas /clients/<slug>/ (#145). Vive en src/ (no en
 * tools/) porque build.ts lo importa: el gate "cero red" del build prohíbe
 * que su grafo toque tools/. `tools/build-clients.ts` es el CLI fino.
 */
import { CLIENTS, clientSlugs, validateClients } from "../content/clients/index.ts";
import { CLIENT_SOURCE_ENTRY, clientPageHtml, clientsIndexHtml } from "./page.ts";
import { entryPath } from "../artifact/pages.ts";

/** Pares rutaRelativa → HTML en modo fuente (lo que se commitea en `clients/`). */
export function clientSourceFiles(): Record<string, string> {
  validateClients();
  const files: Record<string, string> = { "clients/index.html": clientsIndexHtml() };
  for (const slug of clientSlugs()) {
    files[`clients/${slug}/index.html`] = clientPageHtml(CLIENTS[slug]);
  }
  return files;
}

/** Prefija TODAS las rutas raíz-absolutas de href/src con `base` (idempotente). */
function prefixRootAbsolute(html: string, base: string): string {
  const basePrefix = base.replace(/^\/+/, ""); // "demo" o ""
  return html.replace(/\b(href|src)="\/(?!\/)([^"]*)"/g, (match, attr: string, url: string) => {
    if (basePrefix && url.startsWith(`${basePrefix}/`)) return match; // ya prefijado
    return `${attr}="${base}/${url}"`;
  });
}

/**
 * Inyecta el entry bundleado del lab en una página de lab y prefija el resto de
 * rutas raíz-absolutas (assets, navegación interna `/clients/…`, `/`) con el
 * `base` del artefacto. Las URLs externas (`https:`, `//host`) no las toca.
 */
export function publishClientPage(html: string, labEntry: string, base: string): string {
  if (!html.includes(CLIENT_SOURCE_ENTRY)) {
    throw new Error("build-clients: la página no contiene el entry fuente del lab");
  }
  const withEntry = html.replace(
    CLIENT_SOURCE_ENTRY,
    `<script type="module" crossorigin src="${base}/${labEntry.replace(/^\/+/, "")}"></script>`
  );
  return prefixRootAbsolute(withEntry, base);
}

export function labEntryPath(manifest: Record<string, { file: string; isEntry?: boolean }>): string {
  return entryPath(manifest, "src/client/main.ts");
}

/**
 * Publica TODO el set de páginas de cliente al artefacto: las de lab
 * (`clients/<slug>/`) reciben el entry bundleado; el índice (`clients/index.html`)
 * no tiene entry y se copia tal cual.
 */
export function publishClientPages(
  files: Record<string, string>,
  labEntry: string,
  base: string
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [relative, html] of Object.entries(files)) {
    // Las páginas de lab llevan el entry fuente; el índice (clients/index.html)
    // no tiene entry y sólo recibe el prefijo de rutas.
    out[relative] = html.includes(CLIENT_SOURCE_ENTRY)
      ? publishClientPage(html, labEntry, base)
      : prefixRootAbsolute(html, base);
  }
  return out;
}
