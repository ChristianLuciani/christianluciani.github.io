/**
 * fidelity-verdict.mjs — política del gate de fidelidad, en funciones puras (#75).
 * La adquisición (Chrome, dump-dom) no se puede probar en CI; el veredicto sí.
 * Contrato: 0 limpio · 1 el puerto difiere · 2 no se pudo medir (el mismo del
 * gate hermano `verify-motion.mjs`): sin esa distinción, un runner roto se lee
 * como drift de geometría.
 *
 * #79: un `error` (bug del gate) también es 2 — no se midió — pero el resumen lo
 * nombra distinto de un fallo de entorno; y una corrida PARCIAL (menos versiones
 * de las esperadas) ya no puede dar 0.
 *
 * Vive acá también la taxonomía del error, no el cableado: `Unmeasurable` marca
 * lo que falló por ENTORNO y lo consume `chrome.mjs` sin importar el gate (F7
 * del pase fresco de #82: la primitiva no depende del wiring).
 */

/** El gate no pudo medir por el entorno (Chrome ausente, artefacto ilegible):
 *  no es drift ni un bug. `chrome.mjs` y el preflight lo usan como marcador. */
export class Unmeasurable extends Error {
  constructor(message) {
    super(message);
    this.name = "Unmeasurable";
  }
}

/** outcome por versión → el veredicto de la corrida. */
export const OUTCOME = {
  ok: "ok",
  drift: "diverge",
  unmeasured: "no se pudo medir",
  error: "error interno del gate",
};

/** Versiones esperadas que NO aparecen en `results` (vacío si no se declaró
 *  `expected` o si están todas). Acepta un número (cuántas) o los nombres.
 *  Cuenta IDENTIDADES, no filas: dos resultados de la misma versión no tapan a
 *  la que falta (F1 del pase fresco de #79). */
function missingVersions(results, expected) {
  if (expected == null) return [];
  const seen = new Set(results.map((r) => r.version));
  if (typeof expected === "number") {
    const missing = expected - seen.size;
    return missing > 0
      ? Array.from({ length: missing }, (_, i) => `versión ${seen.size + i + 1}`)
      : [];
  }
  return expected.filter((version) => !seen.has(version));
}

/**
 * exitCodeFor([{version, outcome}], expected?) → 0 | 1 | 2.
 * Un drift medido GANA: si algo difirió, la corrida midió. Sin resultados (no se
 * midió nada) es 2, nunca 0. Con `expected`, faltar una versión es 2: una
 * corrida incompleta no es un verde.
 */
export function exitCodeFor(results, expected) {
  const list = results ?? [];
  if (list.some((r) => r.outcome === "drift")) return 1;
  if (list.some((r) => r.outcome === "unmeasured" || r.outcome === "error")) return 2;
  if (missingVersions(list, expected).length) return 2;
  return list.length && list.every((r) => r.outcome === "ok") ? 0 : 2;
}

/** summaryFor(results, expected?) → { code, line }: nombra CADA versión afectada
 *  — en un estado mixto, «diverge» a secas esconde que la otra ni se midió — y
 *  no confunde una corrida parcial ni un bug con un problema de entorno. */
export function summaryFor(results, expected) {
  const list = results ?? [];
  const code = exitCodeFor(list, expected);
  if (code === 0) {
    return { code, line: "🏆 FIDELIDAD: geometry.mjs ≡ DOM aprobado (animación v16 + acabado #55)" };
  }
  const bad = list.filter((r) => r.outcome !== "ok");
  const detail = bad.map((r) => `${r.version}: ${OUTCOME[r.outcome] ?? r.outcome}`).join(" · ");
  const missing = missingVersions(list, expected);
  const absent = missing.length
    ? missing.map((version) => `${version}: sin medir`).join(" · ")
    : "";
  if (code === 1) {
    /* Un drift medido gana el código, pero una versión que ni se midió no puede
     * desaparecer del resumen (F4 del pase fresco de #82). */
    return {
      code,
      line: `🚫 FIDELIDAD: el puerto diverge del DOM aprobado — ${detail}${absent ? ` · corrida parcial, faltan ${absent}` : ""}`,
    };
  }
  if (absent) {
    return {
      code,
      line: `🚫 FIDELIDAD: NO se pudo medir — corrida parcial, faltan ${absent}${detail ? ` · ${detail}` : ""} (esto no es drift)`,
    };
  }
  const hasError = bad.some((r) => r.outcome === "error");
  const hasUnmeasured = bad.some((r) => r.outcome === "unmeasured");
  if (hasError && hasUnmeasured) {
    /* Un estado mixto tiene DOS causas: nombrarlas evita mandar a depurar el
     * entorno por el bug del gate, o al revés (F3). */
    return {
      code,
      line: `🚫 FIDELIDAD: NO se pudo medir — ${detail} (causas mixtas: en «no se pudo medir» es el entorno [Chrome/CHROME_PATH]; en «error interno» es un bug del gate)`,
    };
  }
  if (hasError) {
    return {
      code,
      line: `🚫 FIDELIDAD: error interno del gate — ${detail} (bug del gate, NO del entorno: no es Chrome ni la ruta del binario)`,
    };
  }
  return {
    code,
    line: `🚫 FIDELIDAD: NO se pudo medir — ${detail} (esto no es drift: revisá Chrome/CHROME_PATH y la ruta del artefacto)`,
  };
}
