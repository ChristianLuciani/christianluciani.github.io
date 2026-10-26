/**
 * fidelity-verdict.mjs — política del gate de fidelidad, en funciones puras (#75).
 * La adquisición (Chrome, dump-dom) no se puede probar en CI; el veredicto sí.
 * Contrato: 0 limpio · 1 el puerto difiere · 2 no se pudo medir (el mismo del
 * gate hermano `verify-motion.mjs`): sin esa distinción, un runner roto se lee
 * como drift de geometría.
 */

/** outcome por versión → el veredicto de la corrida. */
export const OUTCOME = { ok: "ok", drift: "diverge", unmeasured: "no se pudo medir" };

/**
 * exitCodeFor([{version, outcome}]) → 0 | 1 | 2.
 * Un drift medido GANA: si algo difirió, la corrida midió. Sin resultados (no se
 * midió nada) es 2, nunca 0.
 */
export function exitCodeFor(results) {
  const list = results ?? [];
  if (list.some((r) => r.outcome === "drift")) return 1;
  if (list.some((r) => r.outcome === "unmeasured")) return 2;
  return list.length && list.every((r) => r.outcome === "ok") ? 0 : 2;
}

/**
 * summaryFor(results) → { code, line }: el resumen NOMBRA las versiones
 * afectadas y qué pasó con cada una (en un estado mixto, «diverge» a secas
 * esconde que la otra versión ni se midió).
 */
export function summaryFor(results) {
  const list = results ?? [];
  const code = exitCodeFor(list);
  if (code === 0) {
    return { code, line: "🏆 FIDELIDAD: geometry.mjs ≡ DOM aprobado (animación v16 + acabado #55)" };
  }
  const bad = list.filter((r) => r.outcome !== "ok");
  const detail = bad.map((r) => `${r.version}: ${OUTCOME[r.outcome] ?? r.outcome}`).join(" · ");
  return {
    code,
    line: code === 1
      ? `🚫 FIDELIDAD: el puerto diverge del DOM aprobado — ${detail}`
      : `🚫 FIDELIDAD: NO se pudo medir — ${detail} (esto no es drift: revisá Chrome/CHROME_PATH y la ruta del artefacto)`,
  };
}
