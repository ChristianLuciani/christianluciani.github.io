/**
 * chrome.test.mjs — resolución del binario de Chrome (#59).
 *
 * Por qué existe: el gate de fidelidad pasó a correr en CI (linux), así que la
 * resolución es la pieza de la que depende que el gate MIJA. Se prueba sin
 * Chrome: precedencia (CHROME_PATH gana), defaults de linux, error con la lista
 * probada, y que un fallo arrastre su stderr en vez de un "Command failed" mudo.
 * El lanzamiento real lo prueba el propio gate en CI.
 */
import { describe, expect, it } from "vitest";
import { chromeCandidates, chromeFailure, chromePath } from "./chrome.mjs";

const LINUX_DEFAULTS = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
/* `/bin/sh` existe en cualquier unix: al resolver sólo le importa que exista. */
const EXISTING = "/bin/sh";
const withEnv = (value, fn) => {
  const prev = process.env.CHROME_PATH;
  if (value === undefined) delete process.env.CHROME_PATH; else process.env.CHROME_PATH = value;
  try { return fn(); } finally {
    if (prev === undefined) delete process.env.CHROME_PATH; else process.env.CHROME_PATH = prev;
  }
};

describe("chromeCandidates", () => {
  it("pone CHROME_PATH primero y lo lee en cada llamada (no al importar)", () => {
    withEnv(undefined, () => expect(chromeCandidates()).not.toContain(EXISTING));
    withEnv(EXISTING, () => expect(chromeCandidates()[0]).toBe(EXISTING));
  });
  it("cubre los defaults de linux: el runner de CI no es macOS", () => {
    withEnv(undefined, () => {
      const list = chromeCandidates();
      for (const p of LINUX_DEFAULTS) expect(list).toContain(p);
    });
  });
  it("sin CHROME_PATH no deja un candidato vacío", () => {
    withEnv("", () => expect(chromeCandidates().every((c) => c.length > 0)).toBe(true));
  });
});

describe("chromePath", () => {
  it("devuelve el primer candidato existente y saltea los inexistentes", () => {
    expect(chromePath(["/no/existe-chrome", EXISTING])).toBe(EXISTING);
  });
  it("sin binario falla con la lista probada (nunca un verde silencioso)", () => {
    expect(() => chromePath(["/no/existe/google-chrome"])).toThrow(/Chrome no encontrado.*\/no\/existe\/google-chrome/);
    expect(() => chromePath([])).toThrow(/lista vacía/);
  });
});

describe("chromeFailure", () => {
  it("arrastra el stderr: el motivo, no sólo 'Command failed'", () => {
    const err = chromeFailure(new Error("Command failed: google-chrome"),
      "\n\nprimera\nFailed to create a unique user data directory for headless.");
    expect(err.message).toMatch(/Chrome falló/);
    expect(err.message).toMatch(/unique user data directory/);
  });
  it("sin stderr no inventa una causa", () => {
    expect(chromeFailure(new Error("salió con código 1"), "").message).not.toMatch(/chrome:/);
  });
});
