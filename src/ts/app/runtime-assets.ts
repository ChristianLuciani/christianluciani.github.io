/**
 * RECURSOS QUE EL RUNTIME PIDE POR URL (SPEC §8 FASE 5.5).
 *
 * El audio ambiental y el laboratorio no viajan en el HTML: los pide JS en
 * tiempo de ejecución (`ambient.ts`, `main.ts`). Una ruta raíz-absoluta cruda
 * (`/audio/…`, `/laboratorio/`) ignora el prefijo de deploy y da 404 cuando el
 * artefacto se sirve bajo `SITE_BASE` — el smoke de assets no lo ve porque
 * parsea HTML. De ahí este módulo: UNA función que compone la URL con la base
 * del build.
 *
 * Vite publica `import.meta.env.BASE_URL` con el `base` que resolvió del
 * manifest del tema (`artifactBase()`); sin Vite (tests, smoke en Node) cae a
 * `/`, que es donde se sirve el artefacto por defecto.
 */
export function runtimeBase(): string {
  const env = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL || "/";
}

/** URL de un recurso del artefacto: `<base>/<ruta relativa>`. */
export function runtimeAsset(rel: string, base = runtimeBase()): string {
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}${rel.replace(/^\/+/, "")}`;
}

/**
 * Pistas de audio (`public/audio/`), por sala. La primera es la de entrada
 * (hero) y la default; `contacto` y `hero` reusan la default.
 * Fuente y licencias: ver el comentario de `ambient.ts`.
 */
export const AUDIO_TRACKS = {
  default: "audio/whale-song.mp3",
  perfil: "audio/room-dolphin.mp3",
  proyectos: "audio/room-forest.mp3",
  experiencia: "audio/room-moo.mp3",
  fisica: "audio/room-s001.mp3",
  competencias: "audio/room-wheezeblow.mp3",
  grafo: "audio/room-constelacion.mp3"
} as const;

/** Laboratorio de propuestas: `proposals/logo-timing` se publica acá. */
export const LAB_ASSET = "laboratorio/";
