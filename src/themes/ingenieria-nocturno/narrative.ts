/**
 * NARRATIVA DE `ingenieria-nocturno` — SEGUNDA PIEL, MISMA NARRATIVA (S10 · #136).
 *
 * Esta entrada NO declara narrativa: es `ingenieria` con otra piel. El manifest
 * se construye reusando POR REFERENCIA (`...ingenieria`) las salas, el pack de
 * copy, las ilusiones, la metadata y la dirección; sólo cambian los campos de
 * IDENTIDAD PUBLICABLE, que no pueden ser los mismos por definición:
 *
 *   · `id`/`path` — publica en `/ingenieria-nocturno/` con su `data-theme`;
 *   · `variantOf` — declara el linaje, y `themes:check` verifica que el resto
 *     sea EL MISMO objeto del base (una copia con el mismo texto es un error).
 *
 * La curación tampoco se declara acá: `CURATIONS["ingenieria-nocturno"]` es la
 * misma entrada que la de `ingenieria` (ver `src/content/curation/index.ts`).
 *
 * QUÉ PRUEBA: piel y narrativa son ejes independientes (ADR-001 §3). Editar
 * `ingenieria/copy.ts` o su curación se refleja en esta página sin tocar nada;
 * lo único que esta piel aporta es su `skin.css` (+ `contrast.ts`). La narrativa
 * nunca se copia: si hiciera falta copiarla, este tema no sería una variante.
 */
import { ingenieria } from "../ingenieria/narrative.ts";
import type { NarrativeManifest } from "../types.ts";

export const ingenieriaNocturno: NarrativeManifest = {
  ...ingenieria,
  id: "ingenieria-nocturno",
  path: "ingenieria-nocturno",
  variantOf: "ingenieria"
};
