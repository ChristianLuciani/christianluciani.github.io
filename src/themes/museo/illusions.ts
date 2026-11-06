/**
 * ILUSIONES DEL TEMA `museo` — roomId → id del canvas que la sala monta.
 *
 * ADR-001 §7: la ilusión pertenece a la PIEZA (narrativa/piel), no a la
 * estructura. Hoy la asignación vive en `SALAS.ilusion` y este módulo la DERIVA
 * en vez de copiarla: duplicar los ids crearía una segunda fuente que puede
 * quedar stale sin que nadie la vea. Cuando S8/S9 retire `ilusion` de la
 * estructura (contrato de tema nuevo), este mapa pasa a ser literal para
 * `museo` y cada tema declara el suyo.
 *
 * `narrative.test.ts` verifica que cada canvas asignado exista en el documento
 * renderizado: un id muerto rompe el canvas de la sala en silencio.
 */
import { SALAS } from "../../cv/salas.ts";

/** roomId → id de canvas, en el orden de las salas. */
export const MUSEO_ILLUSIONS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    SALAS.filter((sala) => sala.ilusion).map((sala) => [sala.id, sala.ilusion!])
  )
);
