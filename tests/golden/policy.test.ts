import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  decide,
  declarationBetween,
  parseDeclaration,
  treeOf
} from "../../tools/golden/policy.ts";

/**
 * Evidencia de la guarda de CI: la declaración vive en un trailer de commit, así
 * que el formato y la rama de fallo se prueban acá — no en un `run:` de YAML
 * que nunca ejecuta su camino rojo en el PR que la introduce.
 */
describe("golden — declaración por trailer", () => {
  it("lee el trailer exacto", () => {
    expect(parseDeclaration("feat: algo\n\nGolden-Cambio: render\n")).toBe("render");
  });

  it("ignora mayúsculas y espacios del valor", () => {
    expect(parseDeclaration("Golden-Cambio:   DATOS")).toBe("datos");
  });

  it("render gana si aparece en cualquier commit", () => {
    expect(parseDeclaration("Golden-Cambio: datos\n\n---\n\nGolden-Cambio: render")).toBe("render");
  });

  it("no acepta valores fuera del vocabulario", () => {
    expect(parseDeclaration("Golden-Cambio: si")).toBeNull();
    expect(parseDeclaration("Golden-Cambio:")).toBeNull();
  });

  it("no confunde una mención en prosa con un trailer", () => {
    expect(parseDeclaration("explica que Golden-Cambio: render no aplica")).toBeNull();
  });

  it("no se satisface con markdown: fences, citas o comentarios HTML", () => {
    const body = [
      "> ```",
      "> Golden-Cambio: render",
      "> ```",
      "<!-- Golden-Cambio: render -->",
      "<pre>Golden-Cambio: render</pre>"
    ].join("\n");
    expect(parseDeclaration(body)).toBeNull();
  });
});

describe("golden — decide", () => {
  const base = {
    baselineInBase: true,
    goldenFamilyInBase: true,
    changed: true,
    comparatorPresent: true,
    dataChanged: false,
    declaration: null as "render" | "datos" | null
  };

  it("pasa sin declaración cuando el render no cambió", () => {
    expect(decide({ ...base, changed: false }).ok).toBe(true);
  });

  it("pasa sin declaración cuando el PR introduce el baseline", () => {
    const r = decide({ ...base, baselineInBase: false, goldenFamilyInBase: false });
    expect(r.ok).toBe(true);
    expect(r.reason).toContain("baseline nuevo");
  });

  it("no exime un rename del baseline (la familia ya existía)", () => {
    expect(decide({ ...base, baselineInBase: false, goldenFamilyInBase: true }).ok).toBe(false);
  });

  it("falla si el golden cambió sin trailer", () => {
    const r = decide(base);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("Golden-Cambio: render");
  });

  it("pasa con 'render'", () => {
    expect(decide({ ...base, declaration: "render" }).ok).toBe(true);
  });

  it("acepta 'datos' sólo si el snapshot se movió", () => {
    expect(decide({ ...base, declaration: "datos" }).ok).toBe(false);
    expect(decide({ ...base, declaration: "datos", dataChanged: true }).ok).toBe(true);
  });

  it("falla si el comparador no existe en el PR", () => {
    const r = decide({ ...base, comparatorPresent: false });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("comparador");
  });
});

describe("golden — git real", () => {
  const git = (cwd: string, args: string[]): void => {
    execFileSync("git", args, {
      cwd,
      stdio: "ignore",
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "t",
        GIT_AUTHOR_EMAIL: "t@t",
        GIT_COMMITTER_NAME: "t",
        GIT_COMMITTER_EMAIL: "t@t"
      }
    });
  };

  it("lee el trailer del rango base..HEAD y distingue la ref inválida", () => {
    const dir = mkdtempSync(join(tmpdir(), "golden-policy-"));
    try {
      git(dir, ["init", "-q"]);
      mkdirSync(join(dir, "tests/golden"), { recursive: true });
      writeFileSync(join(dir, "tests/golden/museo.html"), "<html></html>", "utf8");
      git(dir, ["add", "."]);
      git(dir, ["commit", "-q", "-m", "base"]);
      const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();

      writeFileSync(join(dir, "tests/golden/museo.html"), "<html> </html>", "utf8");
      git(dir, ["add", "."]);
      git(dir, ["commit", "-q", "-m", "fix: render", "-m", "Golden-Cambio: render"]);

      expect(treeOf("HEAD", dir)).toContain("tests/golden/museo.html");
      expect(declarationBetween(base, "HEAD", dir)).toBe("render");
      expect(() => treeOf("no-existe-esta-ref", dir)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
