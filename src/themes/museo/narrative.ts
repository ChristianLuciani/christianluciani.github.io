/**
 * NARRATIVA DEL TEMA `museo` (SPEC §5.4 · ADR-001).
 *
 * El tema default es DATOS: toma la estructura de `SALAS`, el pack de copy del
 * tema y su mapa de ilusiones, y declara la metadata que S5 proyectará a
 * title/og/twitter/canonical. No crea hechos ni duplica valores: cada pieza
 * tiene una sola fuente.
 *
 * `rooms` referencia `SALAS` (no la copia): mientras `museo` sea la única
 * narrativa, la estructura vigente es la suya; un tema nuevo declara su propio
 * arreglo (subconjunto/reordenamiento) sin tocar templates ni esta estructura.
 */
import { SALAS } from "../../cv/salas.ts";
import type { NarrativeManifest } from "../types.ts";
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
  rooms: SALAS,
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
