/**
 * CONTRATO DEL PACK DE COPY (SPEC §8 FASE 5 · ADR-001).
 *
 * Un pack de copy es la ÚNICA fuente del texto visible de una narrativa: los
 * renderers no contienen literales, piden claves. Cada clave tiene ES y EN
 * completos (invariante I4: `copy.test.ts` falla si falta una).
 *
 * Por qué claves semánticas y no el texto como clave: el i18n histórico keyeaba
 * por el string EXACTO del DOM (240 claves, 20 huérfanas). Un cambio de coma en
 * un título rompía su traducción en silencio y nadie lo veía hasta producción.
 * Con claves, el nombre sobrevive al texto.
 *
 * `runtime: true` marca copy que el HTML inicial NO contiene de forma
 * garantizada: lo monta el runtime (frases del intro, labels del canvas del
 * grafo) o depende del estado (feed vacío, niveles de idioma ausentes). El gate
 * de claves huérfanas verifica contra `assembleHtml()`, así que esas claves se
 * declaran explícitamente en lugar de borrarse por parecer muertas.
 */
export type Lang = "es" | "en";

/** Par ES/EN de una clave. `en` vacío es un error del gate, no un fallback. */
export interface CopyEntry {
  readonly es: string;
  readonly en: string;
  /** true → el copy no aparece en el HTML inicial (lo monta el runtime). */
  readonly runtime?: boolean;
}

/** Claves semánticas (`hero.tagline`, `room.perfil.quote`, …) → par ES/EN. */
export type CopyPack = Readonly<Record<string, CopyEntry>>;

/**
 * SALA DE UNA NARRATIVA (SPEC §5.4: `rooms` = ids, orden y metáfora).
 *
 * Es la forma mínima que los renderers necesitan de una sala; `SalaDef`
 * (`src/cv/salas.ts`) la satisface estructuralmente. Un tema puede declarar un
 * subconjunto o reordenar estas entradas sin tocar templates.
 *
 * `ilusion` sobrevive acá SÓLO mientras `SALAS` la siga declarando (ADR-001 §7:
 * la ilusión pertenece a la narrativa). El manifest del tema la expone en
 * `illusions`; un tema nuevo NO debe usar este campo.
 */
export interface RoomRef {
  /** id del <section> sin prefijo: `perfil` → `<section id="room-perfil">` */
  readonly id: string;
  readonly titulo: string;
  readonly tituloEn: string;
  readonly subtitulo: string;
  readonly subtituloEn: string;
  readonly funcion: string;
  readonly funcionEn: string;
  readonly navLabel: string;
  readonly navLabelEn: string;
  /** true → sala oculta: no se numera, no entra al HUD ni al plano. */
  readonly hidden?: boolean;
  /** @deprecated ADR-001 §7: la asigna el tema en `illusions`, no la estructura. */
  readonly ilusion?: string;
}

/**
 * NARRATIVA DE UN TEMA (SPEC §5.4 · ADR-001 §2).
 *
 * Datos, no código: estructura (salas), voz (copy), ilusiones y metadata. El
 * registro de temas (`src/themes/index.ts`) es la única fuente de ids y el
 * único lugar donde se resuelve `SITE_THEME`; ningún template conoce el id.
 */
export interface NarrativeManifest {
  /** slug estable `[a-z0-9-]`, único en `THEMES` (= clave del registro). */
  readonly id: string;
  /** subpath de publicación: `""` = raíz del sitio. */
  readonly path: string;
  /**
   * Dirección de publicación del tema (SPEC §8 FASE 5.5): origen y prefijo de
   * deploy. `SITE_ORIGIN`/`SITE_BASE` los overridean al construir
   * (`src/themes/site.ts`); el `path` del tema se suma al `base`.
   */
  readonly site: {
    readonly origin: string;
    readonly base: string;
  };
  /**
   * VARIANTE DE PIEL (S10 · #136). Id de un tema registrado cuya narrativa y
   * curación esta entrada REUSA por referencia (import, nunca copia): sólo su
   * `skin.css` difiere. Existe porque piel y narrativa son ejes independientes
   * (ADR-001 §3) y copiar el copy para "cambiar colores" lo demuestra al revés.
   * `themes:check` exige identidad de `copy`/`rooms`/`illusions`/`meta` y de la
   * curación con el base: editar el copy del tema base se refleja acá sin tocar
   * nada, y una copia con el mismo texto es un error, no un equivalente.
   */
  readonly variantOf?: string;
  /** Salas incluidas, en orden DOM (incluye las ocultas). */
  readonly rooms: readonly RoomRef[];
  /**
   * Declaración de piel (F4 del pase fresco de #159). Omitido/`"own"` ⇒ el tema
   * debe traer `skin.css` propio y el gate lo certifica; `"inherit"` ⇒ hereda
   * explícitamente la piel del default (y no puede tener `skin.css` propio).
   * Existe para que borrar un `skin.css` no se lea como herencia por diseño.
   */
  readonly skin?: "own" | "inherit";
  /** Pack de copy 100% ES/EN (I4). */
  readonly copy: CopyPack;
  /** roomId → id de canvas existente (ADR-001 §7). */
  readonly illusions: Readonly<Record<string, string>>;
  /** Metadata del tema; el publicador la proyecta a title/og/twitter/canonical. */
  readonly meta: {
    readonly title: string;
    readonly description: string;
    readonly ogImage: string;
  };
}

/** Clave del diccionario: el walker i18n compara con `norm()` (espacios
 * colapsados) sobre el nodo de texto. Si el pack no normaliza igual, una clave
 * con sangría o salto de línea nunca matchea y la traducción muere en silencio. */
function normKey(s: string): string {
  return s.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Pares ES→EN del pack, en el orden de declaración. Omite es === en. */
export function pairsOf(pack: CopyPack): Record<string, string> {
  const pairs: Record<string, string> = {};
  for (const [key, entry] of Object.entries(pack)) {
    if (!entry.es || !entry.en) {
      throw new Error(`copy: la clave "${key}" no tiene ES y EN completos`);
    }
    if (entry.es !== entry.en) pairs[normKey(entry.es)] = entry.en;
  }
  return pairs;
}
