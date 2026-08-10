import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * GUARDA DE SCRIPTS INLINE (SPEC §2 riesgo crítico): cualquier edición descuidada
 * de los bloques <script> en línea puede romper el parseo (`Unexpected token '<'`
 * por un `</script>` faltante que fusiona dos scripts). Vite NO lo valida — este
 * test sí:
 *   1. Cuenta aperturas/cierres de <script> (falta de cierre = bug estructural).
 *   2. Verifica que ningún bloque contenga `<script`/`</script>` en su interior.
 *   3. Corre `node --check` sobre cada script inline no-module (sintaxis).
 */

const INDEX_HTML = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

interface ScriptBlock {
  attrs: string;
  body: string;
}

function extractScriptBlocks(html: string): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    blocks.push({ attrs: m[1], body: m[2] });
  }
  return blocks;
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

describe("scripts inline de index.html", () => {
  it("todo <script> abre y cierra (sin </script> faltante que fusione bloques)", () => {
    expect(countOccurrences(INDEX_HTML, "<script")).toBe(
      countOccurrences(INDEX_HTML, "</script>")
    );
  });

  it("ningún bloque inline contiene <script/</script> en su interior", () => {
    const blocks = extractScriptBlocks(INDEX_HTML);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      expect(b.body, "script con tag anidado").not.toContain("</script>");
      expect(b.body, "script con apertura anidada").not.toContain("<script");
    }
  });

  it("cada script inline (no-module, no ld+json) pasa node --check", () => {
    const blocks = extractScriptBlocks(INDEX_HTML);
    const inline = blocks.filter(
      (b) => !b.attrs.includes("application/ld+json") && !b.attrs.includes("module")
    );
    expect(inline.length).toBeGreaterThanOrEqual(3); // utilidades + grafo + i18n + intro

    const dir = mkdtempSync(join(tmpdir(), "cv-inline-"));
    try {
      inline.forEach((b, i) => {
        const file = join(dir, `inline-${i}.js`);
        writeFileSync(file, b.body, "utf8");
        expect(
          () => execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }),
          `node --check falló en el script inline #${i}`
        ).not.toThrow();
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
