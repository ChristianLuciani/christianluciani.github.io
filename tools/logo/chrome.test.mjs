/**
 * chrome.test.mjs — resolución del binario de Chrome (#59).
 *
 * Por qué existe: el gate de fidelidad pasó a correr en CI (linux), así que la
 * resolución es la pieza de la que depende que el gate MIJA. Se prueba sin
 * Chrome: precedencia (CHROME_PATH gana), defaults de linux, error con la lista
 * probada, y que un fallo arrastre su stderr en vez de un "Command failed" mudo.
 * El lanzamiento real lo prueba el propio gate en CI.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  it("rechaza directorios y archivos sin permiso de ejecución (issue #75)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrome-dir-"));
    const plain = join(dir, "chrome-sin-exec");
    writeFileSync(plain, "no ejecutable");
    try {
      expect(() => chromePath([dir, plain])).toThrow(/Chrome no encontrado/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("sin binario falla con la lista probada (nunca un verde silencioso)", () => {
    expect(() => chromePath(["/no/existe/google-chrome"])).toThrow(/Chrome no encontrado.*\/no\/existe\/google-chrome/);
    expect(() => chromePath([])).toThrow(/lista vacía/);
  });
});

describe("chromeFailure", () => {
  it("conserva la CAUSA aunque el volcado de crashpad sea largo (F2 del pase fresco)", () => {
    const dump = ["FATAL: No usable sandbox!", ...Array.from({ length: 10 }, (_, i) => `  frame ${i}`), "[end of stack trace]"];
    const err = chromeFailure({ status: 134 }, dump.join("\n"));
    expect(err.message).toMatch(/Chrome falló \(salió con código 134\)/);
    expect(err.message).toMatch(/No usable sandbox!/);
  });
  it("una muerte por señal no se reporta como «código null»", () => {
    expect(chromeFailure({ status: null, signal: "SIGABRT" }, "boom").message).toMatch(/murió por señal SIGABRT/);
  });
  it("un proceso que no llegó a arrancar dice su error, no «código null» (issue #75)", () => {
    const err = chromeFailure({ status: null, signal: null, message: "spawnSync chrome ENOBUFS" }, "");
    expect(err.message).toMatch(/no pudo ejecutarse \(spawnSync chrome ENOBUFS\)/);
    expect(err.message).not.toMatch(/null/);
  });
  it("sin stderr no inventa una causa", () => {
    expect(chromeFailure({ status: 1 }, "").message).not.toMatch(/chrome:/);
  });
});
