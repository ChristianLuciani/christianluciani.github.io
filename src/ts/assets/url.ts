import { ASSET_MANIFEST, type PaperKey } from "./manifest";

/**
 * Bases de CDN — ADR `docs/cdn-decision.md`.
 *
 * Dos palancas, dos fuentes:
 *   · `VITE_ASSET_BASE_URL`      → assets del sitio (OG, thumbs, imágenes, audio)
 *   · `VITE_BRAND_KIT_BASE_URL`  → marca canónica en cluciani-brand-kit@tag
 *
 * La marca NO se sirve del repo del sitio cuando la base del brand kit está
 * configurada: `/assets/brand/**` se resuelve contra `assets/logo/**` del
 * brand kit. Sin la base, cae a la copia local (fallback), nunca al CDN del
 * sitio: el espejo local está pinneado al tag en `brand-kit.lock.json`.
 *
 * - Bundle del navegador: las inyecta Vite (import.meta.env).
 * - Build-time (`build.ts` + templates, Node): se leen de process.env.
 *
 * Vacías = todo se sirve desde GitHub Pages (comportamiento por defecto).
 */
function envValue(name: string): string | undefined {
  const fromVite =
    typeof import.meta !== "undefined"
      ? (import.meta.env as Record<string, string | undefined> | undefined)?.[name]
      : undefined;
  if (fromVite) return String(fromVite);
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

/** Valida y normaliza una base: http(s), sin barras finales. Vacío = Pages. */
export function normalizeBase(
  base: string | undefined | null,
  envName = "VITE_ASSET_BASE_URL"
): string {
  const raw = (base ?? "").trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) {
    throw new Error(`${envName} debe ser una URL http(s) absoluta (recibido: ${raw})`);
  }
  return raw.replace(/\/+$/, "");
}

export const ASSET_BASE = normalizeBase(envValue("VITE_ASSET_BASE_URL"));
export const BRAND_KIT_BASE = normalizeBase(
  envValue("VITE_BRAND_KIT_BASE_URL"),
  "VITE_BRAND_KIT_BASE_URL"
);

function rootPath(path: string): string {
  return `/${path.replace(/^\/+/, "")}`;
}

/**
 * Ruta **en el repo del sitio** de un asset servido, para la CDN del sitio.
 * El build reubica dos familias:
 *   - los 3 favicons viven en `assets/brand/logo/` y se publican planos en
 *     `/assets/brand/` (los copia `vite.config.ts`);
 *   - el OG vive en `public/assets/` y Vite publica `public/` en la raíz.
 * Las 4 thumbs coinciden.
 */
export function cdnRepoPath(servedPath: string): string {
  const served = rootPath(servedPath);
  if (served.startsWith("/assets/brand/")) {
    return `assets/brand/logo/${served.slice("/assets/brand/".length)}`;
  }
  if (served.startsWith("/assets/")) return `public${served}`;
  if (served.startsWith("/audio/")) return `public${served}`;
  return served.slice(1);
}

/** Ruta de un asset de marca en el repo canónico `cluciani-brand-kit`. */
export function brandKitRepoPath(servedPath: string): string | null {
  const served = rootPath(servedPath);
  if (!served.startsWith("/assets/brand/")) return null;
  return `assets/logo/${served.slice("/assets/brand/".length)}`;
}

/** URL de un asset servido, resolviendo marca y sitio por separado. */
export function cdnAssetUrl(
  servedPath: string,
  base: string = ASSET_BASE,
  brandBase: string = BRAND_KIT_BASE
): string {
  const served = rootPath(servedPath);
  const brandRepo = brandKitRepoPath(served);
  if (brandRepo) {
    return brandBase ? `${brandBase}/${brandRepo}` : served;
  }
  return base ? `${base}/${cdnRepoPath(served)}` : served;
}

/**
 * Atributos de un asset con `data-local` (ruta que sirve Pages) para que el
 * runtime pueda degradar (assets/fallback.ts).
 */
export function assetAttrsFor(
  attr: "src" | "href",
  servedPath: string,
  base: string = ASSET_BASE,
  brandBase: string = BRAND_KIT_BASE
): string {
  const local = rootPath(servedPath);
  const value = cdnAssetUrl(servedPath, base, brandBase);
  return value === local
    ? `${attr}="${value}"`
    : `${attr}="${value}" data-local="${local}"`;
}

/** Atributos de un `<img>`: `src` (CDN si hay base) + `data-local` (Pages). */
export function assetAttrs(
  servedPath: string,
  base: string = ASSET_BASE,
  brandBase: string = BRAND_KIT_BASE
): string {
  return assetAttrsFor("src", servedPath, base, brandBase);
}

/**
 * URL absoluta (para `og:image`): la CDN si hay base, si no el origen del
 * sitio. Un crawler no ejecuta JS: este asset no tiene fallback de runtime.
 */
export function absoluteAssetUrl(
  servedPath: string,
  siteOrigin: string,
  base: string = ASSET_BASE,
  brandBase: string = BRAND_KIT_BASE
): string {
  const url = cdnAssetUrl(servedPath, base, brandBase);
  return /^https?:\/\//i.test(url)
    ? url
    : `${siteOrigin.replace(/\/+$/, "")}${url}`;
}

function normalizeRelative(path: string) {
  return path.replace(/^\/+/, "");
}

export function assetUrl(path: string, kind?: undefined, base?: string): string;
export function assetUrl(key: PaperKey, kind: "papers", base?: string): string;
export function assetUrl(
  pathOrKey: string,
  kind?: "papers",
  base?: string
): string {
  const path =
    kind === "papers" && pathOrKey in ASSET_MANIFEST.papers
      ? ASSET_MANIFEST.papers[pathOrKey as PaperKey]
      : pathOrKey;

  const rel = normalizeRelative(path);
  const resolvedBase = base ?? ASSET_BASE;
  if (!resolvedBase) return rel;
  return `${resolvedBase}/${cdnRepoPath(rel)}`;
}
