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
 * `skin`/`label` del contrato `Theme` de ADR-001 llegan con S4 (piel extraída);
 * hasta entonces la entrada del registro ES el `NarrativeManifest`.
 */
import { museo } from "./museo/narrative.ts";
import type { NarrativeManifest, RoomRef } from "./types.ts";

export type { NarrativeManifest, RoomRef } from "./types.ts";

/** Registro: una entrada por tema. S8 añade `ingenieria` con una línea. */
const registry = { museo } as const satisfies Record<string, NarrativeManifest>;
export const THEMES: Readonly<typeof registry> = Object.freeze(registry);

/** Id de un tema registrado. */
export type ThemeId = keyof typeof THEMES;

/** Tema por defecto: publica en la raíz (`path: ""`). */
export const DEFAULT_THEME: ThemeId = "museo";

/** Ids registrados, en el orden de declaración. */
export function themeIds(): ThemeId[] {
  return Object.keys(THEMES) as ThemeId[];
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
 * En el browser el default es `museo` (no hay selector de runtime: ADR-001 §8).
 */
let active: NarrativeManifest = THEMES[DEFAULT_THEME];

/** Narrativa vigente durante el render. */
export function activeNarrative(): NarrativeManifest {
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
