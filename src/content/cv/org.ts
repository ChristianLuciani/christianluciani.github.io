/**
 * Presentación ES del `org` del SSOT (SPEC §11/§15.6) — módulo compartido por
 * TODAS las superficies que imprimen experiencia: la página (El Friso) y el
 * print-CV. Una sola implementación evita que página y PDF no localicen igual.
 *
 * REGLA: el `org` es un string invariante (nunca langMap). Los nombres propios
 * NO se traducen; sólo se presenta en ES el rol del empleador ("Independent"),
 * el país y la glosa que el SSOT guarda en inglés por formar parte del string.
 * El reemplazo es por TOKEN COMPLETO (no substring): "Panamá" ya en ES o
 * "Fluge-Panamá" no se tocan, y "New Mexico" no es el país México.
 *
 * PENDIENTE #118 (rama `dsh/sprint/109`): `museo.ts` ya tiene una copia local de
 * `orgEs`. Al mergear, esa rama debe importar ESTA función y borrar su copia
 * (además, su `\bMexico\b` actual corrompería "New Mexico State University").
 */
const NEW_MEXICO = /\bNew\s+$/;

/** `org` del SSOT → presentación ES; el EN se recupera del string original. */
export function orgEs(org: string): string {
  return org
    .replace(/\bIndependent\b/g, "Independiente")
    .replace(/\bPanama\b/g, "Panamá")
    .replace(/\bMexico\b/g, (match, offset: number, full: string) =>
      NEW_MEXICO.test(full.slice(0, offset)) ? match : "México"
    )
    .replace(/\(scholarship\)/g, "(beca)");
}
