/**
 * Presentación ES del `org` del SSOT (SPEC §11/§15.6) — ÚNICA fuente para todas
 * las superficies que imprimen experiencia: la página (El Friso, vía `museo.ts`)
 * y el print-CV. Una sola implementación evita que página y PDF localicen
 * distinto.
 *
 * REGLA: el `org` es un string INVARIANTE (nunca langMap). Los nombres propios
 * NO se traducen: sólo se presenta en ES el rol del empleador ("Independent"),
 * el país ("Panama", "Mexico") y la glosa "(scholarship)", que el SSOT guarda en
 * inglés porque forman parte del string.
 *
 * Se reemplaza por TOKEN COMPLETO — segmentos aislados por ` — `, `-`, `/`,
 * coma o paréntesis — y nunca por substring: «New Mexico State University»,
 * «Independent University» y «Panama Canal Authority» son nombres propios y
 * quedan intactos, igual que «Fluge-Panamá» o un «Panamá» ya en ES. El EN se
 * recupera del string original vía los pares ES→EN (`src/content/cv/i18n.ts`).
 */
const ORG_ES: Readonly<Record<string, string>> = {
  Independent: "Independiente",
  Panama: "Panamá",
  Mexico: "México",
  scholarship: "beca"
};

/** Separadores que aíslan un token: guion, slash, coma y paréntesis. */
const ORG_SEPARATOR = /(\s+[—–-]\s+|\s*\/\s*|\s*,\s*|\s*\(|\))/;

/** `org` del SSOT → presentación ES; el EN vuelve al string original vía i18n. */
export function orgEs(org: string): string {
  return org
    .split(ORG_SEPARATOR)
    .map((part) => (Object.prototype.hasOwnProperty.call(ORG_ES, part) ? ORG_ES[part] : part))
    .join("");
}
