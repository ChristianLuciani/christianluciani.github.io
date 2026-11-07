import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORIGIN,
  normalizeDeployBase,
  normalizeOrigin,
  normalizeThemePath,
  pageUrl,
  resolveThemeAddress,
  servedAssetPath
} from "./site.ts";
import { DEFAULT_THEME, THEMES, artifactBase, buildThemes } from "./index.ts";
import type { NarrativeManifest } from "./types.ts";

/**
 * DIRECCIÓN DEL SITIO (SPEC §8 FASE 5.5 · ADR-001 D12).
 *
 * `SITE_ORIGIN`/`SITE_BASE` son overrides de deploy sobre la dirección que
 * declara CADA TEMA en su manifest; este test fija qué se acepta, qué falla,
 * cómo se compone la URL de una página y que los temas de un artefacto
 * compartan prefijo. El publicador se prueba en `src/artifact/pages.test.ts`.
 */

const museo = THEMES[DEFAULT_THEME];

function themeWith(patch: Partial<NarrativeManifest>): NarrativeManifest {
  return { ...museo, ...patch };
}

describe("site — origen", () => {
  it("vacío o ausente cae al origen canónico", () => {
    for (const raw of [undefined, null, "", "   "]) {
      expect(normalizeOrigin(raw)).toBe(DEFAULT_ORIGIN);
    }
  });

  it("acepta http(s) y quita la barra final", () => {
    expect(normalizeOrigin("https://example.test/")).toBe("https://example.test");
    expect(normalizeOrigin("http://localhost:4000")).toBe("http://localhost:4000");
  });

  it("rechaza un origen que no es http(s) o que trae path", () => {
    for (const raw of [
      "example.test",
      "javascript:alert(1)",
      "https://",
      "//cdn.test",
      // F6 del pase fresco: un path acá desalinea canónica y assets.
      "https://example.test/foo",
      "https://example.test/foo/"
    ]) {
      expect(() => normalizeOrigin(raw), raw).toThrow(/SITE_ORIGIN/);
    }
  });
});

describe("site — prefijo de deploy", () => {
  it("vacío, '/' o espacios significan raíz", () => {
    for (const raw of [undefined, null, "", "  ", "/"]) {
      expect(normalizeDeployBase(raw)).toBe("");
    }
  });

  it("normaliza sin barra final y con barra inicial", () => {
    expect(normalizeDeployBase("/repo")).toBe("/repo");
    expect(normalizeDeployBase("repo/")).toBe("/repo");
    expect(normalizeDeployBase("/a/b/")).toBe("/a/b");
  });

  it("rechaza prefijos que producirían URLs rotas", () => {
    for (const raw of ["//cdn.test", "/a//b", "/a b", "/a?x=1", "/a/../b"]) {
      expect(() => normalizeDeployBase(raw), raw).toThrow(/SITE_BASE/);
    }
  });
});

describe("site — path del tema", () => {
  it("'' y segmentos slug son válidos", () => {
    expect(normalizeThemePath("")).toBe("");
    expect(normalizeThemePath("/ingenieria/")).toBe("ingenieria");
    expect(normalizeThemePath("docs/v2")).toBe("docs/v2");
    expect(normalizeThemePath("mi-tema")).toBe("mi-tema");
  });

  it("rechaza mayúsculas, puntos y segmentos vacíos", () => {
    for (const raw of ["Ingenieria", "../x", "a//b", "a b", "a_b"]) {
      expect(() => normalizeThemePath(raw), raw).toThrow(/subpath/);
    }
  });
});

describe("site — dirección de un tema", () => {
  it("sale del manifest del tema cuando no hay overrides", () => {
    expect(resolveThemeAddress(museo, {})).toEqual({
      origin: DEFAULT_ORIGIN,
      base: "",
      path: ""
    });
    expect(resolveThemeAddress(themeWith({ path: "ingenieria" }), {})).toEqual({
      origin: DEFAULT_ORIGIN,
      base: "",
      path: "ingenieria"
    });
  });

  it("SITE_ORIGIN/SITE_BASE overridean la dirección declarada", () => {
    expect(
      resolveThemeAddress(themeWith({ path: "ingenieria" }), {
        SITE_ORIGIN: "https://x.test/",
        SITE_BASE: "repo/"
      })
    ).toEqual({ origin: "https://x.test", base: "/repo", path: "ingenieria" });
  });

  it("cada tema puede declarar su propio origen y prefijo", () => {
    const otro = themeWith({ site: { origin: "https://otro.test", base: "/sub" } });
    expect(resolveThemeAddress(otro, {})).toEqual({
      origin: "https://otro.test",
      base: "/sub",
      path: ""
    });
  });
});

describe("site — composición de URLs", () => {
  const root = { origin: DEFAULT_ORIGIN, base: "", path: "" };

  it("la raíz publica en el origen con barra final", () => {
    expect(pageUrl(root)).toBe("https://christianluciani.github.io/");
  });

  it("un subpath suma su segmento a la canónica", () => {
    expect(pageUrl({ ...root, path: "ingenieria" })).toBe(
      "https://christianluciani.github.io/ingenieria/"
    );
    expect(pageUrl({ ...root, path: "docs/v2" })).toBe(
      "https://christianluciani.github.io/docs/v2/"
    );
  });

  it("el prefijo de deploy entra antes del path del tema", () => {
    const site = { origin: "https://example.test", base: "/repo", path: "" };
    expect(pageUrl(site)).toBe("https://example.test/repo/");
    expect(pageUrl({ ...site, path: "ingenieria" })).toBe(
      "https://example.test/repo/ingenieria/"
    );
  });

  it("servedAssetPath prefija el asset con el base, sin doble barra", () => {
    expect(servedAssetPath("/assets/og-image.png", root)).toBe("/assets/og-image.png");
    expect(servedAssetPath("assets/og-image.png", root)).toBe("/assets/og-image.png");
    expect(servedAssetPath("/assets/og-image.png", { ...root, base: "/repo" })).toBe(
      "/repo/assets/og-image.png"
    );
  });
});

/**
 * GATE DEL REGISTRO: un tema publicado no puede pisar una ruta servida
 * (`/assets`, `/audio`, `/laboratorio`) ni repetir el path de otro tema; y los
 * temas que comparten artefacto tienen que compartir prefijo (hay un solo
 * bundle). El registro tiene hoy una sola entrada; el gate queda armado para
 * #134.
 */
describe("site — registro y artefacto", () => {
  const RESERVED = new Set(["assets", "audio", "laboratorio", "src", "dist"]);

  it("ningún tema publicado usa una ruta reservada", () => {
    for (const [id, narrative] of Object.entries(THEMES)) {
      const path = normalizeThemePath(narrative.path);
      if (path) expect(RESERVED.has(path.split("/")[0]), `path de ${id}`).toBe(false);
    }
  });

  it("los paths publicados son únicos y el default es el único en la raíz", () => {
    const paths = Object.values(THEMES).map((narrative) => normalizeThemePath(narrative.path));
    expect(new Set(paths).size).toBe(paths.length);
    expect(THEMES[DEFAULT_THEME].path).toBe("");
    expect(Object.values(THEMES).filter((narrative) => narrative.path === "")).toHaveLength(1);
  });

  it("el build sin SITE_THEME publica todo el registro; con selector, sólo ese tema", () => {
    expect(buildThemes({}).map((theme) => theme.id).sort()).toEqual(Object.keys(THEMES).sort());
    expect(buildThemes({ SITE_THEME: "museo" }).map((theme) => theme.id)).toEqual(["museo"]);
  });

  it("el prefijo del artefacto es único entre los temas publicados", () => {
    expect(artifactBase({})).toBe("");
    expect(artifactBase({ SITE_BASE: "/repo" })).toBe("/repo");
  });
});
