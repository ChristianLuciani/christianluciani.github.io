/**
 * Drift de las páginas de cliente (#145 §1): los archivos commiteados en
 * `clients/` deben ser byte a byte el render del registro — igual que
 * index.html vs assembleHtml(). `/clients/example/` se genera sin tocar código:
 * si este test pasa, la parametrización no depende de "blacksmith".
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { clientSourceFiles } from "../src/clients/publish.ts";
import { clientSlugs } from "../src/content/clients/index.ts";

describe("build-clients — fuente commiteada sin drift", () => {
  const files = clientSourceFiles();

  it("hay una página por slug + índice", () => {
    expect(Object.keys(files).sort()).toEqual(
      [...clientSlugs().map((s) => `clients/${s}/index.html`), "clients/index.html"].sort()
    );
  });

  for (const [relative, html] of Object.entries(files)) {
    it(`${relative} == render del registro`, () => {
      const file = resolve(process.cwd(), relative);
      expect(existsSync(file), `${relative} commiteado`).toBe(true);
      expect(readFileSync(file, "utf8")).toBe(html);
    });
  }
});
