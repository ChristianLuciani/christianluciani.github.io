/**
 * IDENTIDAD DEL TEMA EN EL RUNTIME (F1 del pase fresco de #159 · #134).
 *
 * El bundle es UNO para todas las páginas (ADR-001 D12): el tema no puede venir
 * de un import distinto. La página publicada declara su identidad en
 * `<html data-theme="<id>">` (la inyecta `publishPage`), y este módulo la lee al
 * arrancar y la instala como narrativa ACTIVA antes de que i18n, intro y render
 * consulten copy y salas.
 *
 * Por qué un módulo propio y primero en `src/main.ts`: los módulos que capturan
 * copy al importar (histórico del repo) se evaluarían con el default. Con el
 * efecto de arranque en el PRIMER import, el orden de evaluación de ESM resuelve
 * la identidad antes de cualquier otro módulo de la app. Además, i18n/intro ya
 * resuelven en cada init (no capturan al importar), así que este módulo es la
 * única dependencia de orden y no una carrera.
 *
 * Sin `data-theme` (p. ej. `vite dev`, tests, HTML sin publicar) resuelve el
 * default: el comportamiento histórico no cambia.
 */
import { activateTheme, type NarrativeManifest } from "../../themes/index.ts";

/** Forma mínima de `document` que necesita el boot (inyectable en tests). */
export interface ThemeDocument {
  readonly documentElement: {
    readonly dataset: Readonly<Record<string, string | undefined>>;
  };
}

/** Id declarado por la página (`data-theme`), o `undefined` si no declara. */
export function documentThemeId(
  doc: ThemeDocument | undefined = typeof document === "undefined" ? undefined : document
): string | undefined {
  const raw = doc?.documentElement?.dataset?.theme?.trim();
  return raw ? raw : undefined;
}

/**
 * Activa la narrativa del tema de la página. Un id desconocido falla listando
 * los válidos (no se publica el default en silencio en la URL equivocada).
 */
export function bootTheme(doc?: ThemeDocument): NarrativeManifest {
  return activateTheme(documentThemeId(doc) ?? "");
}

// Efecto de arranque del bundle: DEBE correr antes que i18n/intro/render.
bootTheme();
