/**
 * NARRATIVA DEL TEMA `museo` (SPEC §5.4 · ADR-001).
 *
 * El tema default es DATOS: toma la estructura de `SALAS`, el pack de copy del
 * tema y su mapa de ilusiones, y declara la metadata que S5 proyectará a
 * title/og/twitter/canonical. No crea hechos ni duplica valores: cada pieza
 * tiene una sola fuente.
 *
 * `rooms` DERIVA de `SALAS` (no la copia) y aplica la VISIBILIDAD de la curación
 * de ESTE tema (`Curation.exclude`, ids `salas:<id>`): la estructura decide qué
 * salas existen; la curación del tema, cuáles se presentan. Un tema nuevo
 * declara su propio arreglo con SU curación, sin tocar `museo.ts` ni templates.
 */
import { SALAS } from "../../cv/salas.ts";
import { isExcluded } from "../../content/curation/index.ts";
import { factId } from "../../content/curation/keys.ts";
import { MUSEO_CURATION } from "../../content/curation/museo.ts";
import type { NarrativeManifest } from "../types.ts";
import { MUSEO_COPY } from "./copy.ts";
import { MUSEO_ILLUSIONS } from "./illusions.ts";

export const museo: NarrativeManifest = {
  id: "museo",
  // Tema default: publica en la raíz del sitio.
  path: "",
  rooms: SALAS.map((room) =>
    isExcluded(MUSEO_CURATION, factId("salas", room.id)) ? { ...room, hidden: true } : room
  ),
  copy: MUSEO_COPY,
  illusions: MUSEO_ILLUSIONS,
  meta: {
    // title/description son copy del pack (una sola fuente): el `head` los pide
    // por clave hasta S5, que los tomará del manifest.
    title: MUSEO_COPY["meta.title"]!.es,
    description: MUSEO_COPY["meta.description"]!.es,
    // Ruta lógica del asset; S5 la resuelve contra SITE_ORIGIN/SITE_BASE.
    ogImage: "/assets/og-image.png"
  }
};
