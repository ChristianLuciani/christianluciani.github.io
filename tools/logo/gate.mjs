/**
 * gate.mjs — frontera y cableado del gate de fidelidad (issue #79).
 *
 * Tres piezas que estaban mezcladas en el CLI y por eso no se podían probar sin
 * Chrome:
 *   · `artifactProblem` — preflight del artefacto. Un HTML que Chrome no puede
 *     renderizar (inexistente, vacío, directorio, sin permiso) se compara como
 *     DOM vacío y salía «drift» (1) cuando en realidad NO se midió (2).
 *   · `Unmeasurable` — fallo de ENTORNO (binario ausente, Chrome que no arranca).
 *     Distinto de un bug del gate: el consejo de diagnóstico no es el mismo y
 *     nadie debe depurar Chrome por un TypeError.
 *   · `runGate` — el cableado: `fail()`/`canNotMeasure()` acumulan POR VERSIÓN,
 *     se traducen a `results` y terminan en el veredicto de `fidelity-verdict.mjs`.
 */
import { accessSync, constants, statSync } from "node:fs";
import { summaryFor } from "./fidelity-verdict.mjs";

/** El gate no pudo medir por el entorno: no es drift ni un bug. */
export class Unmeasurable extends Error {
  constructor(message) {
    super(message);
    this.name = "Unmeasurable";
  }
}

/**
 * `artifactProblem(file)` → motivo por el que NO se puede medir (null si se
 * puede). El orden importa: primero que exista, después que sea un archivo
 * (un `mkdir index.html` se colaba), después que tenga contenido (0 bytes no
 * renderiza nada) y al final que sea legible (un `chmod 000` se colaba).
 */
export function artifactProblem(file) {
  let stat;
  try {
    stat = statSync(file);
  } catch (err) {
    return err?.code === "EACCES"
      ? `sin permiso de acceso: ${file}`
      : `no existe: ${file}`;
  }
  if (!stat.isFile()) return `no es un archivo: ${file}`;
  if (stat.size === 0) return `está vacío (0 bytes): ${file}`;
  try {
    accessSync(file, constants.R_OK);
  } catch {
    return `sin permiso de lectura: ${file}`;
  }
  return null;
}

/**
 * `runGate({ versions, verify, error })` → `{ results, verdict }`.
 *
 * El cableado que el pase fresco de #78 encontró sin test: cada versión deja
 * SIEMPRE su resultado (una que explota no produce una corrida parcial), un
 * drift medido gana sobre «no medido», y una excepción que no es del entorno se
 * marca `error` — no se disfraza de «revisá Chrome».
 */
export function runGate({ versions, verify, error = console.error }) {
  const results = [];
  for (const version of versions) {
    const state = { outcome: "ok" };
    const fail = (msg) => {
      error(`❌ FIDELIDAD: ${msg}`);
      if (state.outcome === "ok") state.outcome = "drift";
    };
    const canNotMeasure = (msg) => {
      error(`❌ FIDELIDAD: ${msg}`);
      if (state.outcome !== "drift") state.outcome = "unmeasured";
    };
    try {
      verify(version, { fail, canNotMeasure });
    } catch (err) {
      if (err instanceof Unmeasurable) {
        canNotMeasure(`${version}: ${err.message}`);
      } else {
        /* El stack va al log, pero el veredicto NO manda a revisar el entorno:
         * un bug de programación se depura en el código. */
        error(`💥 FIDELIDAD: ${version}: error interno del gate: ${err?.stack ?? err}`);
        if (state.outcome !== "drift") state.outcome = "error";
      }
    }
    results.push({ version, outcome: state.outcome });
  }
  return { results, verdict: summaryFor(results, versions) };
}
