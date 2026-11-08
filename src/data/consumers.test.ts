/**
 * Guard de CERO CONSUMIDORES (issue #110).
 *
 * El gate de frescura de `profile-data` puede estar verde con 0 consumidores
 * (#99): el snapshot se actualiza pero la página renderiza datos viejos o
 * hardcodeados. Este guard falla cuando:
 *
 * 1. ningún módulo de RENDER de `src/` importa `profile.generated` (demo
 *    ciega). Un importador de metadata (p. ej. `profile.provenance.ts`, que
 *    sólo lee `PROFILE.source.commit`) no satisface el guard: se exige al menos
 *    `templates/index.ts` o `templates/sala_html.ts`;
 * 2. el ensamblador del sitio (`templates/index.ts`) deja de alimentar el
 *    print-CV con `PROFILE` — se verifica la LLAMADA, no la mera presencia del
 *    símbolo ni el import;
 * 3. una superficie YA migrada al SSOT deja de existir o deja de consumirlo.
 *    El Friso/El Marco (#109) ya están en `main`: exigimos sus cuatro funciones
 *    (`frisoHtml`/`marcoHtml`, `publicadosDe`/`proyectosDe`) y el import de
 *    `PROFILE`. Renombrar/mover una superficie FALLA; no hay rama PENDIENTE.
 *
 * El predicado corre sobre el código SIN comentarios y NO acepta `import type`
 * (un tipo no es consumo runtime). Es análisis textual, no un grafo de módulos:
 * declara ese límite en vez de prometer más.
 */
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd(), "src");

/** Fuentes no-test: lo que realmente corre en el sitio. */
function sourceFiles(dir = ROOT): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!entry.name.endsWith(".ts")) return [];
    if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".d.ts")) return [];
    return [path];
  });
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

/**
 * Quita comentarios de línea y de bloque preservando strings y templates (y las
 * líneas). Sin esto, un import comentado o un comentario que nombre `PROFILE`
 * satisface el guard. No pretende ser un parser: no reescribe regex literales.
 */
export function stripComments(source: string): string {
  type Mode = "code" | "single" | "double" | "template" | "line" | "block";
  let mode: Mode = "code";
  let out = "";
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (mode === "code") {
      if (ch === "/" && next === "/") {
        out += "  ";
        i++;
        mode = "line";
        continue;
      }
      if (ch === "/" && next === "*") {
        out += "  ";
        i++;
        mode = "block";
        continue;
      }
      if (ch === "'") mode = "single";
      else if (ch === '"') mode = "double";
      else if (ch === "`") mode = "template";
      out += ch;
      continue;
    }
    if (mode === "line") {
      if (ch === "\n") {
        mode = "code";
        out += ch;
      } else {
        out += " ";
      }
      continue;
    }
    if (mode === "block") {
      if (ch === "*" && next === "/") {
        out += "  ";
        i++;
        mode = "code";
        continue;
      }
      out += ch === "\n" ? "\n" : " ";
      continue;
    }
    // string/template: los `//` de una URL no son comentario.
    out += ch;
    if (ch === "\\") {
      out += source[i + 1] ?? "";
      i++;
      continue;
    }
    if (
      (mode === "single" && ch === "'") ||
      (mode === "double" && ch === '"') ||
      (mode === "template" && ch === "`")
    ) {
      mode = "code";
    }
  }
  return out;
}

/**
 * ¿Este módulo consume `profile.generated` en runtime?
 * - `import type {…}` y specifiers `{ type X }` NO cuentan (no emiten import).
 * - Un import comentado NO cuenta.
 * - Un import de valores (PROFILE, namespace, default) SÍ cuenta.
 */
export function importsProfileText(source: string): boolean {
  const clean = stripComments(source);
  const imports = /import\s+(type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']/g;
  for (const match of clean.matchAll(imports)) {
    const [, typeOnly, clause, specifier] = match;
    if (!/(^|\/)profile\.generated(\.ts)?$/.test(specifier)) continue;
    if (typeOnly) continue;
    const named = clause.match(/\{([\s\S]*?)\}/);
    if (named) {
      const values = named[1]
        .split(",")
        .map((specifierText) => specifierText.trim())
        .filter(Boolean)
        .filter((specifierText) => !/^type\s/.test(specifierText));
      if (values.length === 0) continue;
    }
    return true;
  }
  return false;
}

/**
 * El print-CV consume el SSOT por DOS hechos verificables, no por la mera
 * aparición de `PROFILE`/`CvProfile` (que un comentario también produce):
 * el renderer declara `printCvHtml(profile: CvProfile)` y el ensamblador llama
 * `printCvHtml(PROFILE…)`. Cambiar la llamada por otro objeto —dejando el
 * import sin usar— tiene que romper este predicado.
 *
 * Desde #160 el ensamblador hace DOS llamadas (una por idioma): el predicado
 * exige que TODAS reciban `PROFILE`, no sólo que alguna lo haga — con `some`
 * una variante alimentada con un objeto falso pasaba verde.
 */
export function printCvProblems(indexSource: string, printSource: string): string[] {
  const problems: string[] = [];
  if (!/export function printCvHtml\s*\(\s*\w+\s*:\s*CvProfile\b/.test(stripComments(printSource))) {
    problems.push("print_cv_html.ts no declara printCvHtml(profile: CvProfile)");
  }
  const calls = [...stripComments(indexSource).matchAll(/printCvHtml\s*\(/g)];
  const withProfile = [...stripComments(indexSource).matchAll(/printCvHtml\s*\(\s*PROFILE\b/g)];
  if (calls.length === 0 || withProfile.length !== calls.length) {
    problems.push("templates/index.ts no alimenta printCvHtml con PROFILE (uso real, no sólo import)");
  }
  return problems;
}

const files = sourceFiles();
const consumers = files.filter((file) => importsProfileText(read(file)));
const byName = new Map(files.map((f) => [relative(process.cwd(), f), f]));
const contentOf = (rel: string): string => {
  const path = byName.get(rel);
  return path ? read(path) : "";
};

/** Módulos que RENDERIZAN el sitio (no importadores de metadata). */
const RENDER_CONSUMERS = ["src/templates/index.ts", "src/templates/sala_html.ts"];

/**
 * Superficies migradas al SSOT por #109 (ya en `main`). Cada predicado exige
 * TODAS las funciones de la superficie: renombrar una sola la pone en rojo.
 */
const MIGRATED_SURFACES: Array<{
  file: string;
  label: string;
  migrated: (src: string) => boolean;
}> = [
  {
    file: "src/templates/sala_html.ts",
    label: "El Friso/Marco (sala_html.ts)",
    migrated: (src) =>
      /export function frisoHtml\s*\(/.test(src) && /export function marcoHtml\s*\(/.test(src)
  },
  {
    file: "src/data/proyectos.ts",
    label: "El Marco (proyectos.ts)",
    migrated: (src) =>
      /export function publicadosDe\s*\(/.test(src) &&
      /export function proyectosDe\s*\(/.test(src)
  }
];

describe("predicado de import — comentarios y type-only no son consumo", () => {
  it("un import comentado no cuenta", () => {
    expect(
      importsProfileText('// import { PROFILE } from "../data/profile.generated.ts";')
    ).toBe(false);
    expect(
      importsProfileText('/* import { PROFILE } from "../data/profile.generated.ts" */')
    ).toBe(false);
  });

  it("`import type` y specifiers `type` no cuentan", () => {
    expect(
      importsProfileText('import type { CvProfile } from "../data/profile.generated.ts";')
    ).toBe(false);
    expect(
      importsProfileText('import { type PROFILE } from "../data/profile.generated.ts";')
    ).toBe(false);
  });

  it("un import de valores sí cuenta", () => {
    expect(importsProfileText('import { PROFILE } from "../data/profile.generated.ts";')).toBe(true);
    expect(importsProfileText('import { PROFILE, type CvProfile } from "../data/profile.generated";')).toBe(true);
  });
});

describe("consumidores de PROFILE — la demo no puede estar ciega", () => {
  it("al menos un módulo de RENDER consume el snapshot commiteado", () => {
    const renderConsumers = consumers
      .map((file) => relative(process.cwd(), file))
      .filter((rel) => RENDER_CONSUMERS.includes(rel));
    // `profile.provenance.ts` sólo lee metadata: no cuenta como render.
    expect(renderConsumers.length).toBeGreaterThan(0);
  });

  it("el ensamblador del sitio (templates/index.ts) es consumidor", () => {
    expect(consumers.map((f) => relative(process.cwd(), f))).toContain("src/templates/index.ts");
  });

  it("print-CV renderiza desde el SSOT: renderer tipado + ensamblador lo alimenta con PROFILE", () => {
    const print = contentOf("src/templates/print_cv_html.ts");
    expect(print, "print_cv_html.ts desapareció").not.toBe("");
    expect(printCvProblems(contentOf("src/templates/index.ts"), print)).toEqual([]);
  });

  it("el guard muerde: cambiar la llamada por otro objeto (import sin usar) rompe", () => {
    const index = contentOf("src/templates/index.ts");
    const mutated = index.replace(/printCvHtml\(\s*PROFILE\b/, "printCvHtml({} as CvProfile)");
    expect(mutated, "no se encontró la llamada printCvHtml(PROFILE…)").not.toBe(index);
    const problems = printCvProblems(mutated, contentOf("src/templates/print_cv_html.ts"));
    expect(problems.some((p) => p.includes("no alimenta printCvHtml con PROFILE"))).toBe(true);
  });

  it("un comentario que sólo menciona PROFILE/CvProfile no satisface el check del print", () => {
    const problems = printCvProblems(
      "// printCvHtml(PROFILE as unknown as CvProfile)\nexport const x = 1;",
      "// export function printCvHtml(profile: CvProfile) {}\n"
    );
    expect(problems).toHaveLength(2);
  });

  it("El Friso / El Marco (#109) existen y consumen PROFILE (sin rama PENDIENTE)", () => {
    for (const surface of MIGRATED_SURFACES) {
      const src = contentOf(surface.file);
      expect(src, `${surface.label} desapareció`).not.toBe("");
      // #109 ya está en main: una superficie migrada no puede "faltar" y pasar.
      expect(surface.migrated(src), `${surface.label} dejó de existir o fue renombrada`).toBe(true);
      expect(importsProfileText(src), `${surface.label} dejó de importar PROFILE`).toBe(true);
    }
  });

  it("el guard muerde: renombrar una función migrada rompe el predicado", () => {
    for (const surface of MIGRATED_SURFACES) {
      const src = contentOf(surface.file);
      expect(surface.migrated(src), `${surface.label}: el árbol actual debería pasar`).toBe(true);
      // Renombra el primer símbolo que el predicado exige.
      const renamed = {
        "src/templates/sala_html.ts": src.replace(
          /export function frisoHtml\s*\(/,
          "export function frisoRenombrado("
        ),
        "src/data/proyectos.ts": src.replace(
          /export function publicadosDe\s*\(/,
          "export function publicadosRenombrados("
        )
      }[surface.file]!;
      expect(renamed, `${surface.label}: no se encontró la función a mutar`).not.toBe(src);
      expect(surface.migrated(renamed), `${surface.label}: el rename no fue detectado`).toBe(false);
    }
  });
});
