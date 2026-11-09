/**
 * Registro de clientes (#145 §1): parametrización real — agregar un cliente es
 * agregar un archivo + una entrada; ningún slug hardcodeado en templates.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CLIENTS, clientSlugs, getClient, validateClients } from "./index.ts";
import { CLIENT_MODULES, validateClient } from "./types.ts";

describe("client labs — registro paramétrico", () => {
  it("registra blacksmith + al menos un cliente de prueba; todos válidos (sin hardcodear la lista)", () => {
    expect(clientSlugs()).toContain("blacksmith");
    expect(clientSlugs().length).toBeGreaterThanOrEqual(2);
    validateClients();
    for (const slug of clientSlugs()) {
      expect(validateClient(CLIENTS[slug])).toEqual([]);
    }
  });

  it("getClient lanza con la lista de slugs para uno desconocido", () => {
    expect(() => getClient("nope")).toThrow(/válidos: .*blacksmith/);
  });

  it("blacksmith declara los 5 módulos, locale en, entry EN+ES y JD del aviso", () => {
    const b = CLIENTS.blacksmith;
    expect(b.slug).toBe("blacksmith");
    expect(b.role).toBe("AI Automation Engineer");
    expect(b.locale).toBe("en");
    expect([...b.modules]).toEqual([...CLIENT_MODULES]);
    expect(b.jd).toMatch(/MCP/);
    expect(b.chat.enabled).toBe(true);
    expect(b.chat.suggested.length).toBeGreaterThan(0);
    expect(b.entry.title.en).toBeTruthy();
    expect(b.entry.title.es).toBeTruthy();
  });

  it("ningún slug aparece hardcodeado en el renderer ni en los templates del sitio", () => {
    // La parametrización es real: cambiar de cliente no toca templates.
    for (const file of ["src/clients/page.ts", ...templateFiles()]) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source.includes("blacksmith"), `${file} no debe nombrar un slug`).toBe(false);
    }
  });
});

function templateFiles(): string[] {
  const dir = resolve(process.cwd(), "src/templates");
  return readdirSync(dir)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => `src/templates/${f}`);
}
