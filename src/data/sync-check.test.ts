/**
 * `sync:check` — el gate falla con un drift de UN carácter (issue #110).
 *
 * Cubre las tres capas: diff byte a byte (archivo:línea), header que no miente
 * y detección end-to-end por CLI (`npm run sync:check`), incluida una copia con
 * un solo carácter cambiado. La paridad contra `profile-data` (capa workspace)
 * se corre localmente con `--workspace`; CI no tiene el repo privado, así que
 * el cierre dice `PARCIAL` (nunca `✅ OK`) cuando `verified < total`.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  COMMITTED_PATH,
  ENTITY_FIXTURE_PATH,
  checkEntityFixture,
  diffSources,
  parseHeader,
  runCheck,
  summaryLine,
  type CheckLayer
} from "../../tools/sync-check";
import { COMMITTED_ENTITY_PATH as ENTITY_COMMITTED_PATH } from "../../tools/sync-entity";
import { POLICY_FILES, policyProblems, type PolicyFile } from "../../tools/sync-ai-policy";
import { resolvePaths } from "../../tools/sync-profile";

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
      env: { ...process.env, PROFILE_DATA_PATH: "" },
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
  // Aísla el modo CI de un PROFILE_DATA_PATH ambiente (local/agente): sin esto
  // el test verificaría otra cosa según la máquina.
  beforeEach(() => {
    process.env.PROFILE_DATA_PATH = "";
  });

  it("el snapshot commiteado pasa self + fixture (perfil, entidad y política)", () => {
    const result = runCheck();
    expect(result.failures).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.notes.join("\n")).toMatch(/fixture: proyección determinista/);
    expect(result.notes.join("\n")).toMatch(/workspace: sin PROFILE_DATA_PATH/);
    expect(result.notes.join("\n")).toMatch(/entity-fixture: proyección determinista/);
    expect(result.notes.join("\n")).toMatch(/policy-self: 3 artefacto\(s\) presentes/);
  });

  it("contabilidad: PARCIAL 5/8 y las tres capas de paridad declaradas fuera", () => {
    const result = runCheck();
    expect(result.layers.map((layer) => layer.name)).toEqual([
      "self",
      "fixture",
      "workspace",
      "entity-self",
      "entity-fixture",
      "entity-workspace",
      "policy-self",
      "policy-workspace"
    ]);
    expect(result.layers.filter((layer) => layer.verified).map((layer) => layer.name)).toEqual([
      "self",
      "fixture",
      "entity-self",
      "entity-fixture",
      "policy-self"
    ]);
    const summary = summaryLine(result.layers);
    expect(summary).toContain("5/8 capa(s) verificada(s): self, fixture, entity-self, entity-fixture, policy-self");
    expect(summary).toMatch(/no verificada\(s\): workspace/);
    expect(summary).toMatch(/entity-workspace/);
    expect(summary).toMatch(/policy-workspace/);
    expect(summary).toMatch(/sin PROFILE_DATA_PATH/);
    // Con verified < total NO hay tilde de OK: el rótulo dice PARCIAL.
    expect(summary).toContain("PARCIAL");
    expect(summary).not.toContain("✅");
  });

  it("contabilidad: con las ocho capas verdes cuenta OK 8/8 (modo --workspace)", () => {
    const names = [
      "self",
      "fixture",
      "workspace",
      "entity-self",
      "entity-fixture",
      "entity-workspace",
      "policy-self",
      "policy-workspace"
    ] as const;
    const green: CheckLayer[] = names.map((name) => ({ name, verified: true, note: `${name}: ok` }));
    const summary = summaryLine(green);
    expect(summary).toContain("8/8 capa(s) verificada(s):");
    expect(summary).toContain("sync:check OK");
    expect(summary).not.toContain("PARCIAL");
    expect(summary).not.toContain("no verificada");
  });

  it("CLI: archivo al día → exit 0 y cierre PARCIAL 5/8", () => {
    const copy = tempFile(COMMITTED);
    const { status, stdout } = runCli(["--generated", copy]);
    expect(status).toBe(0);
    expect(stdout).toContain("sync:check PARCIAL");
    expect(stdout).not.toContain("✅ sync:check OK");
    expect(stdout).toContain("5/8 capa(s) verificada(s): self, fixture, entity-self, entity-fixture, policy-self");
    expect(stdout).not.toContain("8/8");
  });

  it("CLI: una entidad alterada → exit 1 con archivo:línea (capa entity-self)", () => {
    const source = readFileSync(ENTITY_COMMITTED_PATH, "utf8");
    const lines = source.split("\n");
    const idx = lines.findIndex((line) => line.includes('"@id":'));
    expect(idx).toBeGreaterThan(0);
    lines[idx] = lines[idx].replace('"@id": "', '"@id": "x');
    const copy = tempFile(lines.join("\n"), "entity.generated.ts");

    const { status, stderr } = runCli(["--entity", copy]);
    expect(status).toBe(1);
    expect(stderr).toContain(`drift en ${copy}:${idx + 1}`);
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

/**
 * F2 — regresión de `loadDotEnv`: el `.env` documentado (`cp .env.example .env`)
 * repoblaba `PROFILE_DATA_PATH=""` porque `""` es falsy, y los tests del modo CI
 * corrían la capa workspace. Un valor DEFINIDO (aunque vacío) no se pisa.
 */
describe("resolvePaths — `.env` no pisa una variable definida (aunque sea vacía)", () => {
  const KEY = "PROFILE_DATA_PATH";
  let previous: string | undefined;

  beforeEach(() => {
    previous = process.env[KEY];
  });

  afterEach(() => {
    if (previous === undefined) delete process.env[KEY];
    else process.env[KEY] = previous;
  });

  function dotEnvDir(value: string): string {
    const dir = mkdtempSync(join(tmpdir(), "sync-env-"));
    tempDirs.push(dir);
    writeFileSync(join(dir, ".env"), `${KEY}=${value}\n`, "utf8");
    return dir;
  }

  it('`""` definido no se pisa desde .env (aislamiento del modo CI)', () => {
    const dir = dotEnvDir("/tmp/workspace-desde-dotenv");
    process.env[KEY] = "";
    expect(resolvePaths(dir).workspace).toBe("");
    expect(process.env[KEY]).toBe("");
  });

  it("una variable ausente sí se carga desde .env", () => {
    const dir = dotEnvDir("/tmp/workspace-desde-dotenv");
    delete process.env[KEY];
    expect(resolvePaths(dir).workspace).toBe("/tmp/workspace-desde-dotenv");
    expect(process.env[KEY]).toBe("/tmp/workspace-desde-dotenv");
  });
});

/**
 * Integración real con el SSOT: sólo corre cuando hay workspace disponible
 * (local/agente). En CI se saltea porque el repo privado no se clona; la
 * contabilidad 8/8 ya está cubierta arriba como contrato puro.
 */
const LOCAL_WORKSPACE = process.env.PROFILE_DATA_PATH;
describe.skipIf(!LOCAL_WORKSPACE)("sync:check — con --workspace (integración local)", () => {
  it("cuando el pipeline real corre limpio, cuenta 8/8", () => {
    const result = runCheck({ workspace: LOCAL_WORKSPACE });
    expect(result.failures).toEqual([]);
    expect(result.layers.filter((layer) => layer.verified).map((layer) => layer.name)).toEqual([
      "self",
      "fixture",
      "workspace",
      "entity-self",
      "entity-fixture",
      "entity-workspace",
      "policy-self",
      "policy-workspace"
    ]);
    expect(summaryLine(result.layers)).toContain("8/8");
  });
});

/**
 * Reconciliación del pase fresco de #140 (F1 y F2, MAJOR, ALCANCE=diff). Cada
 * test reproduce el defecto: si el gate vuelve a ser documentación y no
 * enforcement, este suite se pone rojo.
 */
describe("entity-fixture — el FAQ se exige CITABLE, no sólo no vacío (F1)", () => {
  const FIXTURE = JSON.parse(readFileSync(ENTITY_FIXTURE_PATH, "utf8")) as {
    schemaVersion: string;
    nodes: Record<string, unknown>[];
  };

  function withAnswer(answer: Record<string, unknown>): unknown {
    const faq = FIXTURE.nodes.find((node) => node["@type"] === "FAQPage")!;
    const [first, ...rest] = faq["mainEntity"] as Record<string, unknown>[];
    return {
      ...FIXTURE,
      nodes: FIXTURE.nodes.map((node) =>
        node === faq ? { ...faq, mainEntity: [{ ...first, acceptedAnswer: answer }, ...rest] } : node
      )
    };
  }

  it("el fixture commiteado pasa (cada respuesta trae citation)", () => {
    expect(checkEntityFixture(FIXTURE).problems).toEqual([]);
  });

  it("una respuesta SIN citation es un problema (el SPEC decía que se medía)", () => {
    const problems = checkEntityFixture(withAnswer({ "@type": "Answer", text: "sin cita" })).problems;
    expect(problems.join("\n")).toMatch(/acceptedAnswer\.citation/);
  });

  it("una citation que no es URL no cuenta como cita", () => {
    const problems = checkEntityFixture(
      withAnswer({ "@type": "Answer", text: "texto", citation: "un-paper.pdf" })
    ).problems;
    expect(problems.join("\n")).toMatch(/acceptedAnswer\.citation/);
  });
});

describe("policyProblems — el wildcard se detecta como lo lee un crawler (F2)", () => {
  const ROBOTS_OK = "# ai-policy\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n";

  function files(overrides: Partial<Record<PolicyFile, string | null>> = {}): Record<PolicyFile, string | null> {
    const base = {
      "robots.txt": ROBOTS_OK,
      "llms.txt": "# Título del índice\n\n- [AI-POLICY.md](AI-POLICY.md)\n",
      "AI-POLICY.md": "# Política\n"
    } as Record<PolicyFile, string | null>;
    return { ...base, ...overrides };
  }

  it("la postura del engine pasa", () => {
    expect(policyProblems(files())).toEqual([]);
  });

  it("`user-agent: *` en minúscula y con indentación NO pasa (RFC 9309 §2.2.1)", () => {
    const problems = policyProblems(
      files({ "robots.txt": "  user-agent: *\n  allow: /\n  disallow: /\n" })
    );
    expect(problems.join("\n")).toMatch(/User-agent: \*/);
  });

  it("un grupo de training ausente es un problema (aunque haya wildcard-cero)", () => {
    const problems = policyProblems(files({ "robots.txt": "User-agent: Googlebot\nAllow: /\n" }));
    expect(problems.join("\n")).toMatch(/sin grupo de training/);
  });

  it("nombra los tres artefactos cuando faltan", () => {
    const problems = policyProblems(files({ "robots.txt": null, "llms.txt": null, "AI-POLICY.md": null }));
    for (const file of POLICY_FILES) expect(problems.join("\n")).toContain(file);
  });
});
