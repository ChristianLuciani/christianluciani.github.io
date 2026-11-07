/**
 * CLASIFICACIÓN DE `experience[]` EN EL PRINT-CV (SPEC §5.3 · F1 de #116).
 *
 * La TABLA es per-tema y vive en su curación (`Curation.experienceSections`,
 * p. ej. `curation/museo.ts`). Acá viven sólo las piezas que el renderer
 * COMPARTIDO necesita y que no dependen de un tema: el tipo de sección, el
 * orden de las subsecciones y la resolución de una fila contra una curación
 * cualquiera.
 *
 * Por qué esta separación (review de #128): el print-CV es un renderer
 * compartido; si importara `curation/museo.ts`, todo tema imprimiría su
 * Trayectoria con la tabla de `museo` (ADR-001 §1–§2). El consumidor pasa la
 * curación de su tema (el renderer usa `activeCuration()`).
 */
import { experienceKey } from "./keys.ts";
import type { Curation, ExperienceSectionId } from "./types.ts";

/** Orden en que las subsecciones se imprimen (estructura del print, no del tema). */
export const EXPERIENCE_SECTION_ORDER: readonly ExperienceSectionId[] = [
  "professional",
  "training"
];

/** Sección curada de una fila para ESTA curación; `undefined` si no está. */
export function experienceSectionOf(
  curation: Curation,
  item: { id?: string; org: string; role: { en: string; es?: string }; start: string }
): ExperienceSectionId | undefined {
  const table = curation.experienceSections;
  if (!table) return undefined;
  const key = experienceKey(item);
  return Object.hasOwn(table, key) ? table[key] : undefined;
}
