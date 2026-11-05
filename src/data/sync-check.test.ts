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
import {
  POLICY_FILES,
  isRootPattern,
  policyProblems,
  robotsAgents,
  robotsDirectives,
  robotsGroups,
  type PolicyFile
} from "../../tools/sync-ai-policy";
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

  // F2 del pase 4: sin el nodo FAQ la capa quedaba verde y la nota seguía
  // declarando cobertura del FAQ citable.
  it("un fixture SIN FAQPage es un problema (la capa dice que mide el FAQ)", () => {
    const withoutFaq = { ...FIXTURE, nodes: FIXTURE.nodes.filter((node) => node["@type"] !== "FAQPage") };
    const problems = checkEntityFixture(withoutFaq).problems;
    expect(problems.join("\n")).toMatch(/esperado 1 nodo FAQPage, hay 0/);
  });

  it("dos FAQPage es un problema (el engine emite a lo sumo uno)", () => {
    const faq = FIXTURE.nodes.find((node) => node["@type"] === "FAQPage")!;
    const problems = checkEntityFixture({ ...FIXTURE, nodes: [...FIXTURE.nodes, faq] }).problems;
    expect(problems.join("\n")).toMatch(/esperado 1 nodo FAQPage, hay 2/);
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
    expect(problems.join("\n")).toMatch(/sin agente de training/);
  });

  /**
   * ESCALATE(1) del pase 2 — la clase («el gate no lee la gramática que el
   * crawler sí lee») reapareció: caja/indentación y después comentario de fin de
   * línea. El instrumento es el tokenizador `robotsDirectives` (RFC 9309
   * §2.2.1), no otra regex anclada; estos casos fijan sus dos caras.
   */
  it("`user-agent: *` con comentario de fin de línea ES el wildcard (RFC 9309 §2.2.1)", () => {
    const problems = policyProblems(
      files({ "robots.txt": "user-agent: * # permitir todo\nAllow: /\nDisallow: /\n" })
    );
    expect(problems.join("\n")).toMatch(/User-agent: \*/);
  });

  it("`Allow: / # nota` es una directiva válida (no un falso «sin grupo»)", () => {
    const problems = policyProblems(
      files({ "robots.txt": "# cabecera\nUser-agent: Googlebot\nAllow: /   # retrieval\nUser-agent: GPTBot\nDisallow: / # training\n" })
    );
    expect(problems).toEqual([]);
  });

  it("el tokenizador normaliza caja, indentación, comentario y CRLF", () => {
    const directives = robotsDirectives("  USER-AGENT :  *  # todo\r\nAllow:/ # raíz\r\n");
    expect(directives).toEqual([
      { key: "user-agent", value: "*" },
      { key: "allow", value: "/" }
    ]);
  });

  /**
   * ESCALATE(1), 2.ª reaparición (pase 3): el tokenizador cerró la capa léxica,
   * pero el gate medía presencia GLOBAL de la directiva. Un `Disallow: /` cuyo
   * grupo de training perdió sus `User-agent` se cuelga del grupo de retrieval y
   * el archivo dice exactamente lo contrario de lo que la política declara.
   */
  it("un `Disallow: /` huérfano (sin su grupo de agentes) invierte la postura", () => {
    const problems = policyProblems(
      files({ "robots.txt": "User-agent: Googlebot\nAllow: /\nDisallow: /\n" })
    );
    expect(problems.join("\n")).toMatch(/conjunto combinado/);
  });

  it("una regla antes del primer `User-agent` no crea grupo (RFC 9309 §2.2.1)", () => {
    const problems = policyProblems(files({ "robots.txt": "Allow: /\nDisallow: /\n" }));
    expect(problems.join("\n")).toMatch(/sin agente de retrieval/);
    expect(problems.join("\n")).toMatch(/sin agente de training/);
  });

  /**
   * ESCALATE(1), 3.ª reaparición (pase 4): el grupo SINTÁCTICO no es el grupo
   * EFECTIVO. RFC 9309 §2.1 (el `emptyline` no termina el grupo) y §2.2.1 (los
   * grupos que matchean el mismo product token se combinan). Las tres sondas del
   * pase pasan a tests: hoy el gate las rechaza.
   */
  const CANONICAL = "# ai-policy\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n";

  it("un `Allow: /` después de una línea en blanco final se cuelga del último grupo (emptyline no termina)", () => {
    const problems = policyProblems(files({ "robots.txt": `${CANONICAL}\nAllow: /\n` }));
    expect(problems.join("\n")).toMatch(/conjunto combinado/);
    expect(problems.join("\n")).toContain("gptbot");
  });

  it("un agente repetido en dos grupos COMBINA sus reglas (§2.2.1) y queda contradictorio", () => {
    const problems = policyProblems(
      files({
        "robots.txt":
          "User-agent: Googlebot\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n"
      })
    );
    expect(problems.join("\n")).toMatch(/conjunto combinado/);
    expect(problems.join("\n")).toContain("gptbot");
  });

  it("un `User-agent:` vacío no nombra product token (ABNF product-token)", () => {
    const problems = policyProblems(files({ "robots.txt": "User-agent:\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n" }));
    expect(problems.join("\n")).toMatch(/sin product token válido/);
  });

  it("`robotsAgents` combina por agente y normaliza caja (merge §2.2.1)", () => {
    const agents = robotsAgents(
      "User-agent: Googlebot\nAllow: /\n\nUser-agent: googlebot\nDisallow: /privado\n\nUser-agent: GPTBot\nDisallow: /\n"
    );
    expect([...agents.keys()]).toEqual(["googlebot", "gptbot"]);
    expect(agents.get("googlebot")).toEqual([
      { key: "allow", value: "/" },
      { key: "disallow", value: "/privado" }
    ]);
  });

  it("`robotsGroups` arma los grupos como los lee el crawler", () => {
    const groups = robotsGroups(
      "# cabecera\nUser-agent: Googlebot\nUser-agent: Bingbot\nAllow: / # retrieval\n\nUser-agent: GPTBot\nDisallow: /\n"
    );
    expect(groups).toHaveLength(2);
    expect(groups[0].agents).toEqual(["Googlebot", "Bingbot"]);
    expect(groups[0].rules).toEqual([{ key: "allow", value: "/" }]);
    expect(groups[1].agents).toEqual(["GPTBot"]);
    expect(groups[1].rules).toEqual([{ key: "disallow", value: "/" }]);
  });

  it("nombra los tres artefactos cuando faltan", () => {
    const problems = policyProblems(files({ "robots.txt": null, "llms.txt": null, "AI-POLICY.md": null }));
    for (const file of POLICY_FILES) expect(problems.join("\n")).toContain(file);
  });

  /**
   * Pase 5 — F2 (artefacto vacío apagaba su capa), F3 (`Sitemap:` partía el
   * grupo), F4 (`Disallow: /*` daba falso positivo). Cada uno con su sonda.
   */
  it("un artefacto VACÍO no apaga su capa (F2: 0 bytes ≠ política)", () => {
    const problems = policyProblems(files({ "robots.txt": "", "llms.txt": "", "AI-POLICY.md": "" }));
    for (const file of POLICY_FILES) {
      expect(problems.join("\n")).toMatch(new RegExp(`${file.replace(".", "\\.")}: vacío`));
    }
  });

  it("un `Sitemap:` entre dos `User-agent` NO parte el grupo (RFC 9309 §2.2.4)", () => {
    // Sonda del pase 5: sin el fix, `Sitemap:` contaba como rule, cerraba la
    // fase de agentes y dejaba a ClaudeBot con la lista de reglas VACÍA,
    // mientras el crawler lo mete en el mismo grupo que CCBot.
    const agents = robotsAgents(
      "User-agent: ClaudeBot\nSitemap: https://x.test/sitemap.xml\nUser-agent: CCBot\nAllow: /\n"
    );
    expect([...agents.keys()]).toEqual(["claudebot", "ccbot"]);
    expect(agents.get("claudebot")).toEqual([{ key: "allow", value: "/" }]);

    const problems = policyProblems(
      files({
        "robots.txt":
          "User-agent: Googlebot\nSitemap: https://x.test/sitemap.xml\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n"
      })
    );
    expect(problems).toEqual([]);
  });

  it("`Disallow: /*` bloquea tanto como `/` (path-pattern §2.2.3, F4)", () => {
    const problems = policyProblems(
      files({ "robots.txt": "User-agent: Googlebot\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /*\n" })
    );
    expect(problems).toEqual([]);
    expect(isRootPattern("/*")).toBe(true);
    expect(isRootPattern("/$")).toBe(true);
    expect(isRootPattern("/privado")).toBe(false);
  });
});
