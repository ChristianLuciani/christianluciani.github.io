/**
 * Guard de privacidad de superficies legacy.
 *
 * El repositorio `physics-lab-book` es privado: su identificador y su URL no
 * pueden aparecer en NINGÚN archivo commiteado — ni en `src/` (data,
 * templates, i18n) ni en el `index.html` generado por `npm run build` (que sí
 * se commitea). El marcador se arma por fragmentos a propósito: este archivo
 * se publica en el mismo repo público y no debe volver a publicar el
 * identificador que vigila (mismo patrón que `profile.generated.test.ts`).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PROYECTOS } from "./proyectos";

const ROOT = resolve(process.cwd());
const PRIVATE_SLUG = ["physics", "lab", "book"].join("-");
const PRIVATE_URL = ["https://github.com/ChristianLuciani", PRIVATE_SLUG].join("/");

/** Archivos del índice de git: exactamente lo que se publica. */
function committedFiles(): string[] {
  const out = execFileSync("git", ["ls-files", "-z"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  return out.split("\0").filter(Boolean);
}

describe("superficies commiteadas — el repo privado no se publica", () => {
  it("ni el identificador ni la URL aparecen en archivos commiteados", () => {
    const hits = committedFiles().filter((file) => {
      const content = readFileSync(resolve(ROOT, file), "utf8");
      return content.includes(PRIVATE_SLUG) || content.includes(PRIVATE_URL);
    });
    expect(hits).toEqual([]);
  });

  it("index.html (generado y commiteado) queda cubierto por el guard", () => {
    // Ancla explícita: si el build deja de commitearse, el guard avisa en vez
    // de pasar en silencio por un archivo ausente.
    expect(committedFiles()).toContain("index.html");
    expect(readFileSync(resolve(ROOT, "index.html"), "utf8")).not.toContain(
      PRIVATE_SLUG
    );
  });

  it("las fichas de proyecto no enlazan la superficie privada", () => {
    for (const p of PROYECTOS) {
      expect(p.html ?? "").not.toContain(PRIVATE_SLUG);
      expect(p.html ?? "").not.toContain(PRIVATE_URL);
    }
  });
});
