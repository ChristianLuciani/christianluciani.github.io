import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDocPointers } from "./doc-pointers.ts";

/**
 * El SPEC es contrato: si dice que un dato vive en un archivo, un agente va a
 * editar ESE archivo. Este test resuelve los punteros contra el árbol y contra
 * los exports reales. Nació del 4.º pase de #118 (F2, ESCALATE(4)): la fila del
 * grafo apuntaba a `sala_html.ts §grafo`, donde sólo hay lede+canvas, y los 16
 * nodos/24 aristas viven en `src/ts/graph/grafo.ts`.
 *
 * El segundo bloque SIEMBRA el defecto: la fila vieja tiene que romper. Sin esa
 * prueba, un chequeo que no muerde pasaría por verde.
 */

const ROOT = resolve(process.cwd());
const SPEC = readFileSync(resolve(ROOT, "docs", "SPEC.md"), "utf8");
const TABLE = "| Dato | Vive en | Tipo |\n|---|---|---|\n";
const section = (rows: string): string =>
  `## 4. Frontera contenido/presentación (tabla canónica)\n\n${TABLE}${rows}\n`;

describe("docs/SPEC.md — los punteros resuelven contra el repo", () => {
  it("todo path citado existe y todo símbolo citado es export del archivo", () => {
    const report = checkDocPointers(SPEC, ROOT);
    expect(report.violations).toEqual([]);
    // No es un pase vacío: el SPEC cita paths y exports reales.
    expect(report.paths).toBeGreaterThan(10);
    expect(report.symbols).toBeGreaterThan(0);
  });

  it("muerde la fila vieja del grafo (F2 del 4.º pase: `sala_html.ts` §grafo)", () => {
    const oldRow =
      "| grafo constelación (nodos/aristas) | roadmap — sin módulo de curación; hoy el copy vive en `src/templates/sala_html.ts` (§grafo) | curación (ref. `projects` SSOT) |";
    const report = checkDocPointers(section(oldRow), ROOT);
    expect(report.violations.map((v) => v.kind)).toContain("unverified-anchor");
    expect(report.violations.find((v) => v.kind === "unverified-anchor")?.detail).toContain("§grafo");
  });

  it("muerde un path inexistente", () => {
    const report = checkDocPointers(
      section("| x | `src/templates/no-existe.ts` | y |"),
      ROOT
    );
    expect(report.violations.map((v) => v.kind)).toEqual(["missing-path"]);
  });

  it("muerde un símbolo que el archivo citado no exporta", () => {
    const report = checkDocPointers(
      section("| x | `src/ts/graph/grafo.ts` (`NO_ES_EXPORT`) | y |"),
      ROOT
    );
    expect(report.violations.map((v) => v.kind)).toEqual(["missing-export"]);
    expect(report.violations[0].detail).toContain("NO_ES_EXPORT");
  });

  it("no confunde paths de otros repos con paths del árbol", () => {
    const report = checkDocPointers(
      section("| x | `profile-data/identity.yaml` + `schema/profile.schema.json` | hecho |"),
      ROOT
    );
    expect(report.violations).toEqual([]);
    expect(report.paths).toBe(0);
  });
});
