import { describe, expect, it } from "vitest";
import { assembleHtml } from "./index";
import { allCopyHits, templateFiles } from "../../tools/copy/lint";

/**
 * GATE DE COPY (#127, SPEC §8 FASE 5 · ADR-001 I5).
 *
 * El DoD del issue se verifica acá, no a ojo:
 *   1. ningún template contiene texto visible hardcodeado (> 2 palabras);
 *   2. el pack es bilingüe completo y sin claves ambiguas;
 *   3. ninguna clave del pack es huérfana (no aparece en el HTML generado).
 *
 * Cuando este test falla, el mensaje dice el archivo:línea y el texto: mover la
 * frase al pack (`src/themes/museo/copy.ts`) y pedirla con `t()`/`th()`/`ta()`.
 */
describe("copy — cero texto literal en templates (I5)", () => {
  it("el linter escanea todos los templates del tema (no una muestra)", () => {
    const files = templateFiles();
    expect(files.length).toBeGreaterThanOrEqual(9);
    expect(files).toContain("src/templates/sala_html.ts");
  });

  it("ningún template emite > 2 palabras de texto literal", () => {
    const hits = allCopyHits();
    const detail = hits.map((h) => `${h.file}:${h.line} → "${h.text}"`).join("\n");
    expect(hits, `texto visible hardcodeado en templates:\n${detail}`).toHaveLength(0);
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
