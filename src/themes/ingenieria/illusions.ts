/**
 * ILUSIONES DEL TEMA `ingenieria` — roomId → id del canvas que la sala monta.
 *
 * ALCANCE DECLARADO — METADATA, no binding (hasta S8/S9): el binding REAL de
 * sala→canvas vive literal en `ROOM_SHELL`/`ROOM_BODY`
 * (`src/templates/sala_html.ts`) y el montaje en `CANVAS_MODULES`
 * (`src/main.ts`). Ningún renderer lee este mapa ni `SALAS.ilusion`; cablearlo
 * es S8/S9 (ADR-001 §7). Mientras tanto el mapa se DERIVA de `SALAS.ilusion`
 * para no crear una segunda asignación escrita a mano, y
 * `narrative.test.ts` exige IGUALDAD por sala contra el canvas que el
 * `<section>` renderizado contiene —incluida la unicidad: un canvas declarado
 * pertenece a UNA sala—. Si la estructura y el shell divergen, el test falla en
 * vez de dejar una ilusión declarada que la sala no monta.
 *
 * El piloto usa las MISMAS ilusiones que el museo (mismas 8 salas, otra voz y
 * piel): no se edita `src/ts/illusions/**` y no se inventa un canvas.
 * Cuando S8/S9 retire `SALAS.ilusion` (ADR-001 §7), este mapa pasa a literal y
 * el tema queda como fuente única de la asignación.
 */
import { SALAS } from "../../cv/salas.ts";

/** roomId → id de canvas, en el orden de las salas. */
export const INGENIERIA_ILLUSIONS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    SALAS.filter((sala) => sala.ilusion).map((sala) => [sala.id, sala.ilusion!])
  )
);
