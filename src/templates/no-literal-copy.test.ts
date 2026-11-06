import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assembleHtml } from "./index";
import { allCopyHits, copyHitsOf, templateFiles } from "../../tools/copy/lint";

/**
 * GATE DE COPY (#127, SPEC §8 FASE 5 · ADR-001 I5).
 *
 * Verifica el DoD del issue con dos definiciones DISTINTAS y declaradas:
 *
 *   A) TEMPLATES → HTML (este archivo, primer bloque). Ningún template emite
 *      copy literal > 2 palabras, ni como nodo de texto NI como valor de un
 *      atributo de copy (`aria-label`, `alt`, `title`, `content` de meta,
 *      `data-caption`, `data-aria-*`). Es la cláusula que un aria-label literal
 *      hacía escapar.
 *   B) PACK → HTML (segundo y tercer bloque). Toda clave del pack que NO sea
 *      `runtime` aparece en el render; el pack es bilingüe y sin conflictos.
 *
 * Lo que este archivo NO mide (y no debe fingir que mide): MAP → nodo del
 * walker. El walker i18n recorre nodos de texto; los pares `print.*` (salta
 * `#print-cv`) y los sólo-atributo (aria/alt/meta/caption) nunca se consultan
 * y son copy vivo en otra superficie, no claves muertas. Los pares derivados
 * del SSOT que la rama de datos de hoy no renderiza tampoco son deuda de copy:
 * se derivan. Ver `docs/CREAR-TEMA.md` §3.1.
 *
 * Cuando falla, el mensaje dice archivo:línea, superficie y texto: mover la
 * frase al pack (`src/themes/museo/copy.ts`) y pedirla con `t()`/`th()`/`ta()`.
 */
describe("copy — cero texto literal en templates (I5)", () => {
  it("el linter escanea todos los templates del tema (no una muestra)", () => {
    const files = templateFiles();
    expect(files.length).toBeGreaterThanOrEqual(9);
    expect(files).toContain("src/templates/sala_html.ts");
  });

  it("ningún template emite > 2 palabras de texto ni de atributo de copy", () => {
    const hits = allCopyHits();
    const detail = hits.map((h) => `${h.file}:${h.line} [${h.kind}] → "${h.text}"`).join("\n");
    expect(hits, `copy literal hardcodeado en templates:\n${detail}`).toHaveLength(0);
  });

  /**
   * CORPUS DE FORMAS DE HTML QUE EL GATE DEBE VER (tabla, no casos sueltos).
   *
   * El defecto recurrente de los pases fue "el gate se esquiva con una forma
   * que no contempla": comillas simples, entidades, strings planos, multilínea.
   * La tabla cierra la CLASE: agregar una forma = agregar una fila, y el test
   * falla si el linter deja de morderla.
   */
  const asHtml = (html: string): string => `const h = ${JSON.stringify(html)};`;
  const bypass: { name: string; source: string; kind: string }[] = [
    {
      name: "aria-label con comilla simple",
      source: asHtml(`<div aria-label='tres palabras libres'></div>`),
      kind: "atributo:aria-label"
    },
    {
      name: "aria-label con comilla doble",
      source: asHtml(`<div aria-label="tres palabras libres"></div>`),
      kind: "atributo:aria-label"
    },
    {
      name: "alt con comilla simple",
      source: asHtml(`<img alt='texto alternativo largo'>`),
      kind: "atributo:alt"
    },
    {
      name: "alt con comilla doble",
      source: asHtml(`<img alt="texto alternativo largo">`),
      kind: "atributo:alt"
    },
    {
      name: "meta content con comilla simple",
      source: asHtml(`<meta name="description" content='descripcion literal larga'>`),
      kind: "atributo:content"
    },
    {
      name: "aria-label con espacios alrededor del =",
      source: asHtml(`<div aria-label = 'tres palabras libres'></div>`),
      kind: "atributo:aria-label"
    },
    {
      name: "meta content con comilla doble",
      source: asHtml(`<meta name="description" content="descripcion literal larga">`),
      kind: "atributo:content"
    },
    {
      name: "texto con entidad nominal &amp;",
      source: asHtml(`<p>Investigación &amp; desarrollo aplicado</p>`),
      kind: "texto"
    },
    {
      name: "texto con entidad nominal &nbsp;",
      source: asHtml(`<p>Investigación&nbsp;y desarrollo aplicado</p>`),
      kind: "texto"
    },
    {
      name: "texto con entidad nominal &mdash;",
      source: asHtml(`<p>Investigación &mdash; desarrollo aplicado</p>`),
      kind: "texto"
    },
    {
      name: "texto con entidad numérica &#38;",
      source: asHtml(`<p>Investigación &#38; desarrollo aplicado</p>`),
      kind: "texto"
    },
    {
      name: "texto con entidad numérica hex &#x26;",
      source: asHtml(`<p>Investigación &#x26; desarrollo aplicado</p>`),
      kind: "texto"
    },
    {
      name: "atributo con entidad &amp;",
      source: asHtml(`<div aria-label="Investigación &amp; desarrollo aplicado"></div>`),
      kind: "atributo:aria-label"
    },
    {
      name: "atributo con entidad numérica &#38;",
      source: asHtml(`<div aria-label="Investigación &#38; desarrollo aplicado"></div>`),
      kind: "atributo:aria-label"
    },
    {
      name: "texto con = (La fórmula es E = mc cuadrado)",
      source: asHtml(`<p>La fórmula es E = mc cuadrado</p>`),
      kind: "texto"
    },
    {
      name: "texto con llaves (Elige una {opción} de tres)",
      source: asHtml(`<p>Elige una {opción} de tres</p>`),
      kind: "texto"
    },
    {
      name: "texto con ; (primero el diseño; después el código)",
      source: asHtml(`<p>primero el diseño; después el código</p>`),
      kind: "texto"
    },
    {
      name: "atributo con ; (primero; segundo; tercero)",
      source: asHtml(`<div aria-label="primero; segundo; tercero"></div>`),
      kind: "atributo:aria-label"
    },
    {
      name: "nodo partido en dos líneas de fuente",
      source: "const h = `<p>investigación y\ndesarrollo aplicado</p>`;",
      kind: "texto"
    },
    {
      name: "entidad de espaciado &emsp;",
      source: asHtml(`<p>Investigación&emsp;y&emsp;desarrollo aplicado</p>`),
      kind: "texto"
    },
    {
      name: "entidad de espaciado &ensp;",
      source: asHtml(`<p>Investigación&ensp;y&ensp;desarrollo aplicado</p>`),
      kind: "texto"
    },
    {
      name: "entidad de espaciado &thinsp;",
      source: asHtml(`<p>Investigación&thinsp;y&thinsp;desarrollo aplicado</p>`),
      kind: "texto"
    },
    {
      name: "string plano emitido por interpolación",
      source: 'const x = "tres palabras libres"; const h = `<p>${x}</p>`;',
      kind: "texto"
    },
    {
      name: "string plano dentro de una interpolación",
      source: 'const h = `${"tres palabras libres"}`;',
      kind: "texto"
    },
    {
      name: "template multilínea",
      source: "const h = `\n<p>\ntres palabras libres\n</p>`;",
      kind: "texto"
    }
  ];

  it.each(bypass)("detecta $name", ({ source, kind }) => {
    const hits = copyHitsOf("probe.ts", source);
    expect(hits, source).toHaveLength(1);
    expect(hits[0]!.kind).toBe(kind);
  });

  const controls: { name: string; source: string }[] = [
    { name: "import", source: 'import { t } from "../content/copy.ts";' },
    { name: "clave de objeto", source: 'const k = { "pub.kontablo.title": "x" };' },
    { name: "URL", source: 'const u = "https://example.com/a/b";' },
    {
      name: "atributo técnico",
      source: 'const h = `<img class="pub-thumb" src="data:x" alt="${ta("pub.kontablo.alt")}">`;'
    },
    {
      name: "valor interpolado",
      source: 'const h = `<div class="skill-label">${t("room.competencias.agents.label")}</div>`;'
    },
    {
      name: "CSS con dos palabras-palabra ({ display: grid; })",
      source: asHtml(`<p>{ display: grid; }</p>`)
    },
    {
      name: "CSS multilínea con dos palabras-palabra",
      source: "const h = `\n<p>\n{ display: grid; }\n</p>`;"
    },
    {
      name: "meta viewport",
      source: 'const h = `<meta name="viewport" content="width=device-width, initial-scale=1.0">`;'
    }
  ];

  it.each(controls)("no marca como copy: $name", ({ source }) => {
    expect(copyHitsOf("probe.ts", source), source).toHaveLength(0);
  });

  it("reporta la línea REAL del fuente, no la del chunk (sondas 25/30)", () => {
    const lines = Array.from({ length: 40 }, (_, i) => `// línea ${i + 1}`);
    lines[24] = 'const b = `<p>otras tres palabras</p>`;'; // línea 25
    lines[29] = 'const a = `<p>tres palabras libres</p>`;'; // línea 30
    const hits = copyHitsOf("probe.ts", lines.join("\n"));
    expect(hits.map((hit) => hit.line).sort((a, b) => a - b)).toEqual([25, 30]);
  });

  it("suma los saltos de línea DENTRO de un template multilínea", () => {
    const source = ["const x = `", "<p>uno</p>", "<p>dos tres cuatro</p>", "`;"].join("\n");
    const hits = copyHitsOf("probe.ts", source);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.line).toBe(3);
  });

  it("no se esquiva con un string plano emitido por interpolación", () => {
    const probes = [
      'const x = "tres palabras libres"; `<p>${x}</p>`',
      '`${"tres palabras libres"}`',
      'aria-label={"tres palabras libres"}'
    ];
    for (const probe of probes) {
      const hits = copyHitsOf("probe.ts", probe);
      expect(hits, probe).toHaveLength(1);
      expect(hits[0]!.text).toBe("tres palabras libres");
    }
  });

  it("no marca como copy los strings técnicos (import, clave, URL)", () => {
    const probes = [
      'import { t } from "../content/copy.ts";',
      'const k = { "pub.kontablo.title": "x" };',
      'const u = "https://example.com/a/b";'
    ];
    for (const probe of probes) {
      expect(copyHitsOf("probe.ts", probe), probe).toHaveLength(0);
    }
  });

  it("el gate no confunde atributos técnicos ni valores interpolados", () => {
    const probes = [
      'const html = `<img class="pub-thumb" src="data:x" alt="${ta("pub.kontablo.alt")}">`;',
      'const html = `<div class="skill-label">${t("room.competencias.agents.label")}</div>`;',
      'const html = `<meta name="viewport" content="width=device-width, initial-scale=1.0">`;'
    ];
    for (const probe of probes) {
      expect(copyHitsOf("probe.ts", probe), probe).toHaveLength(0);
    }
  });
});

describe("copy — descubrimiento de templates", () => {
  it("es recursivo y acepta .ts/.tsx, sin tests", () => {
    const root = mkdtempSync(join(tmpdir(), "copy-lint-"));
    try {
      mkdirSync(join(root, "sub"));
      writeFileSync(join(root, "a.ts"), "");
      writeFileSync(join(root, "b.tsx"), "");
      writeFileSync(join(root, "c.test.ts"), "");
      writeFileSync(join(root, "sub", "d.ts"), "");
      writeFileSync(join(root, "sub", "e.test.tsx"), "");
      expect(templateFiles(root)).toEqual([
        join(root, "a.ts"),
        join(root, "b.tsx"),
        join(root, "sub", "d.ts")
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("copy — pack bilingüe y sin claves muertas", () => {
  it("toda clave tiene ES y EN no vacíos", async () => {
    const { COPY } = await import("../content/copy.ts");
    for (const [key, entry] of Object.entries(COPY)) {
      expect(entry.es.trim(), `${key}.es`).not.toBe("");
      expect(entry.en.trim(), `${key}.en`).not.toBe("");
    }
  });

  it("las claves son semánticas (grupo.subclave, sin texto como clave)", async () => {
    const { COPY } = await import("../content/copy.ts");
    for (const key of Object.keys(COPY)) {
      expect(key, `clave "${key}"`).toMatch(/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/);
    }
  });

  it("un mismo texto ES no declara dos EN distintas", async () => {
    const { COPY } = await import("../content/copy.ts");
    const seen = new Map<string, { key: string; en: string }>();
    const conflicts: string[] = [];
    const norm = (s: string): string => s.replace(/\s+/g, " ").trim();
    for (const [key, entry] of Object.entries(COPY)) {
      if (entry.es === entry.en) continue;
      const es = norm(entry.es);
      const prev = seen.get(es);
      if (prev && prev.en !== entry.en) {
        conflicts.push(`"${es}" → ${prev.key} ("${prev.en}") vs ${key} ("${entry.en}")`);
      }
      seen.set(es, { key, en: entry.en });
    }
    expect(conflicts, `claves en conflicto:\n${conflicts.join("\n")}`).toHaveLength(0);
  });

  it("ninguna clave del pack es huérfana en el HTML generado", async () => {
    const { COPY } = await import("../content/copy.ts");
    const decode = (s: string): string =>
      s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
    const norm = (s: string): string => s.replace(/\s+/g, " ").trim();
    const html = decode(assembleHtml())
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ");
    const text = norm(html.replace(/<[^>]*>/g, " "));
    const raw = norm(html);
    const dead: string[] = [];
    for (const [key, entry] of Object.entries(COPY)) {
      // `runtime`: lo monta el JS o depende de estado; no está garantizado en el
      // HTML inicial (intro, canvas del grafo, feed vacío, niveles ausentes).
      if (entry.runtime) continue;
      const es = norm(entry.es.replace(/<[^>]*>/g, " "));
      if (!text.includes(es) && !raw.includes(es)) dead.push(key);
    }
    expect(dead, `claves sin uso en el render: ${dead.join(", ")}`).toHaveLength(0);
  });
});

/* ── Regresión de coordenadas contra el árbol histórico ───────────────
   El pase 2 reportó coordenadas falsas (línea del chunk, no del hit). Esta
   prueba fija los 14 hits reales que el gate histórico debía ver en f3fb51b:
   si el mapeo offset→línea vuelve a romperse, los números dejan de coincidir.
   Depende del historial de git: en un checkout superficial se salta con razón
   visible en lugar de fingir que pasó. */
function showAt(ref: string, path: string): string | null {
  try {
    return execFileSync("git", ["show", `${ref}:${path}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    return null;
  }
}

const HISTORICO_HERO = showAt("f3fb51b", "src/templates/hero_html.ts");
const HISTORICO_SALA = showAt("f3fb51b", "src/templates/sala_html.ts");

describe.skipIf(HISTORICO_HERO === null || HISTORICO_SALA === null)(
  "copy — coordenadas reales de los 14 hits históricos (f3fb51b)",
  () => {
    it("hero: el aria-label literal se reporta en la línea 15", () => {
      const hits = copyHitsOf("hero_html.ts", HISTORICO_HERO ?? "");
      expect(hits.map((hit) => hit.line)).toEqual([15]);
      expect(hits[0]!.kind).toBe("atributo:aria-label");
    });

    it("sala: 13 hits en sus líneas reales (6 aria + 6 alt + Penrose)", () => {
      const hits = copyHitsOf("sala_html.ts", HISTORICO_SALA ?? "");
      expect(hits.map((hit) => hit.line)).toEqual([
        48, 59, 69, 80, 99, 107, 414, 425, 460, 478, 487, 496, 513
      ]);
      expect(hits.filter((hit) => hit.kind === "atributo:alt")).toHaveLength(6);
      expect(hits.filter((hit) => hit.kind === "atributo:aria-label")).toHaveLength(7);
    });
  }
);
