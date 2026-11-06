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
