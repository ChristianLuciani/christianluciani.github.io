import { ASSET_MANIFEST, type PaperKey } from "./manifest";

/**
 * Base de la CDN de assets — ADR `docs/cdn-decision.md` (#57/#84).
 *
 * Una sola palanca: `VITE_ASSET_BASE_URL`.
 * - Bundle del navegador: la inyecta Vite (import.meta.env).
 * - Build-time (`build.ts` + templates, Node): se lee de process.env, porque
 *   los templates no pasan por Vite.
 *
 * Vacía = todo se sirve desde GitHub Pages (comportamiento por defecto: el
 * sitio funciona igual sin CDN, que es el fallback declarado del ADR).
 */
function envBase(): string | undefined {
  const fromVite =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_ASSET_BASE_URL
      : undefined;
  if (fromVite) return String(fromVite);
  return typeof process !== "undefined"
    ? process.env?.VITE_ASSET_BASE_URL
    : undefined;
}

/** Valida y normaliza la base: http(s), sin barras finales. Vacío = Pages. */
export function normalizeBase(base: string | undefined | null): string {
  const raw = (base ?? "").trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) {
    throw new Error(
      `VITE_ASSET_BASE_URL debe ser una URL http(s) absoluta (recibido: ${raw})`
    );
  }
  return raw.replace(/\/+$/, "");
}

export const ASSET_BASE = normalizeBase(envBase());

function rootPath(path: string): string {
  return `/${path.replace(/^\/+/, "")}`;
}

/**
 * Ruta **en el repo** de un asset, a partir de la ruta con la que se **sirve**.
 * No son la misma: jsDelivr sirve archivos del repo tal cual, y el build
 * reubica dos familias (ADR §Pipeline, tabla fuente→publicada):
 *   - los 3 favicons viven en `assets/brand/logo/` y se publican planos en
 *     `/assets/brand/` (los copia `vite.config.ts`);
 *   - el OG vive en `public/assets/` y Vite publica `public/` en la raíz.
 * Las 4 thumbs sí coinciden (mismo path en `assets/`).
 */
const SERVED_FROM_PUBLIC = new Set<string>([
  "og-image.png",
  "kontablo2026_thumb-7y4PiTON.jpg",
  "zambrano2023_thumb-DFrmN1Ce.jpg",
  "cabrera2006_thumb-ByivZRQD.jpg",
  "hosaka2006_thumb-KMqoFzTp.jpg",
]);

export function cdnRepoPath(servedPath: string): string {
  const served = rootPath(servedPath);
  const brand = "/assets/brand/";
  if (served.startsWith(brand)) {
    return `assets/brand/logo/${served.slice(brand.length)}`;
  }
  const name = served.startsWith("/assets/") ? served.slice("/assets/".length) : "";
  if (name && SERVED_FROM_PUBLIC.has(name)) return `public/assets/${name}`;
  return served.slice(1);
}

/** URL de un asset servido en la raíz del sitio, resuelta contra la CDN. */
export function cdnAssetUrl(
  servedPath: string,
  base: string = ASSET_BASE
): string {
  const served = rootPath(servedPath);
  return base ? `${base}/${cdnRepoPath(served)}` : served;
}

/**
 * Atributos de un asset con `data-local` (ruta que sirve Pages) para que el
 * runtime pueda degradar (assets/fallback.ts).
 */
export function assetAttrsFor(
  attr: "src" | "href",
  servedPath: string,
  base: string = ASSET_BASE
): string {
  const local = rootPath(servedPath);
  const value = cdnAssetUrl(servedPath, base);
  return value === local
    ? `${attr}="${value}"`
    : `${attr}="${value}" data-local="${local}"`;
}

/** Atributos de un `<img>`: `src` (CDN si hay base) + `data-local` (Pages). */
export function assetAttrs(
  servedPath: string,
  base: string = ASSET_BASE
): string {
  return assetAttrsFor("src", servedPath, base);
}

/**
 * URL absoluta (para `og:image`): la CDN si hay base, si no el origen del
 * sitio. Un crawler no ejecuta JS: este asset no tiene fallback de runtime.
 */
export function absoluteAssetUrl(
  servedPath: string,
  siteOrigin: string,
  base: string = ASSET_BASE
): string {
  const url = cdnAssetUrl(servedPath, base);
  return /^https?:\/\//i.test(url)
    ? url
    : `${siteOrigin.replace(/\/+$/, "")}${url}`;
}

function normalizeRelative(path: string) {
  return path.replace(/^\/+/, "");
}

export function assetUrl(path: string): string;
export function assetUrl(key: PaperKey, kind: "papers"): string;
export function assetUrl(pathOrKey: string, kind?: "papers"): string {
  const path =
    kind === "papers" && pathOrKey in ASSET_MANIFEST.papers
      ? ASSET_MANIFEST.papers[pathOrKey as PaperKey]
      : pathOrKey;

  const rel = normalizeRelative(path);
  if (!ASSET_BASE) return rel;
  return `${ASSET_BASE}/${rel}`;
}
