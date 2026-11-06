import { describe, expect, it } from "vitest";
import { assembleHtml } from "./index";
import { allCopyHits, copyHitsOf, templateFiles } from "../../tools/copy/lint";

/**
 * GATE DE COPY (#127, SPEC §8 FASE 5 · ADR-001 I5).
 *
 * Verifica el DoD del issue con dos definiciones DISTINTAS y declaradas:
 *
 *   A) TEMPLATES → HTML (este archivo, primer bloque). Ningún template emite
 *      copy literal > 2 palabras, ni como nodo de texto NI como valor de un
 *      atributo de copy (`aria-label`, `alt`, `title`, `content` de meta,
 *      `data-caption`, `data-aria-*`). Es la cláusula que un aria-label literal
 *      hacía escapar.
 *   B) PACK → HTML (segundo y tercer bloque). Toda clave del pack que NO sea
 *      `runtime` aparece en el render; el pack es bilingüe y sin conflictos.
 *
 * Lo que este archivo NO mide (y no debe fingir que mide): MAP → nodo del
 * walker. El walker i18n recorre nodos de texto; los pares `print.*` (salta
 * `#print-cv`) y los sólo-atributo (aria/alt/meta/caption) nunca se consultan
 * y son copy vivo en otra superficie, no claves muertas. Los pares derivados
 * del SSOT que la rama de datos de hoy no renderiza tampoco son deuda de copy:
 * se derivan. Ver `docs/CREAR-TEMA.md` §3.1.
 *
 * Cuando falla, el mensaje dice archivo:línea, superficie y texto: mover la
 * frase al pack (`src/themes/museo/copy.ts`) y pedirla con `t()`/`th()`/`ta()`.
 */
describe("copy — cero texto literal en templates (I5)", () => {
  it("el linter escanea todos los templates del tema (no una muestra)", () => {
    const files = templateFiles();
    expect(files.length).toBeGreaterThanOrEqual(9);
    expect(files).toContain("src/templates/sala_html.ts");
  });

  it("ningún template emite > 2 palabras de texto ni de atributo de copy", () => {
    const hits = allCopyHits();
    const detail = hits.map((h) => `${h.file}:${h.line} [${h.kind}] → "${h.text}"`).join("\n");
    expect(hits, `copy literal hardcodeado en templates:\n${detail}`).toHaveLength(0);
  });

  it("el gate MUERDE: detecta un literal en aria-label y en content de meta", () => {
    const aria = copyHitsOf(
      "probe.ts",
      'const html = `<canvas aria-label="tres palabras libres"></canvas>`;'
    );
    expect(aria).toHaveLength(1);
    expect(aria[0]!.kind).toBe("atributo:aria-label");

    const meta = copyHitsOf(
      "probe.ts",
      'const html = `<meta name="description" content="otras tres palabras sueltas">`;'
    );
    expect(meta).toHaveLength(1);
    expect(meta[0]!.kind).toBe("atributo:content");
  });

  it("el gate no confunde atributos técnicos ni valores interpolados", () => {
    const probes = [
      'const html = `<img class="pub-thumb" src="data:x" alt="${ta("pub.kontablo.alt")}">`;',
      'const html = `<div class="skill-label">${t("room.competencias.agents.label")}</div>`;',
      'const html = `<meta name="viewport" content="width=device-width, initial-scale=1.0">`;'
    ];
    for (const probe of probes) {
      expect(copyHitsOf("probe.ts", probe), probe).toHaveLength(0);
    }
  });
});

describe("copy — pack bilingüe y sin claves muertas", () => {
  it("toda clave tiene ES y EN no vacíos", async () => {
    const { COPY } = await import("../content/copy.ts");
    for (const [key, entry] of Object.entries(COPY)) {
      expect(entry.es.trim(), `${key}.es`).not.toBe("");
      expect(entry.en.trim(), `${key}.en`).not.toBe("");
    }
  });

  it("las claves son semánticas (grupo.subclave, sin texto como clave)", async () => {
    const { COPY } = await import("../content/copy.ts");
    for (const key of Object.keys(COPY)) {
      expect(key, `clave "${key}"`).toMatch(/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/);
    }
  });

  it("un mismo texto ES no declara dos EN distintas", async () => {
    const { COPY } = await import("../content/copy.ts");
    const seen = new Map<string, { key: string; en: string }>();
    const conflicts: string[] = [];
    const norm = (s: string): string => s.replace(/\s+/g, " ").trim();
    for (const [key, entry] of Object.entries(COPY)) {
      if (entry.es === entry.en) continue;
      const es = norm(entry.es);
      const prev = seen.get(es);
      if (prev && prev.en !== entry.en) {
        conflicts.push(`"${es}" → ${prev.key} ("${prev.en}") vs ${key} ("${entry.en}")`);
      }
      seen.set(es, { key, en: entry.en });
    }
    expect(conflicts, `claves en conflicto:\n${conflicts.join("\n")}`).toHaveLength(0);
  });

  it("ninguna clave del pack es huérfana en el HTML generado", async () => {
    const { COPY } = await import("../content/copy.ts");
    const decode = (s: string): string =>
      s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
    const norm = (s: string): string => s.replace(/\s+/g, " ").trim();
    const html = decode(assembleHtml())
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ");
    const text = norm(html.replace(/<[^>]*>/g, " "));
    const raw = norm(html);
    const dead: string[] = [];
    for (const [key, entry] of Object.entries(COPY)) {
      // `runtime`: lo monta el JS o depende de estado; no está garantizado en el
      // HTML inicial (intro, canvas del grafo, feed vacío, niveles ausentes).
      if (entry.runtime) continue;
      const es = norm(entry.es.replace(/<[^>]*>/g, " "));
      if (!text.includes(es) && !raw.includes(es)) dead.push(key);
    }
    expect(dead, `claves sin uso en el render: ${dead.join(", ")}`).toHaveLength(0);
  });
});
