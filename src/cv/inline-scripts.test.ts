import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * GUARDA DE SCRIPTS INLINE (SPEC §2/§4 — DoD Fase 2): el index.html generado
 * NO debe tener scripts inline ejecutables ("ningún <script> en línea; todo
 * viene de bundles"). Esto elimina de raíz la clase de bug del `</script>`
 * faltante (Unexpected token '<'). Defensivo: si alguien agrega uno a mano,
 * `node --check` lo valida y el conteo de tags lo atrapa.
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

describe("index.html generado — sin scripts inline", () => {
  it("todo <script> abre y cierra (sin </script> faltante)", () => {
    expect(countOccurrences(INDEX_HTML, "<script")).toBe(
      countOccurrences(INDEX_HTML, "</script>")
    );
  });

  it("no hay scripts inline ejecutables: solo ld+json y el tag module", () => {
    const blocks = extractScriptBlocks(INDEX_HTML);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      const ok = b.attrs.includes("application/ld+json") || b.attrs.includes("module");
      expect(
        ok,
        `script inesperado en el HTML generado: <script${b.attrs}> (${b.body.length} bytes)`
      ).toBe(true);
    }
  });

  it("cualquier script presente pasa node --check (defensivo)", () => {
    const blocks = extractScriptBlocks(INDEX_HTML);
    const inline = blocks.filter(
      (b) => !b.attrs.includes("application/ld+json") && !b.attrs.includes("module")
    );
    if (inline.length === 0) return; // el estado objetivo: no hay inline
    const dir = mkdtempSync(join(tmpdir(), "cv-inline-"));
    try {
      inline.forEach((b, i) => {
        const file = join(dir, `inline-${i}.js`);
        writeFileSync(file, b.body, "utf8");
        expect(() =>
          execFileSync(process.execPath, ["--check", file], { stdio: "pipe" })
        ).not.toThrow();
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
