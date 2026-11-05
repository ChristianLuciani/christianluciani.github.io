/**
 * Contrato de `now/v1` — lo que el sitio consume de `ChristianLuciani/now` (#117).
 * El shape NO se inventa acá: es el `schema/now.schema.json` del productor,
 * pineado en `now.lock.json`. `now.snapshot.json` son sus bytes publicados;
 * `now.generated.ts` es la proyección tipada que escribe `tools/sync-now.ts`.
 *
 * Chrome, no hecho citable: NO entra a JSON-LD, `llms.txt` ni `FAQPage`. Si algo
 * debe ser citable, se promueve a `content/` en profile-data — curado, con fuente.
 */

/** Kinds cerrados de v1 (el schema dice: un kind nuevo es un minor nuevo). */
export type NowKind = "release" | "post" | "pr" | "note";

export interface NowItem {
  readonly kind: NowKind;
  readonly title: string;
  readonly url: string;
  /** `YYYY-MM-DD`, absoluta, tomada de la fuente (nunca calculada al render). */
  readonly date: string;
  /** Procedencia de la fila, p.ej. `github:owner/repo`. */
  readonly source: string;
}

export interface NowSnapshot {
  readonly schema: "now/v1";
  /** Instante del fetch del productor, ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`). */
  readonly asOf: string;
  /** Ordenadas por `date` desc y luego `url` asc: el orden es parte del contrato. */
  readonly items: readonly NowItem[];
}

/** `now.lock.json`: el tag inmutable que el sitio pinea y el digest de sus bytes. */
export interface NowLock {
  readonly repo: string;
  readonly tag: string;
  readonly sha256: string;
}
