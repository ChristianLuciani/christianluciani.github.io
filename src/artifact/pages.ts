/**
 * PÁGINAS DEL ARTEFACTO (SPEC §8 FASE 5.5 · ADR-001 D12).
 *
 * El render (`assembleHtml`) es el DOCUMENTO: no conoce origen, prefijo ni
 * subpath, así que su golden queda intacto (invariante del epic #125). Publicar
 * es un paso aparte, sólo para `dist/`: acá se le aplican la dirección del tema
 * (canónica, `og:url`, `og:image`) y las rutas raíz-absolutas que el artefacto
 * necesita para resolver desde cualquier subpath.
 *
 * Todo lo de este módulo es determinista y sin I/O, para probarlo sin Vite.
 */
import { DEFAULT_ORIGIN, pageUrl, servedAssetPath, type SiteAddress } from "../themes/site.ts";

/** Tag del entry en el HTML fuente (contrato de `assembleHtml`). */
export const SOURCE_ENTRY = `<script type="module" crossorigin src="/src/main.ts"></script>`;

/** Ruta de la página de un tema dentro del artefacto: `<path>/index.html`. */
export function pageFile(path: string): string {
  const themePath = path.replace(/^\/+|\/+$/g, "");
  return themePath ? `${themePath}/index.html` : "index.html";
}

interface ManifestChunk {
  readonly file: string;
  readonly isEntry?: boolean;
}

/** Ruta del entry del bundle (raíz del artefacto), desde el manifest de Vite. */
export function entryPath(manifest: Record<string, ManifestChunk>): string {
  const entry = Object.entries(manifest).find(([, chunk]) => chunk.isEntry);
  if (!entry) {
    throw new Error(
      "build: el manifest de Vite no declara un entry; corré `vite build --manifest` antes de `build.ts --dist`"
    );
  }
  return `/${entry[1].file.replace(/^\/+/, "")}`;
}

/**
 * Reemplaza el tag del módulo fuente por el del bundle. Falla si el contrato de
 * `assembleHtml` cambió: publicar un HTML que referencia `/src/main.ts` deja el
 * sitio sin JS en producción, y ese fallo tiene que verse en el build.
 */
export function injectEntry(html: string, entry: string): string {
  if (!html.includes(SOURCE_ENTRY)) {
    throw new Error(
      `build: la página no contiene el entry ${SOURCE_ENTRY}; actualizá src/artifact/pages.ts`
    );
  }
  return html.replace(
    SOURCE_ENTRY,
    `<script type="module" crossorigin src="${entry}"></script>`
  );
}

/**
 * `sitemap.xml` con todas las URLs publicadas por ESTE artefacto. Sin `lastmod`:
 * no hay fecha por página y un mtime de filesystem haría el archivo no
 * determinista (dos builds del mismo commit deben dar los mismos bytes).
 */
export function sitemapXml(addresses: readonly SiteAddress[]): string {
  const urls = [...new Set(addresses.map((address) => pageUrl(address)))].sort();
  const entries = urls
    .map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>\n`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}</urlset>\n`;
}

/**
 * Tags cuyos atributos referencian un archivo del artefacto. `<a href>` queda
 * afuera a propósito: es navegación (externa o ancla), no un asset.
 */
const ASSET_TAG = /<(img|link|script|source|audio|video|iframe)\b[^>]*>/gi;
const ASSET_ATTRIBUTE = /\b(src|href|data-local)="([^"]*)"/gi;

/**
 * Aplica la dirección del artefacto a una URL de asset:
 *   · absoluta (`https:`), `data:`, `mailto:` o `//host` → se deja igual (CDN,
 *     enlaces externos, atributos ya resueltos);
 *   · raíz-absoluta (`/assets/…`) → se le antepone el `base` (una vez);
 *   · relativa al documento (`assets/icons/…`, la que emite el render) → se
 *     vuelve raíz-absoluta: una ruta relativa resuelve contra el directorio de
 *     la página y en un subpath apunta a `<path>/assets/…`, que no existe.
 */
export function withArtifactBase(url: string, address: SiteAddress): string {
  const value = url.trim();
  if (!value) return url;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) return url;
  const base = address.base;
  if (value.startsWith("/")) {
    if (!base || value === base || value.startsWith(`${base}/`)) return value;
    return `${base}${value}`;
  }
  return `${base}/${value.replace(/^\.?\//, "")}`;
}

/** URL absoluta de un asset del sitio: `<origin><base><ruta>`. */
function absoluteAsset(url: string, address: SiteAddress): string {
  const value = url.trim();
  if (/^https?:\/\//i.test(value)) {
    if (!value.startsWith(`${DEFAULT_ORIGIN}/`)) return value; // CDN configurada
    return `${address.origin}${servedAssetPath(value.slice(DEFAULT_ORIGIN.length), address)}`;
  }
  if (value.startsWith("/")) {
    return `${address.origin}${servedAssetPath(value, address)}`;
  }
  return `${address.origin}${servedAssetPath(`/${value}`, address)}`;
}

/**
 * Publica el documento renderizado en la dirección de un tema: agrega
 * `canonical`, reescribe `og:url`/`og:image`/`twitter:image` al origen y prefijo
 * del tema, y hace raíz-absolutas (con `base`) las rutas de assets.
 *
 * `icons` mapea `<ruta servida sin base>` → `data:` URI: los iconos de contacto
 * se inlinean sólo en el artefacto (0 requests, `docs/cdn-decision.md`), porque
 * el render los emite relativos y en un subpath no resolverían.
 * Devuelve las referencias de icono que quedaron sin reemplazo: un icono nuevo
 * sin archivo tiene que romper el build, no publicar un 404.
 */
export function publishPage(
  html: string,
  address: SiteAddress,
  icons: ReadonlyMap<string, string> = new Map()
): { html: string; missing: readonly string[] } {
  const canonical = pageUrl(address);
  let output = html;

  // Canonical = URL de ESTA página, justo después del og:url del documento.
  output = output.replace(
    /(<meta property="og:url" content=")[^"]*(">\n)/,
    `$1${canonical}$2<link rel="canonical" href="${canonical}">\n`
  );
  if (!output.includes('rel="canonical"')) {
    throw new Error(
      "build: no se pudo insertar canonical; el head renderizado ya no tiene `og:url` en la forma esperada"
    );
  }

  // OG/Twitter image: origen + prefijo del tema (o la CDN tal cual).
  output = output.replace(
    /((?:property="og:image"|name="twitter:image") content=")([^"]*)(")/g,
    (_match, head: string, url: string, tail: string) =>
      `${head}${absoluteAsset(url, address)}${tail}`
  );

  // Assets raíz-absolutos con el prefijo del artefacto (favicons, thumbs,
  // logo del print, QR, iconos, bundle inyectado).
  output = output.replace(ASSET_TAG, (tag) =>
    tag.replace(
      ASSET_ATTRIBUTE,
      (_match, attr: string, url: string) => `${attr}="${withArtifactBase(url, address)}"`
    )
  );

  for (const [served, dataUri] of icons) {
    output = output.split(`src="${servedAssetPath(served, address)}"`).join(`src="${dataUri}"`);
  }
  const missing = [...output.matchAll(/src="([^"]*\/assets\/icons\/[^"]+)"/g)].map(
    (match) => match[1]
  );

  return { html: output, missing };
}
