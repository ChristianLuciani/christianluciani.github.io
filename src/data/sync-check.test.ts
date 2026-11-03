/**
 * `sync:check` — el gate falla con un drift de UN carácter (issue #110).
 *
 * Cubre las tres capas: diff byte a byte (archivo:línea), header que no miente
 * y detección end-to-end por CLI (`npm run sync:check`), incluida una copia con
 * un solo carácter cambiado. La paridad contra `profile-data` (capa workspace)
 * se corre localmente con `--workspace`; CI no tiene el repo privado.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  COMMITTED_PATH,
  diffSources,
  parseHeader,
  runCheck
} from "../../tools/sync-check";

const COMMITTED = readFileSync(COMMITTED_PATH, "utf8");
const TSX = resolve(process.cwd(), "node_modules", ".bin", "tsx");

const tempDirs: string[] = [];

function tempFile(content: string, name = "profile.generated.ts"): string {
  const dir = mkdtempSync(join(tmpdir(), "sync-check-"));
  tempDirs.push(dir);
  const path = join(dir, name);
  writeFileSync(path, content, "utf8");
  return path;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function runCli(args: string[]): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(TSX, ["tools/sync-check.ts", ...args], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    const e = err as { status?: number; stdout?: string | Buffer; stderr?: string | Buffer };
    return {
      status: e.status ?? 1,
      stdout: String(e.stdout ?? ""),
      stderr: String(e.stderr ?? "")
    };
  }
}

describe("diff byte a byte", () => {
  it("archivo al día → sin diff", () => {
    expect(diffSources("a\nb\n", "a\nb\n")).toBeNull();
  });

  it("un carácter distinto → reporta la línea exacta", () => {
    const diff = diffSources("a\nb\nc\n", "a\nbX\nc\n");
    expect(diff).toEqual({ line: 2, expected: "b", actual: "bX" });
  });

  it("una línea faltante también es drift (la reporta como línea vacía)", () => {
    expect(diffSources("a\nb\n", "a\n")).toEqual({ line: 2, expected: "b", actual: "" });
  });
});

describe("header del snapshot", () => {
  it("parsea pin, generatedAt, engine y schema", () => {
    const header = parseHeader(COMMITTED)!;
    expect(header.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(header.generatedAt).toBeNull();
    expect(header.engine).toMatch(/^\d+\.\d+\.\d+$/);
    expect(header.schema).toMatch(/^\d+\.\d+$/);
  });
});

describe("sync:check — capas sin workspace (modo CI)", () => {
  it("el snapshot commiteado pasa self + fixture", () => {
    const result = runCheck();
    expect(result.failures).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.notes.join("\n")).toMatch(/fixture: proyección determinista/);
    expect(result.notes.join("\n")).toMatch(/workspace: sin PROFILE_DATA_PATH/);
  });

  it("CLI: archivo al día → exit 0", () => {
    const copy = tempFile(COMMITTED);
    const { status, stdout } = runCli(["--generated", copy]);
    expect(status).toBe(0);
    expect(stdout).toContain("sync:check OK");
  });

  it("CLI: un carácter de drift → exit 1 con archivo:línea", () => {
    const lines = COMMITTED.split("\n");
    const idx = lines.findIndex((line) => line.trimStart().startsWith('"name"'));
    expect(idx).toBeGreaterThan(0);
    lines[idx] = lines[idx].replace('"', "");
    const copy = tempFile(lines.join("\n"));

    const { status, stderr } = runCli(["--generated", copy]);
    expect(status).toBe(1);
    expect(stderr).toContain(`drift en ${copy}:${idx + 1}`);
    expect(stderr).toMatch(/esperado:.*\n\s+actual:/);
  });

  it("CLI: header con el pin cambiado → exit 1 (el header no puede mentir)", () => {
    const lines = COMMITTED.split("\n");
    const pinLine = lines.findIndex((line) => line.startsWith("// source: profile-data @"));
    lines[pinLine] = lines[pinLine].replace(/@ [0-9a-f]{40}/, `@ ${"0".repeat(40)}`);
    const copy = tempFile(lines.join("\n"));

    const { status, stderr } = runCli(["--generated", copy]);
    expect(status).toBe(1);
    expect(stderr).toContain("header pin");
  });

  it("CLI: --help sale 0", () => {
    const { status, stdout } = runCli(["--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("--workspace");
  });
});
