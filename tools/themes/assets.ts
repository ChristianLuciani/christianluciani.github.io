/**
 * SMOKE DE ASSETS POR TEMA (SPEC §8 FASE 5.5 · ADR-001 I6).
 *
 * El artefacto está sano sólo si TODA URL que una página publicada va a pedir
 * existe en `dist/`. Un 404 en un subpath es invisible en el render (el HTML es
 * válido) y visible recién en producción, así que el gate mira el artefacto, no
 * la fuente: parsea cada página generada y resuelve cada referencia contra el
 * disco.
 *
 * Cubre:
 *   · páginas de los temas publicados (`dist/index.html`, `dist/<path>/…`);
 *   · `src`/`href`/`data-local`/`<meta content>` de esas páginas;
 *   · los recursos que pide el RUNTIME por URL (audio ambiental y laboratorio,
 *     `src/ts/app/runtime-assets.ts`): no están en el HTML, así que un prefijo
 *     de deploy mal aplicado en el bundle no lo vería el parser de HTML;
 *   · `sitemap.xml` exacto (falta y sobra) y `robots.txt` del deploy.
 * No cubre: `/laboratorio/` como página (rutas propias), links externos, CSS
 * `url()` (la piel no referencia archivos) ni assets que aparecen en comentarios
 * HTML (el navegador no los pide).
 *
 * Uso: npm run themes:assets   (después de `npm run build`)
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildThemes } from "../../src/themes/index.ts";
import { pageUrl, resolveThemeAddress, type SiteAddress } from "../../src/themes/site.ts";
import type { NarrativeManifest } from "../../src/themes/types.ts";
import { pageFile } from "../../src/artifact/pages.ts";
import { AUDIO_TRACKS, LAB_ASSET } from "../../src/ts/app/runtime-assets.ts";

export interface AssetRef {
  /** Atributo del que salió la referencia (`src`, `href`, `data-local`, `content`). */
  readonly attr: string;
  readonly url: string;
}

export type AssetResolution =
  | { readonly kind: "local"; readonly path: string }
  | { readonly kind: "external" }
  | { readonly kind: "invalid"; readonly reason: string };

export interface PageCheck {
  /** Ruta de la página dentro de `dist/` (`index.html`, `ingenieria/index.html`). */
  readonly page: string;
  /** URL publicada de esa página. */
  readonly url: string;
}

export interface AssetReport {
  readonly pages: readonly PageCheck[];
  /** `[página, URL]` de assets referenciados que no existen en `dist/`. */
  readonly missing: readonly { page: string; url: string; path: string }[];
  /** Faltantes estructurales (página, sitemap, robots, runtime) o rutas inválidas. */
  readonly errors: readonly string[];
  readonly ok: boolean;
}

export interface CheckOptions {
  readonly distDir: string;
  readonly env?: Record<string, string | undefined>;
  /** Temas publicados; default: el registro completo. Inyectable para tests. */
  readonly themes?: readonly NarrativeManifest[];
}

/* Sólo los tags que pueden referenciar un asset. `<a href>` queda afuera: es
 * navegación (sitios externos, mailto) y no un archivo del artefacto. */
const ASSET_TAG = /<(img|script|link|meta|source|audio|video|iframe)\b[^>]*>/gi;
const ATTRIBUTE = /\b(src|href|content|data-local)="([^"]*)"/gi;

/**
 * Referencias a assets de un HTML ya generado, con el atributo que las declara.
 * Los comentarios HTML NO se miran: un `<img>` de ejemplo dentro de un
 * comentario no lo pide el navegador (la sala oculta documenta el placeholder
 * así) y contarlo como 404 sería un falso positivo.
 */
export function assetRefs(html: string): AssetRef[] {
  const refs: AssetRef[] = [];
  const body = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const tagMatch of body.matchAll(ASSET_TAG)) {
    const tag = tagMatch[0];
    const isMeta = /^<meta\b/i.test(tag);
    for (const attrMatch of tag.matchAll(ATTRIBUTE)) {
      const attr = attrMatch[1].toLowerCase();
      const url = attrMatch[2].trim();
      // `content` en `<meta>` sólo es URL en og:image/twitter:image y similares;
      // el resto son texto (description, locale, dimensiones).
      if (attr === "content" && isMeta && !/^(\/|https?:\/\/|data:)/i.test(url)) continue;
      if (!url) continue;
      refs.push({ attr, url });
    }
  }
  return refs;
}

/**
 * Resuelve una URL del render a una ruta del artefacto.
 *
 * Reglas (SPEC §8 FASE 5.5): el origen del sitio se pela; un prefijo de deploy
 * (`base`) se pela y es obligatorio para assets del sitio (una ruta fuera del
 * prefijo apunta a otra cosa en el host y es un 404). Una URL relativa al
 * documento es un error de contrato: resuelve distinto por página.
 */
export function resolveAssetUrl(url: string, address: SiteAddress): AssetResolution {
  const value = url.trim();
  if (!value) return { kind: "invalid", reason: "referencia vacía" };
  if (/^(data:|mailto:|tel:|javascript:|#)/i.test(value)) return { kind: "external" };
  if (value.startsWith("//")) return { kind: "external" };

  let path: string;
  if (/^https?:\/\//i.test(value)) {
    const origin = address.origin.replace(/\/+$/, "");
    if (!value.startsWith(`${origin}/`)) return { kind: "external" };
    path = value.slice(origin.length);
  } else if (value.startsWith("/")) {
    path = value;
  } else {
    return {
      kind: "invalid",
      reason: `URL relativa al documento (resuelve contra el directorio de la página): ${value}`
    };
  }

  const clean = path.split(/[?#]/)[0];
  let rest = clean;
  if (address.base) {
    if (!rest.startsWith(`${address.base}/`)) {
      return { kind: "invalid", reason: `ruta fuera del prefijo ${address.base}: ${value}` };
    }
    rest = rest.slice(address.base.length);
  }
  return { kind: "local", path: rest.replace(/^\/+/, "") };
}

/**
 * Temas publicados (default cuando el llamador no inyecta un conjunto): el
 * mismo selector que el build, para que `SITE_THEME=<id> npm run build` se
 * verifique con `SITE_THEME=<id> npm run themes:assets`.
 */
function publishedThemes(env: Record<string, string | undefined>): NarrativeManifest[] {
  return buildThemes(env);
}

/** Páginas del artefacto + su dirección, con el prefijo de deploy ya resuelto. */
function pagesOf(
  themes: readonly NarrativeManifest[],
  env: Record<string, string | undefined>
): { pages: PageCheck[]; addresses: SiteAddress[]; errors: string[] } {
  const addresses = themes.map((theme) => resolveThemeAddress(theme, env));
  const errors: string[] = [];
  const bases = new Set(addresses.map((address) => address.base));
  if (bases.size > 1) {
    errors.push(
      `los temas publicados declaran prefijos distintos (${[...bases]
        .map((base) => base || "/")
        .join(", ")}); un artefacto tiene un solo bundle`
    );
  }
  return {
    pages: themes.map((theme, index) => ({
      page: pageFile(theme.path),
      url: pageUrl(addresses[index])
    })),
    addresses,
    errors
  };
}

/**
 * Verifica los recursos que el runtime pide por URL. Sin esto, un prefijo de
 * deploy aplicado sólo al HTML pasa el gate con el audio en 404: el parser no
 * mira JS (F1 del pase fresco de #153).
 */
function runtimeErrors(distDir: string, base: string): string[] {
  const errors: string[] = [];
  for (const rel of Object.values(AUDIO_TRACKS)) {
    if (!existsSync(join(distDir, rel))) {
      errors.push(`falta ${rel} en el artefacto (audio del runtime)`);
    }
  }
  if (!existsSync(join(distDir, LAB_ASSET, "index.html"))) {
    errors.push(`falta ${LAB_ASSET}index.html en el artefacto (laboratorio del runtime)`);
  }

  // El bundle tiene que estar compilado con la MISMA base: `BASE_URL` viaja
  // inlineada en el chunk que usa el runtime. Con base no vacía, un chunk sin
  // el prefijo es un artefacto que pide `<origen>/audio/…` en vez de
  // `<origen><base>/audio/…`.
  if (!base) return errors;
  const assetsDir = join(distDir, "assets");
  if (!existsSync(assetsDir)) return errors;
  for (const file of readdirSync(assetsDir)) {
    if (!file.endsWith(".js")) continue;
    const bundle = readFileSync(join(assetsDir, file), "utf8");
    if (!bundle.includes("audio/")) continue;
    if (!bundle.includes(base)) {
      errors.push(
        `dist/assets/${file} no compila la base ${base} para el runtime (¿vite build con otro SITE_BASE?)`
      );
    }
  }
  return errors;
}

/**
 * Verifica el artefacto completo: cada página publicada, cada asset referenciado,
 * los recursos del runtime y la coherencia del sitemap/robots.
 */
export function checkThemeAssets({
  distDir,
  env = {},
  themes = publishedThemes(env)
}: CheckOptions): AssetReport {
  const { pages, addresses, errors: pageErrors } = pagesOf(themes, env);
  const missing: { page: string; url: string; path: string }[] = [];
  const errors: string[] = [...pageErrors];

  pages.forEach(({ page }, index) => {
    const file = join(distDir, page);
    if (!existsSync(file)) {
      errors.push(`falta la página ${page} (¿corriste \`npm run build\`?)`);
      return;
    }
    const html = readFileSync(file, "utf8");

    // Identidad del tema en la página (F1 del pase fresco de #159): el bundle es
    // compartido, así que sin `data-theme` el runtime monta la narrativa del
    // default sobre el HTML del otro tema. El gate verifica que la página
    // declare SU id (y que no sea otro).
    const themeId = themes[index].id;
    const declared = /<html\b[^>]*\bdata-theme="([^"]*)"/i.exec(html)?.[1];
    if (!declared) {
      errors.push(
        `${page}: no declara la identidad del tema (<html data-theme="…">); ` +
          `el runtime no puede resolver la narrativa de "${themeId}"`
      );
    } else if (declared !== themeId) {
      errors.push(
        `${page}: declara data-theme="${declared}" y el tema publicado es "${themeId}"`
      );
    }

    for (const ref of assetRefs(html)) {
      const resolved = resolveAssetUrl(ref.url, addresses[index]);
      if (resolved.kind === "external") continue;
      if (resolved.kind === "invalid") {
        errors.push(`${page}: ${resolved.reason}`);
        continue;
      }
      if (!existsSync(join(distDir, resolved.path))) {
        missing.push({ page, url: ref.url, path: resolved.path });
      }
    }
  });

  const sitemapFile = join(distDir, "sitemap.xml");
  if (!existsSync(sitemapFile)) {
    errors.push("falta sitemap.xml en el artefacto");
  } else {
    const xml = readFileSync(sitemapFile, "utf8");
    const listed = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
    for (const { url } of pages) {
      if (!listed.has(url)) errors.push(`sitemap.xml no lista ${url}`);
      listed.delete(url);
    }
    for (const extra of listed) errors.push(`sitemap.xml lista una URL no publicada: ${extra}`);
  }

  // El robots.txt lo genera el SSOT (`sync:ai-policy`) y Vite copia `public/`
  // tal cual: el gate verifica que el deploy lo sirva, no su contenido.
  if (!existsSync(join(distDir, "robots.txt"))) {
    errors.push("falta robots.txt en el artefacto (public/robots.txt no llegó al build)");
  }

  errors.push(...runtimeErrors(distDir, addresses[0]?.base ?? ""));

  return { pages, missing, errors, ok: missing.length === 0 && errors.length === 0 };
}

/* ──────────────────────────────────────────────
   CLI
────────────────────────────────────────────── */

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): number {
  const distDir = resolve(process.cwd(), argValue("--dist") ?? "dist");
  // `SITE_ORIGIN`/`SITE_BASE` del build tienen que llegar al gate: el artefacto
  // se publicó con esa dirección y el smoke la verifica contra el mismo env.
  const report = checkThemeAssets({ distDir, env: process.env });
  for (const { page, url } of report.pages) console.log(`· ${page} → ${url}`);
  for (const issue of report.missing) {
    console.error(`❌ ${issue.page}: ${issue.url} (falta ${issue.path} en el artefacto)`);
  }
  for (const error of report.errors) console.error(`❌ ${error}`);
  if (report.ok) {
    console.log(`✅ themes:assets — ${report.pages.length} página(s), 0 assets faltantes`);
    return 0;
  }
  console.error(
    `❌ themes:assets FAIL — ${report.missing.length + report.errors.length} problema(s)`
  );
  return 1;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) process.exit(main());
