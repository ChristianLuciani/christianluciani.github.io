/**
 * DERIVACIÓN CANÓNICA DE `rooms` (SPEC §5.4 · ADR-001 §Contratos · S9 · #135).
 *
 * Un tema NO copia salas ni reimplementa el cruce con su curación: declara su
 * VOZ (rótulos de presentación) y llama acá. Esta función aplica, en un solo
 * lugar y para todos los temas:
 *
 *   1. VISIBILIDAD — `salas:<id>` en `exclude` ⇒ `hidden: true` (la sala sigue
 *      en `rooms` y en el DOM: ocultar no borra).
 *   2. ORDEN — `order.salas` de la curación del tema. Cuando se declara es
 *      COMPLETO: nombra todas las salas visibles, porque `validateCuration`
 *      exige que `order` cubra todo hecho incluido (un orden parcial dejaría
 *      salas en un orden no declarado). La curación es el ÚNICO lever del orden
 *      de salas, igual que `order.proyectos` lo es de las tarjetas.
 *   3. CONTEOS — los subtítulos que cuentan fichas (`proyectos`, `bastidor`)
 *      se re-derivan de la curación RECIBIDA, no del default compartido
 *      (`subtitulosCurados`): un tema que excluye una ficha no puede publicar
 *      el número del tema default.
 *   4. VOZ — los rótulos del tema (`titulo`, `navLabel`, `funcion`, …).
 *
 * Las salas ocultas se anexan al final (en orden de `SALAS`), así el orden DOM
 * de las visibles es exactamente el de la curación y `ROOM_EN` —posicional
 * sobre `rooms`— sigue casando con los `.room-title` del documento. El
 * `?? MAX_SAFE_INTEGER` del comparador es DEFENSA (una sala sin posición no
 * rompe el render): no es un contrato alcanzable — un `order.salas` declarado
 * que omita una sala visible lo rechazan `validateCuration` y `themes:check`.
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

/**
 * Rótulos de PRESENTACIÓN del tema, por id de sala: la voz renombra la metáfora,
 * no decide la estructura. Quedan fuera `id`, `hidden` y `subtitulo` (este último
 * se re-deriva de la curación: dejar que la voz lo pise permitiría publicar un
 * conteo que la sala desmiente — F4 del pase fresco de #165).
 */
export type RoomVoice = Readonly<
  Record<
    string,
    Partial<Pick<RoomRef, "titulo" | "tituloEn" | "funcion" | "funcionEn" | "navLabel" | "navLabelEn">>
  >
>;

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
    // La voz se COMPONE campo por campo, nunca se esparce: así una voz que en
    // runtime traiga de más (`hidden`, `subtitulo`, `id`) no puede pisar la
    // estructura ni el conteo re-derivado. `RoomVoice` ya lo impide en compile
    // time; esto lo sostiene en runtime (F4 del pase fresco de #165).
    const v = voice[room.id] ?? {};
    return {
      ...room,
      titulo: v.titulo ?? room.titulo,
      tituloEn: v.tituloEn ?? room.tituloEn,
      funcion: v.funcion ?? room.funcion,
      funcionEn: v.funcionEn ?? room.funcionEn,
      navLabel: v.navLabel ?? room.navLabel,
      navLabelEn: v.navLabelEn ?? room.navLabelEn,
      subtitulo: counts?.es ?? room.subtitulo,
      subtituloEn: counts?.en ?? room.subtituloEn,
      ...(hiddenIds.has(room.id) ? { hidden: true } : {})
    };
  });
}
