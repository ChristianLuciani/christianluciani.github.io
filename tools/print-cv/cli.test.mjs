/**
 * Instrumento de F1 de la 3.ª ronda de #119: el CLI del gate de paginación NO
 * puede salir 0 cuando no midió. Antes, invocado por un symlink, Node
 * realpath-ea `import.meta.url` pero `argv[1]` conserva el path del symlink; el
 * guard comparaba strings y el proceso terminaba 0 sin imprimir nada. Estos
 * tests corren el CLI real con `spawnSync` y exigen exit != 0 (2 = no se pudo
 * medir) en cada camino donde la medición es imposible.
 *
 * No necesitan Chrome: los casos de entorno fallan ANTES de lanzarlo. El camino
 * feliz (medir un PDF real) lo cubre `npm run print:verify` en CI.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "verify-pagination.mjs");

const tempDirs = [];
function tempDir(prefix = "cv-cli-") {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length) rmSync(tempDirs.pop(), { recursive: true, force: true });
});

/** Corre el CLI y devuelve { status, stdout, stderr }. */
function runCli(args, { cwd, env = {} } = {}) {
  return spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    timeout: 60_000,
    env: { ...process.env, ...env },
  });
}

/** Un `dist/index.html` mínimo que pasa `removeFooterDiv` (exactamente un footer). */
function writeArtifact(dir) {
  mkdirSync(dir, { recursive: true });
  const html = join(dir, "index.html");
  writeFileSync(
    html,
    '<html><body><div id="print-cv"><p>x</p><div class="p-footer">generado @ abc</div></div></body></html>',
    "utf8",
  );
  return html;
}

describe("verify-pagination CLI — nunca exit 0 sin medir (F1 de la 3.ª ronda)", () => {
  it("sin argumento y sin dist/: no puede medir → exit 2", () => {
    const cwd = tempDir();
    const result = runCli([SCRIPT], { cwd });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/no se pudo medir/);
    expect(result.stderr).toMatch(/no existe/);
  });

  it("con un dist inexistente → exit 2", () => {
    const cwd = tempDir();
    const result = runCli([SCRIPT, join(cwd, "dist", "nope.html")], { cwd });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/no se pudo medir/);
  });

  /* LA regresión: invocado por symlink, el guard viejo daba exit 0 sin salida. */
  it("invocado por symlink sin dist: detecta que es main y falla → exit 2", () => {
    const binDir = tempDir("cv-cli-bin-");
    const link = join(binDir, "vp.mjs");
    symlinkSync(SCRIPT, link);
    const cwd = tempDir();
    const result = runCli([link], { cwd });
    expect(result.stdout).toBe("");
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/no se pudo medir/);
  });

  it("invocado por symlink con HTML válido y CHROME_PATH inválido → exit 2 (main corrió)", () => {
    const binDir = tempDir("cv-cli-bin-");
    const link = join(binDir, "vp.mjs");
    symlinkSync(SCRIPT, link);
    const html = writeArtifact(tempDir("cv-cli-dist-"));
    const result = runCli([link, html], {
      cwd: dirname(html),
      env: { CHROME_PATH: join(tempDir("cv-cli-no-chrome-"), "chrome-que-no-existe") },
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/no se pudo medir/);
    expect(result.stderr).toMatch(/CHROME_PATH/);
  });

  it("con CHROME_PATH inválido → exit 2 (no cae a otro binario ni da OK)", () => {
    const html = writeArtifact(tempDir("cv-cli-dist-"));
    const result = runCli([SCRIPT, html], {
      cwd: dirname(html),
      env: { CHROME_PATH: join(tempDir("cv-cli-no-chrome-"), "chrome-que-no-existe") },
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/CHROME_PATH/);
  });
});
