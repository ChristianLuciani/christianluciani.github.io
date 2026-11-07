/**
 * CLAVES ESTABLES DE LOS HECHOS (SPEC §5.3).
 *
 * La proyección pública (`src/data/profile.types.ts`) no expone `id` de fila en
 * `projects`, `publications` ni `experience` (el snapshot commitea sólo los
 * campos que el CV usa). Hasta que lo haga, la curación referencia esos hechos
 * por una clave DERIVADA y determinista:
 *
 *   · proyectos   → nombre corto del SSOT (`projectKey`, ya en `cv/proyectos`)
 *   · publicaciones → DOI; si no hay, la URL; si tampoco, el título
 *   · experiencia → `id` si existe; si no, `org|role.es|start`
 *
 * Es la misma excepción declarada de SPEC §5.3: la clave se rompe RUIDOSO si el
 * hecho cambia (el reporte nombra el id sin decisión) en vez de clasificar mal
 * en silencio. `experienceKey` vive acá —y no en `print.ts`— para que la
 * curación del print y el universo de cobertura usen UNA sola definición.
 *
 * El id de un hecho es `colección:clave`. El prefijo namespacea la decisión:
 * `proyectos:Kontablo` y `artefactos:kontablo-accounting-esperanto` no
 * colisionan aunque sus claves se parezcan.
 */
import type { LangText } from "../../data/profile.types.ts";
import type { CollectionId } from "./types.ts";

/** Clave estable de una fila de `experience[]` (ver excepción en SPEC §5.3). */
export function experienceKey(item: {
  id?: string;
  org: string;
  role: LangText;
  start: string;
}): string {
  if (item.id) return item.id;
  return `${item.org}|${item.role.es ?? item.role.en}|${item.start}`;
}

/** Clave estable de una publicación: DOI > URL > título. */
export function publicationKey(item: { doi?: string; url?: string; title: string }): string {
  if (item.doi) return item.doi;
  if (item.url) return item.url;
  return item.title;
}

/** Id de un hecho: `colección:clave`. */
export function factId(collection: CollectionId, key: string): string {
  return `${collection}:${key}`;
}

/** Descompone un id `colección:clave` (la clave puede contener `:`). */
export function splitFactId(id: string): { collection: string; key: string } | undefined {
  const at = id.indexOf(":");
  if (at <= 0) return undefined;
  return { collection: id.slice(0, at), key: id.slice(at + 1) };
}
