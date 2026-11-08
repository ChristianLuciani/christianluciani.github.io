/**
 * DERIVACIÓN CANÓNICA DE `rooms` (SPEC §5.4 · ADR-001 §Contratos · S9 · #135).
 *
 * Un tema NO copia salas ni reimplementa el cruce con su curación: declara su
 * VOZ (rótulos de presentación) y llama acá. Esta función aplica, en un solo
 * lugar y para todos los temas:
 *
 *   1. VISIBILIDAD — `salas:<id>` en `exclude` ⇒ `hidden: true` (la sala sigue
 *      en `rooms` y en el DOM: ocultar no borra).
 *   2. ORDEN — `order.salas` de la curación del tema; lo no declarado conserva
 *      el orden de `SALAS`. La curación es el ÚNICO lever del orden de salas,
 *      igual que `order.proyectos` lo es de las tarjetas (`curatedOrder`).
 *   3. CONTEOS — los subtítulos que cuentan fichas (`proyectos`, `bastidor`)
 *      se re-derivan de la curación RECIBIDA, no del default compartido
 *      (`subtitulosCurados`): un tema que excluye una ficha no puede publicar
 *      el número del tema default.
 *   4. VOZ — los rótulos del tema (`titulo`, `navLabel`, `funcion`, …).
 *
 * Las salas ocultas se anexan al final (en orden de `SALAS`), así el orden DOM
 * de las visibles es exactamente el de la curación y `ROOM_EN` —posicional
 * sobre `rooms`— sigue casando con los `.room-title` del documento.
 *
 * Por qué existe (bug de contrato): antes cada `narrative.ts` repetía el
 * `SALAS.map(...)` con la visibilidad, y el orden de salas no tenía consumidor
 * —`order.salas` estaba tipado pero nadie lo leía—, así que «reordenar» exigía
 * tocar el tema de otra forma. El gate (`themes:check`) ahora exige que el
 * orden visible de `rooms` coincida con `order.salas` cuando se declara.
 */
import { SALAS, subtitulosCurados, type SalaDef } from "../cv/salas.ts";
import { isExcluded } from "../content/curation/index.ts";
import { factId } from "../content/curation/keys.ts";
import type { Curation } from "../content/curation/types.ts";
import type { RoomRef } from "./types.ts";

/** Rótulos de presentación del tema, por id de sala. `subtitulo` se re-deriva. */
export type RoomVoice = Readonly<Record<string, Partial<RoomRef>>>;

/** Salas del tema `curation`, en orden DOM, con la voz aplicada. */
export function roomsFromCuration(
  curation: Curation,
  voice: RoomVoice = {}
): RoomRef[] {
  const position = new Map(
    (curation.order?.salas ?? []).map((id, index) => [id, index] as const)
  );
  const hiddenIds = new Set(
    SALAS.filter((room) => isExcluded(curation, factId("salas", room.id))).map(
      (room) => room.id
    )
  );
  const included = SALAS.filter((room) => !hiddenIds.has(room.id));
  const hidden = SALAS.filter((room) => hiddenIds.has(room.id));
  const sorted: SalaDef[] = [...included].sort(
    (a, b) =>
      (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (position.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );
  return [...sorted, ...hidden].map((room) => {
    const counts = subtitulosCurados(room.id, curation);
    return {
      ...room,
      ...(counts ? { subtitulo: counts.es, subtituloEn: counts.en } : {}),
      ...(voice[room.id] ?? {}),
      ...(hiddenIds.has(room.id) ? { hidden: true } : {})
    };
  });
}
