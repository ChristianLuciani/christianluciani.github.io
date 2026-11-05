import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decide, existsIn } from "../../tools/golden/policy.ts";

/**
 * Evidencia de la guarda de CI: la rama de fallo y la de declaración se prueban
 * acá, no en un `run:` de YAML que nunca se ejecuta en el PR que la introduce.
 */
describe("golden — política de declaración", () => {
  const base = { baselineInBase: true, changed: true, body: "" };

  it("pasa sin declaración cuando el render no cambió", () => {
    expect(decide({ ...base, changed: false }).ok).toBe(true);
  });

  it("pasa sin declaración cuando el PR introduce el baseline", () => {
    const r = decide({ ...base, baselineInBase: false });
    expect(r.ok).toBe(true);
    expect(r.reason).toContain("baseline nuevo");
  });

  it("falla si el golden cambió y el body no declara nada", () => {
    const r = decide({ ...base, body: "## Qué\n\nUn refactor sin cambios de render.\n" });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("sin declarar");
  });

  it("pasa con la declaración exacta", () => {
    expect(decide({ ...base, body: "## Qué\n\nRender: cambia (rediseño)\n" }).ok).toBe(true);
  });

  it("acepta la declaración sin distinguir mayúsculas ni espacios", () => {
    expect(decide({ ...base, body: "render:   CAMBIA" }).ok).toBe(true);
  });

  it("no acepta 'Render: no cambia' como declaración", () => {
    expect(decide({ ...base, body: "Render: no cambia\n" }).ok).toBe(false);
  });

  it("no acepta la palabra suelta en medio de una frase", () => {
    expect(decide({ ...base, body: "esto cambia el render: cambia todo\n" }).ok).toBe(false);
  });

  it("acepta la forma markdown en negrita", () => {
    expect(decide({ ...base, body: "**Render:** cambia (rediseño)" }).ok).toBe(true);
  });

  it("ignora un ejemplo dentro de un bloque de código", () => {
    const body = "```\nRender: cambia\n```\n\nEste PR sólo refactoriza.";
    expect(decide({ ...base, body }).ok).toBe(false);
  });

  it("ignora también los fences con tilde", () => {
    expect(decide({ ...base, body: "~~~\nRender: cambia\n~~~" }).ok).toBe(false);
  });

  it("acepta la declaración como encabezado markdown", () => {
    expect(decide({ ...base, body: "### Render: cambia" }).ok).toBe(true);
  });

  it("ignora un bloque de código indentado", () => {
    expect(decide({ ...base, body: "Ejemplo:\n\n    Render: cambia\n" }).ok).toBe(false);
  });

  it("ignora un fence de cuatro backticks", () => {
    const body = "````\n~~~~\nRender: cambia\n~~~~\n````";
    expect(decide({ ...base, body }).ok).toBe(false);
  });
});

describe("golden — existe en la base (git real)", () => {
  const git = (cwd: string, args: string[]): void => {
    execFileSync("git", args, {
      cwd,
      stdio: "ignore",
      env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" }
    });
  };

  it("distingue el archivo ausente de la ref inválida", () => {
    const dir = mkdtempSync(join(tmpdir(), "golden-policy-"));
    try {
      git(dir, ["init", "-q"]);
      mkdirSync(join(dir, "tests/golden"), { recursive: true });
      writeFileSync(join(dir, "tests/golden/museo.html"), "<html></html>", "utf8");
      git(dir, ["add", "."]);
      git(dir, ["commit", "-q", "-m", "base"]);

      expect(existsIn("HEAD", "tests/golden/museo.html", dir)).toBe(true);
      expect(existsIn("HEAD", "tests/golden/otro.html", dir)).toBe(false);
      // La ref inválida NO se lee como "baseline nuevo": la guarda falla cerrada.
      expect(() => existsIn("no-existe-esta-ref", "tests/golden/museo.html", dir)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
