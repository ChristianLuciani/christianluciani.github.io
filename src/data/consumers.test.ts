/**
 * Guard de CERO CONSUMIDORES (issue #110).
 *
 * El gate de frescura de `profile-data` puede estar verde con 0 consumidores
 * (#99): el snapshot se actualiza pero la página renderiza datos viejos o
 * hardcodeados. Este guard falla cuando:
 *
 * 1. ningún módulo no-test de `src/` importa `profile.generated` (demo ciega);
 * 2. el ensamblador del sitio (`templates/index.ts`) deja de alimentar el
 *    print-CV con `PROFILE`;
 * 3. una superficie YA migrada al SSOT deja de consumirlo. El Friso/El Marco
 *    (#109) se activan cuando la migración está presente: detectamos su API
 *    (`frisoHtml`/`marcoHtml`, `publicadosDe`/`proyectosDe`) y a partir de ahí
 *    exigimos el import. Mientras la migración no esté en main, el guard lo
 *    declara como PENDIENTE en la salida en vez de fingir que la cubre.
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

function importsProfile(path: string): boolean {
  return /from\s+["'][^"']*profile\.generated(?:\.ts)?["']/.test(read(path));
}

const files = sourceFiles();
const consumers = files.filter(importsProfile);
const byName = new Map(files.map((f) => [relative(process.cwd(), f), f]));
const contentOf = (rel: string): string => {
  const path = byName.get(rel);
  return path ? read(path) : "";
};

describe("consumidores de PROFILE — la demo no puede estar ciega", () => {
  it("al menos un módulo no-test consume el snapshot commiteado", () => {
    expect(consumers.length).toBeGreaterThan(0);
  });

  it("el ensamblador del sitio (templates/index.ts) es consumidor", () => {
    expect(consumers.map((f) => relative(process.cwd(), f))).toContain("src/templates/index.ts");
  });

  it("print-CV renderiza desde el SSOT (PROFILE o el contrato CvProfile)", () => {
    const print = contentOf("src/templates/print_cv_html.ts");
    expect(print, "print_cv_html.ts desapareció").not.toBe("");
    expect(print).toMatch(/PROFILE|CvProfile/);
    // El ensamblador lo alimenta con PROFILE explícitamente o el renderer lo
    // importa: alguna de las dos pruebas de datos tiene que existir.
    const index = contentOf("src/templates/index.ts");
    expect(index).toMatch(/printCvHtml\(\s*(PROFILE|profile)|import\s*\{[^}]*PROFILE[^}]*\}\s*from\s*["'][^"']*profile\.generated/);
  });

  it("El Friso / El Marco (#109) consumen PROFILE cuando la migración está presente", () => {
    const pending: string[] = [];
    const surfaces: Array<{ file: string; migrated: (src: string) => boolean; label: string }> = [
      {
        file: "src/templates/sala_html.ts",
        migrated: (src) => /export function (frisoHtml|marcoHtml|drahmaShowcase)\s*\(/.test(src),
        label: "El Friso/Marco (sala_html.ts)"
      },
      {
        file: "src/data/proyectos.ts",
        migrated: (src) => /export function (publicadosDe|proyectosDe)\s*\(/.test(src),
        label: "El Marco (proyectos.ts)"
      }
    ];
    for (const surface of surfaces) {
      const src = contentOf(surface.file);
      expect(src, `${surface.label} desapareció`).not.toBe("");
      if (!surface.migrated(src)) {
        pending.push(`${surface.label}: migración #109 aún no presente en este árbol (PR #118)`);
        continue;
      }
      expect(importsProfile(byName.get(surface.file)!), `${surface.label} dejó de importar PROFILE`).toBe(true);
    }
    for (const note of pending) console.warn(`[consumers] PENDIENTE: ${note}`);
  });
});
