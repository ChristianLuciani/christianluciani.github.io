import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MUSEO_CURATION } from "../../src/content/curation/museo.ts";
import { factUniverse } from "../../src/content/curation/facts.ts";
import { PROFILE } from "../../src/data/profile.generated.ts";
import type { CvProfile } from "../../src/data/profile.types.ts";
import { assembleHtml } from "../../src/templates/index.ts";
import { museo } from "../../src/themes/museo/narrative.ts";
import type { ContrastDebt, ContrastPair } from "../../src/themes/museo/contrast.ts";
import type { NarrativeManifest } from "../../src/themes/types.ts";
import {
  checkThemes,
  copyErrors,
  curationErrors,
  loadThemes,
  skinErrors,
  type SkinInput,
  type ThemeInput
} from "./check.ts";

/**
 * GATE MULTI-TEMA (#133 · SPEC §8 FASE 5.6 · ADR-001 I4/I5).
 *
 * El gate tiene que MORDER en las cuatro dimensiones que el issue declara y
 * nombrar el tema y la clave, no fallar en abstracto:
 *
 *   · copy: una clave sin ES o sin EN, o una clave huérfana del render;
 *   · curación: un hecho sin decisión, una exclusión sin razón, una fila de
 *     `experience[]` sin sección en el print-CV;
 *   · piel: un literal de color fuera del bloque de tokens;
 *   · contraste: un par bajo AA sin deuda declarada y una deuda obsoleta.
 *
 * El registro real se verifica aparte (`loadThemes` + `checkThemes`): el gate
 * corre contra lo que HOY está registrado, y los fixtures prueban los caminos
 * rojos que un tema nuevo va a recorrer.
 */

const HTML = assembleHtml();
const EXPERIENCE = (PROFILE as unknown as CvProfile).experience;
const UNIVERSO = factUniverse();

/** Piel mínima válida: tokens + una regla de texto sobre el fondo base. */
const SKIN_OK = `:root {
  --ink: #e7edf6;
  --bg-0: #050810;
}
.a { color: var(--ink); background: var(--bg-0); }
`;

const PAIRS_OK: readonly ContrastPair[] = [
  { fg: "--ink", bg: "--bg-0", min: 4.5, usage: "texto principal sobre el fondo base" }
];

function skin(overrides: Partial<SkinInput> = {}): SkinInput {
  return { source: SKIN_OK, contrastPairs: PAIRS_OK, debt: [], ...overrides };
}

function narrative(overrides: Partial<NarrativeManifest> = {}): NarrativeManifest {
  return { ...museo, ...overrides };
}

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Raíz con un golden por cada id: el gate no exige un directorio real de repo. */
function rootWithGoldens(ids: readonly string[]): string {
  const dir = mkdtempSync(join(tmpdir(), "themes-check-"));
  dirs.push(dir);
  for (const id of ids) {
    const file = join(dir, "tests/golden", `${id}.html`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, "<html></html>", "utf8");
  }
  return dir;
}

function themeInput(overrides: Partial<ThemeInput> = {}): ThemeInput {
  return {
    narrative: narrative(),
    html: HTML,
    curation: MUSEO_CURATION,
    skin: skin(),
    ...overrides
  };
}

describe("themes/check — copy ES/EN", () => {
  it("el pack del tema está completo y su render lo publica", () => {
    expect(copyErrors(narrative(), HTML)).toEqual([]);
  });

  it("una clave sin EN es un error que nombra la clave y el idioma", () => {
    const pack = { ...museo.copy, "hero.tagline": { es: "Código y materia", en: "  " } };
    const errors = copyErrors(narrative({ copy: pack }), HTML);
    expect(errors.join("\n")).toContain('"hero.tagline"');
    expect(errors.join("\n")).toContain("EN");
  });

  it("una clave sin ES también falla (no hay fallback silencioso)", () => {
    const pack = { ...museo.copy, "hero.tagline": { es: "", en: "Code and matter" } };
    expect(copyErrors(narrative({ copy: pack }), HTML).join("\n")).toContain("ES");
  });

  it("una clave que no aparece en el render es huérfana", () => {
    const pack = {
      ...museo.copy,
      "huerfana.sin.superficie": { es: "Frase que ningún template emite", en: "Nobody emits this" }
    };
    const errors = copyErrors(narrative({ copy: pack }), HTML);
    expect(errors.join("\n")).toContain("huérfana");
    expect(errors.join("\n")).toContain("Frase que ningún template emite");
  });

  it("una clave `runtime` no exige aparecer en el HTML inicial", () => {
    const pack = {
      ...museo.copy,
      "intro.runtime": { es: "Frase que monta el runtime", en: "Runtime phrase", runtime: true }
    };
    expect(copyErrors(narrative({ copy: pack }), HTML)).toEqual([]);
  });
});

describe("themes/check — curación", () => {
  it("la curación del museo cubre el 100% de los hechos y clasifica la experiencia", () => {
    expect(curationErrors("museo", MUSEO_CURATION, UNIVERSO, EXPERIENCE)).toEqual([]);
  });

  it("un tema registrado sin curación falla con la instrucción", () => {
    const errors = curationErrors("ingenieria", undefined, UNIVERSO, EXPERIENCE);
    expect(errors.join("\n")).toContain("curación");
    expect(errors.join("\n")).toContain("ingenieria");
  });

  it("un hecho sin decisión pone el gate rojo (no se ignora)", () => {
    const sinDecision = { ...MUSEO_CURATION, include: [], exclude: [] };
    const errors = curationErrors("museo", sinDecision, UNIVERSO, EXPERIENCE);
    expect(errors.join("\n")).toContain("sin decisión");
    expect(errors.filter((error) => error.includes("sin decisión")).length).toBeGreaterThan(0);
  });

  it("una exclusión sin razón es un error, no un warning", () => {
    const curation = {
      ...MUSEO_CURATION,
      exclude: [{ id: MUSEO_CURATION.exclude[0]!.id, reason: "" }]
    };
    expect(curationErrors("museo", curation, UNIVERSO, EXPERIENCE).join("\n")).toContain("reason");
  });

  it("una fila de experience[] sin sección del print-CV falla", () => {
    const table = { ...MUSEO_CURATION.experienceSections };
    const first = Object.keys(table)[0]!;
    delete table[first];
    const curation = { ...MUSEO_CURATION, experienceSections: table };
    const errors = curationErrors("museo", curation, UNIVERSO, EXPERIENCE);
    expect(errors.join("\n")).toContain(first);
    expect(errors.join("\n")).toContain("experienceSections");
  });
});

describe("themes/check — piel y contraste", () => {
  it("una piel con tokens y pares AA declarados pasa", () => {
    expect(skinErrors("museo", skin())).toEqual([]);
  });

  it("un literal de color fuera de los tokens falla con archivo y línea", () => {
    const source = `${SKIN_OK}.b { border: 1px solid #ff0000; }\n`;
    const errors = skinErrors("museo", skin({ source }));
    expect(errors.join("\n")).toContain("#ff0000");
    expect(errors.join("\n")).toContain("literal de color");
  });

  it("un par bajo AA sin deuda falla con el ratio y el uso", () => {
    const source = `:root { --ink: #555555; --bg-0: #000000; }\n.a { color: var(--ink); }\n`;
    const errors = skinErrors("museo", skin({ source }));
    expect(errors.join("\n")).toContain("4.5:1");
  });

  it("una deuda AA que ya cumple es un error (se auto-elimina)", () => {
    const debt: ContrastDebt = {
      fg: "--ink",
      bg: "--bg-0",
      min: 4.5,
      ratio: 4.4,
      selector: ".a",
      reason: "deuda de prueba declarada con un ratio que no es el medido hoy"
    };
    // El par mide >16:1: la deuda es mentira y el gate lo dice.
    const errors = skinErrors("museo", skin({ debt: [debt] }));
    expect(errors.join("\n")).toContain("obsoleta");
  });

  it("el ratio citado de una deuda no puede divergir del medido", () => {
    const debt: ContrastDebt = {
      fg: "--ink",
      bg: "--bg-0",
      min: 4.5,
      ratio: 3.1,
      selector: ".a",
      reason: "deuda de prueba con una cifra que el par ya no reproduce"
    };
    const source = `:root { --ink: #555555; --bg-0: #000000; }\n.a { color: var(--ink); }\n`;
    const errors = skinErrors("museo", skin({ source, debt: [debt] }));
    expect(errors.join("\n")).toContain("ratio citado");
  });

  it("un color de texto sin par declarado es una combinación sin medir", () => {
    const source = `${SKIN_OK}.b { color: var(--bg-0); }\n`;
    const errors = skinErrors("museo", skin({ source }));
    expect(errors.join("\n")).toContain("sin par de contraste");
  });
});

describe("themes/check — registro, metadata y golden", () => {
  it("dos temas con el mismo path no comparten artefacto", () => {
    const themes = [
      themeInput(),
      themeInput({ narrative: narrative({ id: "ingenieria", path: "" }) })
    ];
    const report = checkThemes({ themes, requireGolden: false });
    expect(report.errors.join("\n")).toContain("path");
    expect(report.ok).toBe(false);
  });

  it("un manifest sin metadata publicable falla con el campo", () => {
    const bad = themeInput({
      narrative: narrative({ meta: { title: "", description: "x", ogImage: "/x.png" } })
    });
    const report = checkThemes({ themes: [bad], requireGolden: false });
    expect(report.themes[0]!.errors.join("\n")).toContain("meta.title");
  });

  it("todo tema registrado exige su golden: sin baseline el gate lo pide", () => {
    const root = mkdtempSync(join(tmpdir(), "themes-check-sin-golden-"));
    dirs.push(root);
    const report = checkThemes({ themes: [themeInput()], root });
    expect(report.errors.join("\n")).toContain("tests/golden/museo.html");
    expect(report.errors.join("\n")).toContain("golden:update");
  });

  it("con el baseline presente el registro pasa", () => {
    const report = checkThemes({ themes: [themeInput()], root: rootWithGoldens(["museo"]) });
    expect(report.errors).toEqual([]);
    expect(report.themes[0]!.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("un tema sin piel propia hereda la del default y lo declara", () => {
    const report = checkThemes({
      themes: [themeInput({ skin: undefined })],
      requireGolden: false
    });
    expect(report.themes[0]!.notes.join("\n")).toContain("hereda");
    expect(report.themes[0]!.errors).toEqual([]);
  });
});

describe("themes/check — el registro real está verde", () => {
  it("loadThemes resuelve el registro con su render, curación y piel", async () => {
    const themes = await loadThemes();
    expect(themes.map((theme) => theme.narrative.id)).toContain("museo");
    for (const theme of themes) {
      expect(theme.html, `render de ${theme.narrative.id}`).toBeTypeOf("string");
      expect(theme.curation, `curación de ${theme.narrative.id}`).toBeDefined();
      expect(theme.skin, `piel de ${theme.narrative.id}`).toBeDefined();
    }
    const report = checkThemes({ themes });
    expect(report.themes.flatMap((theme) => theme.errors)).toEqual([]);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });
});
