/**
 * CONTRASTE de la piel `ingenieria-nocturno` (S10 · #136 · ADR-001 I5).
 *
 * Esta piel tiene EXACTAMENTE las reglas de `ingenieria/skin.css`: cambia los
 * VALORES de los tokens (paleta nocturna) y la densidad, no las combinaciones
 * texto/fondo. Por eso el contrato de pares se reusa POR REFERENCIA: una
 * segunda lista de las mismas combinaciones sería una copia que diverge en
 * silencio. `themes:check` resuelve los ratios contra los tokens de ESTE
 * `skin.css`, así que el gate mide la paleta nocturna, no la de `ingenieria`.
 *
 * El umbral y el `usage` viajan con el par; el ratio se recalcula en cada
 * corrida. Si esta piel necesitara una combinación NUEVA (una regla que la base
 * no tiene), el par se agrega al contrato de `ingenieria` —donde nace el
 * universo de reglas— y el gate la exige en las dos pieles.
 *
 * `AA_DEBT` vacío no es optimismo: la paleta nocturna se eligió para pasar AA;
 * si un par empieza a fallar, el gate falla y hay que corregir el token o
 * declarar la deuda con su razón (no hay permiso heredado).
 */
export { SKIN_CONTRAST_PAIRS, resolvePair } from "../ingenieria/contrast.ts";
import type { ContrastDebt } from "../ingenieria/contrast.ts";

/** Sin deuda: la piel nace con todos sus pares en AA. */
export const AA_DEBT: readonly ContrastDebt[] = [];
