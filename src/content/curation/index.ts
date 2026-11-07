/**
 * REGISTRO DE CURACIONES (SPEC §5.3/§5.5 · ADR-001 §6).
 *
 * Una curación por tema, igual que una narrativa por tema: `THEMES` decide qué
 * se ve (narrativa) y este registro qué se presenta (curación). La clave es el
 * `id` del tema, no una ruta: un tema nuevo agrega una línea y su curación.
 *
 * El default ES la curación de `museo` (tema que publica en la raíz y único
 * registrado hoy). Cuando #131/#134 pasen el tema por el build, el consumidor
 * correcto es `curationFor(narrative.id)`; mientras tanto los módulos de datos
 * usan `DEFAULT_CURATION` y un test exige que TODO tema registrado tenga
 * entrada acá (agregar `ingenieria` sin su curación pone el suite rojo).
 *
 * No importa `src/themes/index.ts` a propósito: themes → salas → data/proyectos
 * → este módulo. Importar el registro de temas acá cerraría el ciclo.
 */
import { MUSEO_CURATION } from "./museo.ts";
import { factId } from "./keys.ts";
import type { CollectionId, Curation } from "./types.ts";

export const CURATIONS: Readonly<Record<string, Curation>> = Object.freeze({
  museo: MUSEO_CURATION
});

/** Curación del tema default (hoy, la única). */
export const DEFAULT_CURATION: Curation = MUSEO_CURATION;

/** Curación de un tema registrado; un id desconocido lista los válidos. */
export function curationFor(themeId: string): Curation {
  const curation = CURATIONS[themeId];
  if (!curation) {
    throw new Error(
      `curation: "${themeId}" no tiene curación registrada. ` +
        `Temas con curación: ${Object.keys(CURATIONS).join(", ")}`
    );
  }
  return curation;
}

/** ¿El hecho está incluido? Los ids son `colección:clave` (ver `keys.ts`). */
export function isIncluded(curation: Curation, id: string): boolean {
  return curation.include.includes(id);
}

/** ¿El hecho está excluido? (la razón vive en `exclude`, no hace falta acá). */
export function isExcluded(curation: Curation, id: string): boolean {
  return curation.exclude.some((exclusion) => exclusion.id === id);
}

/**
 * CONSUMIDOR CANÓNICO de la curación: filtra lo excluido y ordena con
 * `order[colección]`. Es el helper que documenta `docs/CREAR-TEMA.md` §5 y el
 * que usan `proyectosDe()`/`publicacionesDe()`: un tema que lo copie no puede
 * publicar en el orden del SSOT por olvidarse de `order`.
 *
 * `keyOf` deriva la clave estable del hecho (ver `keys.ts`). Un ítem fuera del
 * `order` declarado queda al final (orden estable del SSOT): el reporte I3 lo
 * marca en rojo si la curación quedó incompleta, pero el render no pierde la fila.
 */
export function curatedOrder<T>(
  curation: Curation,
  collection: CollectionId,
  items: readonly T[],
  keyOf: (item: T) => string
): T[] {
  const position = new Map((curation.order?.[collection] ?? []).map((key, index) => [key, index]));
  return items
    .filter((item) => !isExcluded(curation, factId(collection, keyOf(item))))
    .sort(
      (a, b) =>
        (position.get(keyOf(a)) ?? Number.MAX_SAFE_INTEGER) -
        (position.get(keyOf(b)) ?? Number.MAX_SAFE_INTEGER)
    );
}

export type { Curation, CollectionId } from "./types.ts";
export { MUSEO_CURATION } from "./museo.ts";
