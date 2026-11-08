/**
 * REGISTRO DE NARRATIVAS (SPEC §5.4/§8 FASE 5.3 · ADR-001).
 *
 * FUENTE ÚNICA de temas: acá vive el mapa `id → narrative` y acá se resuelve el
 * selector `SITE_THEME`. Ningún template, CSS ni JS conoce un id de tema: el
 * build lo resuelve una vez (build.ts) y `assembleHtml({ theme })` lo propaga.
 *
 * Por qué la resolución vive acá y no en build.ts: el selector es un contrato
 * del registro (ADR-001 §2). Un id inválido debe fallar listando los válidos
 * desde cualquier punto que resuelva un tema, no sólo desde el CLI.
 *
 * `skin` no vive en la entrada del registro: `NarrativeManifest` se importa en
 * el bundle del browser y la piel exige `node:fs`. S4 la resuelve por id en
 * `src/themes/skin.ts` (`skinFor`), que es el único punto que conoce el archivo
 * de cada tema. `label` del contrato `Theme` de ADR-001 sigue sin uso de render
 * (el nombre visible sale del copy del tema).
 */
import { museo } from "./museo/narrative.ts";
import { ingenieria } from "./ingenieria/narrative.ts";
import { ingenieriaNocturno } from "./ingenieria-nocturno/narrative.ts";
import { resolveThemeAddress } from "./site.ts";
import type { NarrativeManifest, RoomRef } from "./types.ts";

export type { NarrativeManifest, RoomRef } from "./types.ts";
export type { SiteAddress } from "./site.ts";

/**
 * Registro: una entrada por tema. S8 añadió `ingenieria`; S10 (#136) agregó
 * `ingenieria-nocturno`, la SEGUNDA PIEL sobre la misma narrativa: su manifest
 * reusa copy/salas/ilusiones/metadata y su curación es la misma entrada, así
 * que la línea de registro es todo lo que aporta fuera de `skin.css`.
 */
const registry = { museo, ingenieria, "ingenieria-nocturno": ingenieriaNocturno } as const satisfies Record<
  string,
  NarrativeManifest
>;
export const THEMES: Readonly<typeof registry> = Object.freeze(registry);

/** Id de un tema registrado. */
export type ThemeId = keyof typeof THEMES;

/** Tema por defecto: publica en la raíz (`path: ""`). */
export const DEFAULT_THEME: ThemeId = "museo";

/** Ids registrados, en el orden de declaración. */
export function themeIds(): ThemeId[] {
  return Object.keys(THEMES) as ThemeId[];
}

/**
 * Temas que publica un build: `SITE_THEME=<id>` aísla uno; sin selector, el
 * artefacto publica TODO el registro (es lo que corre el deploy). El render
 * fuente (`<repo>/index.html`) es siempre el del tema default: `SITE_THEME` no
 * lo toca, así el archivo commiteado y su golden no dependen del selector.
 */
export function buildThemes(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {}
): NarrativeManifest[] {
  const selector = (env.SITE_THEME ?? "").trim();
  return selector ? [resolveTheme(selector)] : themeIds().map((id) => THEMES[id]);
}

/**
 * Prefijo de deploy del artefacto. Hay UN bundle y UN root de assets, así que
 * todos los temas del build tienen que resolver el mismo `base`; si dos temas
 * declaran prefijos distintos no comparten artefacto y el build falla con la
 * instrucción (publicá ese tema con `SITE_THEME=<id>`).
 */
export function artifactBase(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {}
): string {
  const addresses = buildThemes(env).map((theme) => resolveThemeAddress(theme, env));
  const bases = new Map(addresses.map((address) => [address.path, address.base]));
  const distinct = new Set(bases.values());
  if (distinct.size > 1) {
    const detail = [...bases]
      .map(([path, base]) => `"${path || "/"}"→"${base || "/"}"`)
      .join(", ");
    throw new Error(
      `themes: los temas del build declaran prefijos de deploy distintos (${detail}); ` +
        "comparten un solo bundle de assets. Publicá cada uno como artefacto propio con SITE_THEME=<id>."
    );
  }
  return addresses[0].base;
}

/** Guard de id: sólo claves PROPIAS del registro (no `toString`, `__proto__`, …). */
export function isThemeId(raw: string): raw is ThemeId {
  return Object.hasOwn(THEMES, raw);
}

/**
 * Resuelve `SITE_THEME` → narrativa.
 *
 * Ausente/vacío/espacios ⇒ tema default. Id desconocido ⇒ error que lista los
 * válidos: un typo en el build no puede publicar en silencio el tema default
 * con otra URL.
 */
export function resolveTheme(raw?: string | null): NarrativeManifest {
  const selector = (raw ?? "").trim();
  if (!selector) return THEMES[DEFAULT_THEME];
  if (isThemeId(selector)) return THEMES[selector];
  throw new Error(
    `themes: SITE_THEME="${selector}" no es un tema válido. ` +
      `Temas válidos: ${themeIds().join(", ")} (default: ${DEFAULT_THEME})`
  );
}

/**
 * NARRATIVA ACTIVA — estado de render, explícito y acotado.
 *
 * Los renderers (`src/templates/**`) piden copy y salas por funciones, no por
 * imports fijos: así el tema es un parámetro. El estado existe porque el tema
 * atraviesa ~11 módulos de template sin pasarlo por cada firma; `withNarrative`
 * lo instala de forma SÍNCRONA y lo restaura en `finally`, de modo que un error
 * de render no deja el proceso con otra narrativa.
 *
 * En el browser la identidad la publica la página (`<html data-theme>`, la
 * inyecta `publishPage`); `src/ts/app/theme.ts` llama a `activateTheme()` en el
 * primer import del bundle, ANTES de i18n/intro/render. Sin atributo, default.
 */
let active: NarrativeManifest = THEMES[DEFAULT_THEME];

/** Narrativa vigente durante el render. */
export function activeNarrative(): NarrativeManifest {
  return active;
}

/**
 * Instala la narrativa del tema y la DEJA activa (a diferencia de
 * `withNarrative`, que la restaura). Es el arranque del browser: el bundle es
 * compartido y la página publica su identidad en `data-theme`.
 */
export function activateTheme(raw?: string | null): NarrativeManifest {
  active = resolveTheme(raw);
  return active;
}

/** Salas de la narrativa vigente, en orden DOM. */
export function activeRooms(): readonly RoomRef[] {
  return active.rooms;
}

/** Instala una narrativa para el alcance de `render` y restaura la anterior. */
export function withNarrative<T>(narrative: NarrativeManifest, render: () => T): T {
  const previous = active;
  active = narrative;
  try {
    return render();
  } finally {
    active = previous;
  }
}
