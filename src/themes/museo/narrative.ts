/**
 * NARRATIVA DEL TEMA `museo` (SPEC §5.4 · ADR-001).
 *
 * El tema default es DATOS: toma la estructura de `SALAS`, el pack de copy del
 * tema y su mapa de ilusiones, y declara la metadata que S5 proyectará a
 * title/og/twitter/canonical. No crea hechos ni duplica valores: cada pieza
 * tiene una sola fuente.
 *
 * `rooms` se DERIVA con la MISMA función que usa cualquier tema
 * (`roomsFromCuration()`, SPEC §5.4): visibilidad por `exclude` (`salas:<id>`),
 * orden por `order.salas` y conteos re-derivados de la curación. `museo` no
 * declara ni grupos ni orden propio, así que la derivación produce exactamente
 * `SALAS` con la galería oculta — el golden lo fija byte a byte (I1). Que el
 * tema default use la MISMA ruta que un tema nuevo es el punto: no hay una
 * derivación «default» y otra «de temas», que es cómo las dos terminan
 * divergiendo.
 */
import { MUSEO_CURATION } from "../../content/curation/museo.ts";
import type { NarrativeManifest } from "../types.ts";
import { roomsFromCuration } from "../rooms.ts";
import { DEFAULT_ORIGIN } from "../site.ts";
import { MUSEO_COPY } from "./copy.ts";
import { MUSEO_ILLUSIONS } from "./illusions.ts";

export const museo: NarrativeManifest = {
  id: "museo",
  // Tema default: publica en la raíz del sitio.
  path: "",
  // Dirección del tema (SPEC §8 FASE 5.5): `SITE_ORIGIN`/`SITE_BASE` la
  // overridean al construir, para migrar de dominio o de prefijo sin tocar el
  // tema.
  site: { origin: DEFAULT_ORIGIN, base: "" },
  rooms: roomsFromCuration(MUSEO_CURATION),
  copy: MUSEO_COPY,
  illusions: MUSEO_ILLUSIONS,
  meta: {
    // title/description son copy del pack (una sola fuente): el head los toma
    // del manifest y un test verifica la paridad contra el pack.
    title: MUSEO_COPY["meta.title"]!.es,
    description: MUSEO_COPY["meta.description"]!.es,
    // Ruta lógica del asset: el publicador la resuelve contra el origen/base.
    ogImage: "/assets/og-image.png"
  }
};
