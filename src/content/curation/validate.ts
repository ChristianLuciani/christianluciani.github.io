/**
 * VALIDACIÓN DE COBERTURA (I3 · SPEC §5.5 · issue #128).
 *
 * QUÉ ES: el instrumento mecánico que convierte "todo hecho tiene decisión" en
 * algo verificable. Lo comparten el CLI (`tools/curation.ts --report`) y el test
 * de cobertura: una sola implementación, no dos que puedan divergir.
 *
 * Reglas (cada una con su error nombrado):
 *   · todo hecho del universo está en `include` XOR `exclude` (sin decisión = error);
 *   · `include`/`exclude` no nombran hechos inexistentes (id sin universo = error);
 *   · un hecho no se decide dos veces (duplicado u overlap = error);
 *   · toda exclusión tiene una `reason` real (vacía, "n/a", "TBD" = error);
 *   · `order` sólo nombra hechos incluidos, sin duplicados, y si una colección
 *     declara orden, cubre TODOS sus hechos incluidos (parcial = error: el resto
 *     quedaría en un orden no declarado).
 *
 * No conoce el tema: recibe la curación y el universo. El CLI elige cuál.
 */
import type { Curation, Fact, FactCollection } from "./types.ts";
import { factId } from "./keys.ts";

export type DecisionKind = "include" | "exclude";

export interface Decision {
  readonly fact: Fact;
  readonly kind: DecisionKind;
  /** Posición 1-based dentro del orden declarado de su colección (si hay). */
  readonly position?: number;
  /** Razón redactada; sólo en `exclude`. */
  readonly reason?: string;
}

export interface CurationReport {
  /** Decisiones en orden de presentación: colecciones del universo y, dentro
   *  de una colección con `order`, la posición declarada (01, 02, …). */
  readonly decisions: readonly Decision[];
  readonly undecided: readonly Fact[];
  readonly errors: readonly string[];
  readonly totals: {
    readonly facts: number;
    readonly included: number;
    readonly excluded: number;
    readonly undecided: number;
    readonly errors: number;
  };
}

/** Razones que no explican nada: el contrato pide una frase para el operador. */
const PLACEHOLDER_REASON = /^(n\/?a|tbd|todo|pendiente|sin razón|-\s*)$/i;

/** Una reason válida es una frase: no vacía, no placeholder, no un guion. */
export function reasonProblem(reason: string | undefined): string | undefined {
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return "falta `reason` (toda exclusión exige una razón redactada al operador)";
  }
  const trimmed = reason.trim();
  if (PLACEHOLDER_REASON.test(trimmed)) {
    return `\`reason\` es un placeholder ("${trimmed}"): explicá por qué se oculta`;
  }
  if (trimmed.length < 12) {
    return `\`reason\` demasiado corta ("${trimmed}"): no explica la decisión`;
  }
  return undefined;
}

export function validateCuration(
  curation: Curation,
  collections: readonly FactCollection[]
): CurationReport {
  const facts = collections.flatMap((collection) => collection.facts);
  const byId = new Map<string, Fact>();
  const errors: string[] = [];

  for (const fact of facts) {
    if (byId.has(fact.id)) errors.push(`id duplicado en el universo: ${fact.id}`);
    byId.set(fact.id, fact);
  }

  const included = new Set<string>();
  const excluded = new Set<string>();

  for (const id of curation.include) {
    if (!byId.has(id)) {
      errors.push(`\`include\` nombra un hecho inexistente: ${id}`);
      continue;
    }
    if (included.has(id)) errors.push(`\`include\` duplicado: ${id}`);
    included.add(id);
  }

  for (const exclusion of curation.exclude) {
    if (!byId.has(exclusion.id)) {
      errors.push(`\`exclude\` nombra un hecho inexistente: ${exclusion.id}`);
      continue;
    }
    if (excluded.has(exclusion.id)) errors.push(`\`exclude\` duplicado: ${exclusion.id}`);
    excluded.add(exclusion.id);
    const problem = reasonProblem(exclusion.reason);
    if (problem) errors.push(`${exclusion.id}: ${problem}`);
    if (included.has(exclusion.id)) {
      errors.push(`el hecho está incluido y excluido a la vez: ${exclusion.id}`);
    }
  }

  // `order`: por colección, cubre lo incluido y no nombra nada fuera de lugar.
  const positions = new Map<string, number>();
  for (const [collection, keys] of Object.entries(curation.order ?? {})) {
    if (!keys) continue;
    const collectionFacts = collections.find((item) => item.id === collection);
    if (!collectionFacts) {
      errors.push(`\`order\` declara una colección inexistente: ${collection}`);
      continue;
    }
    const seen = new Set<string>();
    keys.forEach((key, index) => {
      const id = factId(collectionFacts.id, key);
      if (!byId.has(id)) {
        errors.push(`\`order.${collection}\` nombra un hecho inexistente: ${key}`);
        return;
      }
      if (seen.has(key)) errors.push(`\`order.${collection}\` duplicado: ${key}`);
      seen.add(key);
      if (!included.has(id)) {
        errors.push(`\`order.${collection}\` ordena un hecho no incluido: ${key}`);
      }
      positions.set(id, index + 1);
    });
    for (const fact of collectionFacts.facts) {
      if (included.has(fact.id) && !seen.has(fact.key)) {
        errors.push(`\`order.${collection}\` no cubre el hecho incluido: ${fact.key}`);
      }
    }
  }

  const decisions: Decision[] = [];
  const undecided: Fact[] = [];
  for (const fact of facts) {
    const isIncluded = included.has(fact.id);
    const isExcluded = excluded.has(fact.id);
    if (!isIncluded && !isExcluded) {
      undecided.push(fact);
      continue;
    }
    // Si está en ambos ya hay error; se reporta como exclusión para no duplicar filas.
    if (isExcluded) {
      const exclusion = curation.exclude.find((item) => item.id === fact.id);
      decisions.push({ fact, kind: "exclude", reason: exclusion?.reason });
      continue;
    }
    const position = positions.get(fact.id);
    decisions.push({ fact, kind: "include", ...(position ? { position } : {}) });
  }

  const collectionIndex = new Map(collections.map((collection, index) => [collection.id, index]));
  decisions.sort((a, b) => {
    const byCollection =
      (collectionIndex.get(a.fact.collection) ?? 0) - (collectionIndex.get(b.fact.collection) ?? 0);
    if (byCollection !== 0) return byCollection;
    return (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER);
  });

  return {
    decisions,
    undecided,
    errors,
    totals: {
      facts: facts.length,
      included: decisions.filter((decision) => decision.kind === "include").length,
      excluded: decisions.filter((decision) => decision.kind === "exclude").length,
      undecided: undecided.length,
      errors: errors.length
    }
  };
}

/** `true` si el reporte puede publicarse: 100% decidido y sin errores. */
export function isGreen(report: CurationReport): boolean {
  return report.errors.length === 0 && report.undecided.length === 0;
}
