import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MUSEO_CURATION } from "../../src/content/curation/museo.ts";
import { factUniverse } from "../../src/content/curation/facts.ts";
import { PROFILE } from "../../src/data/profile.generated.ts";
import type { CvProfile } from "../../src/data/profile.types.ts";
import { assembleHtml } from "../../src/templates/index.ts";
import { PRINT_RULE_COLOR } from "../../src/templates/print-tokens.ts";
import { museo } from "../../src/themes/museo/narrative.ts";
import { SKIN_SOURCE, emitSkinCss } from "../../src/themes/museo/skin.ts";
import type { ContrastDebt, ContrastPair } from "../../src/themes/museo/contrast.ts";
import type { NarrativeManifest } from "../../src/themes/types.ts";
import {
  checkThemes,
  copyErrors,
  curationErrors,
  lineageErrors,
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
  // `emitted` es la evidencia de F4/S4: el CSS que el render publicó. Con una
  // fuente sin bloque derivado la emisión es la fuente misma.
  return { source: SKIN_OK, contrastPairs: PAIRS_OK, debt: [], emitted: SKIN_OK, ...overrides };
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

  it("una clave con ES === EN también se verifica contra el render (F1)", () => {
    // Antes `pairsOf()` la omitía: 52 claves del pack nunca se comparaban.
    const pack = { "misma.clave": { es: "Texto idéntico", en: "Texto idéntico" } };
    const errors = copyErrors(narrative({ copy: pack }), "<div>Otra cosa</div>");
    expect(errors.join("\n")).toContain("misma.clave");
    expect(errors.join("\n")).toContain("huérfana");
  });

  it("una clave contenida en el texto de otra clave no se acredita por substring (F2)", () => {
    // "Física" ⊂ "Licenciatura en Física": sólo la segunda es una superficie.
    const pack = {
      "grado.corta": { es: "Física", en: "Physics" },
      "grado.larga": { es: "Licenciatura en Física", en: "Physics degree" }
    };
    const errors = copyErrors(
      narrative({ copy: pack }),
      "<div>Licenciatura en Física</div>"
    );
    expect(errors.join("\n")).toContain("grado.corta");
    expect(errors.join("\n")).not.toContain("grado.larga");
  });

  it("el copy con markup inline no es un falso rojo (F9)", () => {
    const pack = { "pub.titulo": { es: "Diseño <em>crítico</em>", en: "Critical design" } };
    expect(
      copyErrors(narrative({ copy: pack }), "<div>Diseño <em>crítico</em></div>")
    ).toEqual([]);
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

  it("el umbral AA no es autodeclarable: un min:1 falla (F3)", () => {
    const minUno: ContrastPair = {
      fg: "--ink",
      bg: "--bg-0",
      min: 1,
      usage: "par con un umbral inventado para pasar el gate"
    };
    const errors = skinErrors("museo", skin({ contrastPairs: [minUno] }));
    expect(errors.join("\n")).toContain("umbral inválido");
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

  it("un tema no-default hereda la piel del default sólo si lo DECLARA", () => {
    const report = checkThemes({
      themes: [
        themeInput({
          narrative: narrative({ id: "ingenieria", path: "ingenieria", skin: "inherit" }),
          skin: undefined
        })
      ],
      requireGolden: false
    });
    expect(report.themes[0]!.notes.join("\n")).toContain("hereda");
    expect(report.themes[0]!.errors).toEqual([]);
  });

  it("sin skin.css y sin declarar `inherit`, el tema no puede quedar verde (F4)", () => {
    // El caso del pase fresco: borrar el skin.css de un tema registrado no puede
    // leerse como "hereda" — el gate tiene que distinguir diseño de regresión.
    const report = checkThemes({
      themes: [
        themeInput({
          narrative: narrative({ id: "ingenieria", path: "ingenieria" }),
          skin: undefined
        })
      ],
      requireGolden: false
    });
    expect(report.themes[0]!.errors.join("\n")).toContain("skin: \"inherit\"");
    expect(report.ok).toBe(false);
  });

  it("declarar `inherit` con skin.css propio es una contradicción", () => {
    const report = checkThemes({
      themes: [
        themeInput({
          narrative: narrative({ id: "ingenieria", path: "ingenieria", skin: "inherit" }),
          skin: skin()
        })
      ],
      requireGolden: false
    });
    expect(report.themes[0]!.errors.join("\n")).toContain("inherit");
    expect(report.ok).toBe(false);
  });

  it("el tema DEFAULT sin skin.css es un error: no hay piel que emitir (F4)", () => {
    const report = checkThemes({
      themes: [themeInput({ skin: undefined })],
      requireGolden: false
    });
    expect(report.themes[0]!.errors.join("\n")).toContain("no tiene src/themes/museo/skin.css");
  });

  it("la piel propia de un tema no-default que NO llega al render es roja (F4/S4)", () => {
    // El emisor resolviera museo: el documento publica la piel del default y no
    // la del tema. Certificar el skin.css declarado sería el falso verde de F4.
    const museoEmitted = emitSkinCss(PRINT_RULE_COLOR, SKIN_SOURCE);
    const report = checkThemes({
      themes: [
        themeInput({
          narrative: narrative({ id: "ingenieria", path: "ingenieria" }),
          skin: skin({ emitted: museoEmitted })
        })
      ],
      requireGolden: false
    });
    const errors = report.themes[0]!.errors.join("\n");
    expect(errors).toContain("no publica la piel de su skin.css");
    expect(report.ok).toBe(false);
  });

  it("la piel propia de un tema no-default que SÍ llega al render se certifica (S4)", () => {
    const report = checkThemes({
      themes: [
        themeInput({
          narrative: narrative({ id: "ingenieria", path: "ingenieria" }),
          skin: skin()
        })
      ],
      requireGolden: false
    });
    expect(report.themes[0]!.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("sin evidencia de emisión el gate no puede certificar la piel declarada (F4)", () => {
    const report = checkThemes({
      themes: [
        themeInput({
          narrative: narrative({ id: "ingenieria", path: "ingenieria" }),
          skin: skin({ emitted: undefined })
        })
      ],
      requireGolden: false
    });
    expect(report.themes[0]!.errors.join("\n")).toContain("no hay evidencia");
    expect(report.ok).toBe(false);
  });
});

describe("themes/check — variantes de piel (S10 · #136)", () => {
  /**
   * El invariante de una variante: dos temas que comparten narrativa NO pueden
   * divergir en copy. La prueba es la IDENTIDAD de referencia (import, no
   * copia): un `{...copy}` con el mismo texto pasa cualquier comparación por
   * valor y vuelve a duplicar el texto — que es exactamente lo que la variante
   * existe para evitar. El gate tiene que morder en esa diferencia.
   */
  const variant = (overrides: Partial<NarrativeManifest> = {}): NarrativeManifest => ({
    ...museo,
    id: "museo-nocturno",
    path: "museo-nocturno",
    variantOf: "museo",
    ...overrides
  });
  const registry = (v: NarrativeManifest = variant()): Record<string, NarrativeManifest> => ({
    museo,
    [v.id]: v
  });
  const curations = { museo: MUSEO_CURATION, "museo-nocturno": MUSEO_CURATION };
  const errorsOf = (v: NarrativeManifest): string =>
    lineageErrors(v, registry(v), curations).join("\n");

  it("una variante con la narrativa y la curación del base POR REFERENCIA pasa", () => {
    expect(errorsOf(variant())).toBe("");
  });

  it("copiar el copy (mismo texto, otra referencia) es un error que nombra el eje", () => {
    const copied = variant({ copy: { ...museo.copy } });
    const errors = errorsOf(copied);
    expect(errors).toContain("copy");
    expect(errors).toContain("por referencia");
  });

  it("copiar las salas también diverge: no se admite otro arreglo", () => {
    expect(errorsOf(variant({ rooms: [...museo.rooms] }))).toContain("rooms");
  });

  it("copiar las ilusiones es duplicar el mapa de la narrativa base", () => {
    expect(errorsOf(variant({ illusions: { ...museo.illusions } }))).toContain("illusions");
  });

  it("la metadata (title/description/ogImage) también se reusa por referencia", () => {
    expect(errorsOf(variant({ meta: { ...museo.meta } }))).toContain("meta");
  });

  it("la dirección de publicación (`site`) también se reusa por referencia (F2 de #164)", () => {
    // El doc prometía `site` y el gate no lo miraba: una variante podía declarar
    // su propio `site` sin que nada lo notara.
    expect(errorsOf(variant({ site: { ...museo.site } }))).toContain("site");
  });

  it("una curación clonada es divergencia aunque hoy tenga las mismas decisiones", () => {
    const errors = lineageErrors(variant(), registry(), {
      museo: MUSEO_CURATION,
      "museo-nocturno": { ...MUSEO_CURATION }
    }).join("\n");
    expect(errors).toContain("curación");
    expect(errors).toContain("por referencia");
  });

  it("variantOf tiene que apuntar a un tema registrado", () => {
    const errors = lineageErrors(variant({ variantOf: "noexiste" }), registry(), curations).join("\n");
    expect(errors).toContain("noexiste");
    expect(errors).toContain("registrad");
  });

  it("un tema no puede ser variante de sí mismo", () => {
    expect(errorsOf(variant({ variantOf: "museo-nocturno" }))).toContain("sí mismo");
  });

  it("una variante no puede heredar la piel: existe para cambiarla", () => {
    const errors = lineageErrors(
      variant({ skin: "inherit" }),
      registry(variant({ skin: "inherit" })),
      curations
    ).join("\n");
    expect(errors).toContain("inherit");
    expect(errors).toContain("piel");
  });

  it("checkThemes publica el error de linaje en el reporte del tema", () => {
    const copied = variant({ copy: { ...museo.copy } });
    const report = checkThemes({
      themes: [themeInput({ narrative: copied, curation: MUSEO_CURATION })],
      registry: registry(copied),
      curations,
      requireGolden: false
    });
    expect(report.themes[0]!.errors.join("\n")).toContain("por referencia");
    expect(report.ok).toBe(false);
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
