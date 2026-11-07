/**
 * Acceso al pack de copy del tema vigente.
 *
 * Los renderers NO importan el pack directo: piden `t()`/`th()` acá. Así el
 * template no conoce el id del tema (ADR-001 §2): el pack vigente es el de la
 * narrativa activa del registro (`src/themes/index.ts`), que `assembleHtml({
 * theme })` instala y restaura.
 *
 * `t()`  → devuelve el copy con markup tal cual (títulos con <em>, <br>).
 * `th()` → escapa &, < y > para inyectar texto plano en HTML sin cambiar los
 *          bytes del render (un `&` del copy debe salir `&amp;` en el markup).
 *
 * Clave inexistente = error de build, nunca un fallback silencioso: un template
 * que pide copy que no existe es un bug, no un caso borde.
 */
import { activeNarrative } from "../themes/index.ts";
import { pairsOf, type CopyEntry, type CopyPack } from "../themes/types.ts";

/**
 * Pack vigente: el de la narrativa activa (default `museo`), no una copia.
 * Función y no constante: el pack cambia con el tema del render.
 */
export function activeCopy(): CopyPack {
  return activeNarrative().copy;
}

/** Entrada de copy completa (ES + EN) de una clave semántica. */
export function copy(key: string): CopyEntry {
  const entry = activeCopy()[key];
  if (!entry) {
    throw new Error(`copy: no existe la clave "${key}" en el pack del tema vigente`);
  }
  return entry;
}

/** Copy ES con markup (para interpolación directa en el HTML). */
export function t(key: string): string {
  return copy(key).es;
}

/** Copy ES para un VALOR DE ATRIBUTO: escapa & < > " y '. */
export function ta(key: string): string {
  return copy(key).es
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Copy EN con markup (texto, no atributo). */
export function te(key: string): string {
  return copy(key).en;
}

/** Copy EN para un VALOR DE ATRIBUTO: escapa & < > " y '. */
export function tae(key: string): string {
  return copy(key).en
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Copy ES como texto plano: escapa &, < y > sin tocar el resto. */
export function th(key: string): string {
  return copy(key).es.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Pares ES→EN del pack (los consume el diccionario i18n). */
export function copyPairs(): Record<string, string> {
  return pairsOf(activeCopy());
}
