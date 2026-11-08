import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ensureBase, hasCommit } from "../../tools/golden/base.ts";

/**
 * #167 — la guarda de CI no puede MUTAR el clon que la corre.
 *
 * `policy-cli` hacía `git fetch --depth=1 origin <base>` siempre: el comando
 * dejaba `is-shallow=true` en un clon completo, truncaba el historial y rompía
 * el pre-gate de trabajo (que exige un clon completo antes de abrir un PR) con
 * sólo correr un gate del propio repo. La obligación, en una línea: obtener la
 * base del PR sin degradar el clon, y si no se puede, fallar accionable.
 */

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@t",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@t"
};

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", env: GIT_ENV }).trim();
}

function isShallow(cwd: string): boolean {
  return git(cwd, ["rev-parse", "--is-shallow-repository"]) === "true";
}

/** Commit en `dir` con los archivos dados; devuelve el sha. */
function commit(cwd: string, message: string, files: Record<string, string>): string {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(cwd, path)), { recursive: true });
    writeFileSync(join(cwd, path), content, "utf8");
  }
  git(cwd, ["add", "."]);
  git(cwd, ["commit", "-q", "-m", message]);
  return git(cwd, ["rev-parse", "HEAD"]);
}

/** Repo mínimo con lo que el gate mira: baseline + comparador. */
function seedUpstream(dir: string): string {
  git(dir, ["init", "-q", "-b", "main"]);
  return commit(dir, "base", {
    "tests/golden/museo.html": "<html>base</html>\n",
    "tests/golden/golden.test.ts": "// comparador\n"
  });
}

function withTmp(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "golden-cli-"));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("golden — la base del PR no degrada el clon (#167)", () => {
  it("no fetchea cuando la base ya está en el clon", () => {
    withTmp((dir) => {
      const base = seedUpstream(dir);
      // `origin` apunta a un path inexistente: cualquier fetch fallaría.
      git(dir, ["remote", "add", "origin", join(dir, "no-existe")]);
      expect(hasCommit(base, dir)).toBe(true);
      expect(() => ensureBase(base, dir)).not.toThrow();
      expect(isShallow(dir)).toBe(false);
    });
  });

  it("trae la base ausente sin volver shallow el clon", () => {
    withTmp((dir) => {
      const upstream = join(dir, "upstream");
      mkdirSync(upstream, { recursive: true });
      seedUpstream(upstream);

      const work = join(dir, "work");
      git(dir, ["clone", "-q", upstream, work]);
      expect(isShallow(work)).toBe(false);

      // La base del PR vive sólo en el upstream (el clon no la tiene).
      const base = commit(upstream, "rama del PR", { "README.md": "hola\n" });
      expect(hasCommit(base, work)).toBe(false);

      ensureBase(base, work);

      expect(hasCommit(base, work)).toBe(true);
      expect(isShallow(work)).toBe(false);
    });
  });

  it("el CLI completo deja el clon completo y decide con la base", () => {
    withTmp((dir) => {
      const upstream = join(dir, "upstream");
      mkdirSync(upstream, { recursive: true });
      const base = seedUpstream(upstream);

      const work = join(dir, "work");
      git(dir, ["clone", "-q", upstream, work]);
      // El PR: HEAD desciende de la base (el caso normal de un PR real).
      commit(work, "feat: cambio que no toca el golden", { "README.md": "hola\n" });

      const run = spawnSync(
        resolve("node_modules/.bin/tsx"),
        [resolve("tools/golden/policy-cli.ts")],
        { cwd: work, encoding: "utf8", env: { ...GIT_ENV, BASE_SHA: base } }
      );

      expect(run.stderr, `stderr: ${run.stderr}`).not.toContain("no se pudo traer la base");
      expect(run.status, `stderr: ${run.stderr}`).toBe(0);
      expect(isShallow(work)).toBe(false);
    });
  });

  it("una base no ancestro falla visible, nunca degradando el clon", () => {
    withTmp((dir) => {
      const upstream = join(dir, "upstream");
      mkdirSync(upstream, { recursive: true });
      seedUpstream(upstream);

      const work = join(dir, "work");
      git(dir, ["clone", "-q", upstream, work]);

      // La base vive sólo en el upstream y NO es ancestro de HEAD: el gate no
      // puede decidir y tiene que decirlo (antes el `--depth=1` lo volvía
      // shallow en silencio y el error aparecía recién en el pre-gate de PR).
      const base = commit(upstream, "rama paralela", { "README.md": "hola\n" });

      const run = spawnSync(
        resolve("node_modules/.bin/tsx"),
        [resolve("tools/golden/policy-cli.ts")],
        { cwd: work, encoding: "utf8", env: { ...GIT_ENV, BASE_SHA: base } }
      );

      expect(run.status).toBe(2);
      expect(run.stderr).toContain("historial insuficiente");
      expect(isShallow(work)).toBe(false);
    });
  });

  it("falla accionable (exit 2) si la base no es alcanzable, sin tocar el clon", () => {
    withTmp((dir) => {
      const upstream = join(dir, "upstream");
      mkdirSync(upstream, { recursive: true });
      seedUpstream(upstream);

      const work = join(dir, "work");
      git(dir, ["clone", "-q", upstream, work]);

      const inexistente = "0123456789abcdef0123456789abcdef01234567";
      const run = spawnSync(
        resolve("node_modules/.bin/tsx"),
        [resolve("tools/golden/policy-cli.ts")],
        { cwd: work, encoding: "utf8", env: { ...GIT_ENV, BASE_SHA: inexistente } }
      );

      expect(run.status).toBe(2);
      expect(run.stderr).toContain(inexistente);
      expect(isShallow(work)).toBe(false);
    });
  });
});
