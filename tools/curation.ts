/**
 * curation — reporte de cobertura de la curación de un tema (SPEC §5.5 · I3).
 *
 * Uso:
 *   tsx tools/curation.ts --report            # tabla legible
 *   tsx tools/curation.ts --report --json     # consumible por CI (#133)
 *   tsx tools/curation.ts --report --theme X  # curación de otro tema
 *
 * QUÉ HACE: enumera TODO hecho curable del perfil (más las salas) y exige que
 * la curación del tema lo haya decidido —incluido o excluido con razón—. Un
 * hecho nuevo del SSOT sin decisión NO se ignora: aparece como "sin decisión" y
 * el proceso sale 1. Una exclusión sin `reason` real (vacía, "n/a", "TBD") es
 * error, no warning (issue #128).
 *
 * Exit: 0 verde (100% decidido, 0 errores) · 1 rojo · 2 uso.
 */
import { PROFILE } from "../src/data/profile.generated.ts";
import { CURATIONS, curationFor } from "../src/content/curation/index.ts";
import { factUniverse } from "../src/content/curation/facts.ts";
import { isGreen, validateCuration, type CurationReport } from "../src/content/curation/validate.ts";
import type { Curation, Fact, FactCollection } from "../src/content/curation/types.ts";

const USAGE = `curation — cobertura de la curación (I3)

Uso: tsx tools/curation.ts --report [--json] [--theme <id>]

  --report        emite el reporte (sin esto no hace nada)
  --json          salida JSON para consumidores mecánicos
  --theme <id>    tema cuya curación se reporta (default: museo)
                  disponibles: ${Object.keys(CURATIONS).join(", ")}
  --help          esta ayuda
`;

interface Options {
  report: boolean;
  json: boolean;
  theme: string;
}

function parseArgs(argv: readonly string[]): Options | string {
  const options: Options = { report: false, json: false, theme: "museo" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--report") options.report = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") return "help";
    else if (arg === "--theme") {
      const value = argv[i + 1];
      if (!value) return "falta el valor de --theme";
      options.theme = value;
      i += 1;
    } else if (arg.startsWith("--theme=")) options.theme = arg.slice("--theme=".length);
    else return `argumento desconocido: ${arg}`;
  }
  return options;
}

/** Ancho de la columna de ids en la tabla humana. */
const ID_WIDTH = 52;

function truncate(text: string, width: number): string {
  return text.length <= width ? text : `${text.slice(0, width - 1)}…`;
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function collectionHeader(collection: FactCollection, report: CurationReport): string {
  const decisions = report.decisions.filter((decision) => decision.fact.collection === collection.id);
  const included = decisions.filter((decision) => decision.kind === "include").length;
  const excluded = decisions.filter((decision) => decision.kind === "exclude").length;
  const undecided = report.undecided.filter((fact) => fact.collection === collection.id).length;
  const plural = (count: number, one: string, many: string): string =>
    `${count} ${count === 1 ? one : many}`;
  const parts = [plural(included, "incluida", "incluidas"), plural(excluded, "excluida", "excluidas")];
  if (undecided > 0) parts.push(`${undecided} SIN DECISIÓN`);
  return `${collection.label} (${collection.facts.length}) — ${parts.join(" · ")}`;
}

function factLine(fact: Fact, kind: "include" | "exclude", position?: number): string {
  const mark = kind === "include" ? "✓" : "✗";
  const order = position ? String(position).padStart(2, "0") : "  ";
  const surface = kind === "include" ? (fact.surface ?? "(sin superficie)") : "";
  return `  ${mark} ${order} ${truncate(fact.id, ID_WIDTH).padEnd(ID_WIDTH)} ${surface}`.trimEnd();
}

function printHuman(report: CurationReport, collections: readonly FactCollection[], theme: string): void {
  const profileFacts = collections.filter((collection) => collection.id !== "salas");
  const rooms = collections.filter((collection) => collection.id === "salas");
  const profileCount = profileFacts.reduce((total, collection) => total + collection.facts.length, 0);

  console.log(`curation · ${theme} · profile-data @ ${PROFILE.source.commit.slice(0, 12)}`);
  console.log("");
  console.log(
    `Cubre: ${profileCount} hechos del perfil en ${profileFacts.length} colecciones` +
      `${rooms.length > 0 ? ` + ${rooms[0].facts.length} salas` : ""} · ` +
      "No cubre: campos singleton (identity, positioning, headlines, keywords, source)"
  );
  for (const collection of collections) {
    if (collection.facts.length === 0) continue;
    console.log("");
    console.log(collectionHeader(collection, report));
    for (const decision of report.decisions.filter((item) => item.fact.collection === collection.id)) {
      console.log(factLine(decision.fact, decision.kind, decision.position));
      if (decision.kind === "exclude" && decision.reason) {
        for (const line of wrap(decision.reason, 88)) console.log(`        ↳ ${line}`);
      }
    }
    for (const fact of report.undecided.filter((item) => item.collection === collection.id)) {
      console.log(`  !     ${truncate(fact.id, ID_WIDTH).padEnd(ID_WIDTH)} SIN DECISIÓN`);
    }
  }

  if (report.errors.length > 0) {
    console.log("");
    console.log(`errores (${report.errors.length}):`);
    for (const error of report.errors) console.log(`  ✗ ${error}`);
  }

  console.log("");
  const { totals } = report;
  console.log(
    `decisiones: ${totals.included} incluidas · ${totals.excluded} excluidas · ` +
      `${totals.undecided} sin decisión · ${totals.errors} errores`
  );
  console.log(isGreen(report) ? "OK — 100% de los hechos tienen decisión" : "FAIL — cobertura incompleta");
}

function toJson(report: CurationReport, collections: readonly FactCollection[], theme: string): unknown {
  return {
    theme,
    profile: {
      repo: PROFILE.source.repo,
      commit: PROFILE.source.commit,
      commitDate: PROFILE.source.commitDate
    },
    scope: {
      covers: "ítems de las colecciones del perfil público + salas de la narrativa",
      excludes: ["identity", "positioning", "headlines", "keywords", "source"]
    },
    totals: report.totals,
    green: isGreen(report),
    collections: collections.map((collection) => ({
      id: collection.id,
      label: collection.label,
      facts: collection.facts.length,
      decisions: report.decisions
        .filter((decision) => decision.fact.collection === collection.id)
        .map((decision) => ({
          id: decision.fact.id,
          key: decision.fact.key,
          label: decision.fact.label,
          kind: decision.kind,
          surface: decision.fact.surface ?? null,
          ...(decision.position ? { position: decision.position } : {}),
          ...(decision.reason ? { reason: decision.reason } : {})
        })),
      undecided: report.undecided
        .filter((fact) => fact.collection === collection.id)
        .map((fact) => ({ id: fact.id, key: fact.key, label: fact.label }))
    })),
    errors: report.errors
  };
}

function main(): number {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed === "help") {
    console.log(USAGE);
    return 0;
  }
  if (typeof parsed === "string") {
    console.error(`curation: ${parsed}\n`);
    console.error(USAGE);
    return 2;
  }
  if (!parsed.report) {
    console.error(USAGE);
    return 2;
  }

  let curation: Curation;
  try {
    curation = curationFor(parsed.theme);
  } catch (error) {
    console.error((error as Error).message);
    return 2;
  }

  const collections = factUniverse();
  const report = validateCuration(curation, collections);
  if (parsed.json) console.log(JSON.stringify(toJson(report, collections, parsed.theme), null, 2));
  else printHuman(report, collections, parsed.theme);
  return isGreen(report) ? 0 : 1;
}

process.exit(main());
