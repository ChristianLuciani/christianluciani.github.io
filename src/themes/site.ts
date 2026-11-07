/**
 * DIRECCIÓN DEL SITIO (SPEC §8 FASE 5.5 · ADR-001 D12).
 *
 * Cada tema declara en su manifest (`narrative.site`) el origen y el prefijo de
 * deploy con el que se publica; `SITE_ORIGIN`/`SITE_BASE` los OVERRIDEAN al
 * construir. La dirección de una página es `<origin><base><path>/`:
 *
 *   · `path`   — el subpath del TEMA (`NarrativeManifest.path`): dónde vive su
 *                `index.html`. No duplica assets: el bundle y `public/` se
 *                publican una vez en la raíz del artefacto, así que las rutas
 *                del documento son raíz-absolutas y resuelven desde cualquier
 *                subpath.
 *   · `origin` — esquema + host; gobierna `canonical`/`og:url`/`og:image` y el
 *                `sitemap`. No se escribe en el documento renderizado: lo
 *                aplica `src/artifact/pages.ts` al publicar, de modo que el
 *                golden del tema default queda intacto (invariante del epic).
 *   · `base`   — prefijo con el que se sirve el artefacto (`""` = raíz). Es del
 *                artefacto, no de la página: los temas que comparten un build
 *                tienen que declararlo igual (`artifactBase` lo exige), porque
 *                hay un solo bundle y un solo root de assets. Un tema con otro
 *                prefijo se publica como artefacto propio (`SITE_THEME=<id>`).
 *
 * Nada de esto se hardcodea en templates: los únicos que lo consumen son el
 * publicador (`src/artifact/pages.ts`), el build y el smoke de assets.
 */
import type { NarrativeManifest } from "./types.ts";

/** Origen canónico del sitio (default del tema `museo`). */
export const DEFAULT_ORIGIN = "https://christianluciani.github.io";

/** Dirección publicada de una página: origen + prefijo de deploy + path. */
export interface SiteAddress {
  readonly origin: string;
  readonly base: string;
  readonly path: string;
}

/** Origen del tema: `SITE_ORIGIN` (deploy) o el declarado en su manifest. */
export function normalizeOrigin(
  raw: string | undefined | null,
  envName = "SITE_ORIGIN"
): string {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  if (!value) return DEFAULT_ORIGIN;
  // Sólo esquema + host (+ puerto opcional): un path acá haría que la canónica
  // viva en `/foo/` mientras los assets raíz-absolutos quedan en `/assets/**`
  // → 404 con la canónica "válida". El prefijo es `SITE_BASE` y el subpath es
  // `path` del tema; el origen no lleva path.
  if (!/^https?:\/\/[^/?#\s]+$/i.test(value)) {
    throw new Error(`${envName} debe ser un origen http(s) sin path (recibido: ${raw})`);
  }
  return value;
}

/**
 * Prefijo de deploy: `""`/ausente ⇒ raíz. Con valor debe empezar con `/`, no
 * terminar en `/` y no tener `//` ni segmentos `.`/`..`: un prefijo inválido
 * produce URLs que nunca resuelven, y el build no puede adivinarlo.
 */
export function normalizeDeployBase(
  raw: string | undefined | null,
  envName = "SITE_BASE"
): string {
  const value = (raw ?? "").trim();
  if (!value || value === "/") return "";
  if (value.includes("//") || /[?#\s]/.test(value)) {
    throw new Error(`${envName} inválido (recibido: ${value})`);
  }
  const withSlash = value.startsWith("/") ? value : `/${value}`;
  const segments = withSlash.replace(/\/+$/, "").split("/").slice(1);
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`${envName} inválido (recibido: ${value})`);
  }
  return `/${segments.join("/")}`;
}

/**
 * `path` del tema: `""` = raíz del artefacto; si no, uno o más segmentos
 * `[a-z0-9-]` separados por `/`. Se valida al construir, así que una ruta con
 * mayúsculas o `..` es un error de declaración, no del render.
 */
export function normalizeThemePath(raw: string): string {
  const value = raw.trim().replace(/^\/+|\/+$/g, "");
  if (!value) return "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(value)) {
    throw new Error(`themes: path "${raw}" no es un subpath válido ([a-z0-9-] por segmento)`);
  }
  return value;
}

/**
 * Dirección publicada de un tema: su manifest + los overrides de deploy.
 * Los templates no la leen (el documento es independiente de la dirección); la
 * usan el publicador, el build y el smoke.
 */
export function resolveThemeAddress(
  theme: NarrativeManifest,
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {}
): SiteAddress {
  return {
    origin: normalizeOrigin(env.SITE_ORIGIN ?? theme.site.origin),
    base: normalizeDeployBase(env.SITE_BASE ?? theme.site.base),
    path: normalizeThemePath(theme.path)
  };
}

/** URL canónica de la página de un tema: `<origin><base><path>/`. */
export function pageUrl(address: SiteAddress): string {
  return `${address.origin}${address.base}${address.path ? `/${address.path}` : ""}/`;
}

/** Ruta con la que el artefacto SIRVE un asset: `<base>/<ruta-raíz>`. */
export function servedAssetPath(servedPath: string, address: SiteAddress): string {
  return `${address.base}/${servedPath.replace(/^\/+/, "")}`;
}
