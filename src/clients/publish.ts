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

/**
 * Inyecta el entry bundleado del lab y el prefijo del artefacto en una página
 * de cliente. La página sólo referencia el favicon (raíz-absoluto) y el entry
 * fuente; `<a href>` es navegación y queda como está.
 */
export function publishClientPage(html: string, labEntry: string, base: string): string {
  if (!html.includes(CLIENT_SOURCE_ENTRY)) {
    throw new Error("build-clients: la página no contiene el entry fuente del lab");
  }
  const prefixed = (path: string): string => `${base}/${path.replace(/^\/+/, "")}`;
  return html
    .replace(
      CLIENT_SOURCE_ENTRY,
      `<script type="module" crossorigin src="${prefixed(labEntry)}"></script>`
    )
    .replace(/\b(href|src)="(\/assets\/[^"]*)"/g, (_m, attr: string, url: string) => `${attr}="${prefixed(url)}"`);
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
    out[relative] = html.includes(CLIENT_SOURCE_ENTRY) ? publishClientPage(html, labEntry, base) : html;
  }
  return out;
}
