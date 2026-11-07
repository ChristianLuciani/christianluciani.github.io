import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { baselineFile } from "../../../tools/golden/paths.ts";
import { PRINT_RULE_COLOR } from "../../templates/print-tokens.ts";
import { AA_DEBT, SKIN_CONTRAST_PAIRS, contrastRatio, parseColor, resolvePair } from "./contrast.ts";
import {
  SKIN_SOURCE,
  emitSkinCss,
  scanColorLiterals,
  tintedTextRules,
  tokenDeclarations,
  unresolvedVarRefs
} from "./skin.ts";

/**
 * GATE DE LA PIEL (#130, SPEC §5.6 · ADR-001 I1/I5).
 *
 * Tres definiciones distintas, cada una con su dueño:
 *
 *   A) PIEL → CSS EMITIDO: `emitSkinCss()` reproduce byte a byte el `<style>`
 *      congelado del golden. Es el instrumento local de I1: si el refactor
 *      cambia un espacio del CSS, este test lo dice sin abrir un diff de 140 KB.
 *   B) PIEL → LITERALES: `skin.css` no declara colores fuera de sus bloques de
 *      tokens. Un literal suelto es la razón por la que una segunda piel hoy
 *      sería un fork del CSS (D11).
 *   C) CONTRASTE: todo par texto/fondo usado por la piel está declarado y pasa
 *      AA (4,5:1 normal; 3:1 decoración). Las deudas son explícitas y se
 *      auto-eliminan cuando el par deja de fallar: sin eso, una lista de
 *      excepciones se pudre en silencio.
 *
 * La piel se autora con tokens; el emisor resuelve los tokens DERIVADOS a su
 * literal para no mover el render del tema default (I1 del epic). Levantar el
 * congelamiento (publicar el bloque derivado) es un cambio de render declarado
 * con `Golden-Cambio: render`, no un efecto colateral de este archivo.
 */

const GOLDEN_PATH = baselineFile(process.cwd());
const GOLDEN = readFileSync(GOLDEN_PATH, "utf8");

/** El `<style>` del baseline congelado, SIN el salto de línea que sigue al tag. */
function goldenStyle(): string {
  const open = GOLDEN.indexOf("<style>");
  const close = GOLDEN.indexOf("</style>", open);
  if (open < 0 || close < 0) throw new Error(`el golden no tiene <style>…</style> (${GOLDEN_PATH})`);
  const inner = GOLDEN.slice(open + "<style>".length, close);
  if (!inner.startsWith("\n")) throw new Error("el <style> del golden no abre con salto de línea");
  return inner.slice(1);
}

describe("piel — la fuente es un archivo (ADR-001)", () => {
  it("existe `src/themes/museo/skin.css` y es lo que emite el head", () => {
    // El archivo es la piel completa: tokens, reset, componentes, print y a11y.
    expect(SKIN_SOURCE.length).toBeGreaterThan(40_000);
    expect(SKIN_SOURCE).toContain("TOKENS");
    expect(SKIN_SOURCE).toContain("@media print");
    expect(SKIN_SOURCE).toContain("prefers-reduced-motion");
  });

  it("declara las mismas variables que hoy consume el CSS (0 referencias muertas)", () => {
    expect(unresolvedVarRefs(SKIN_SOURCE)).toEqual([]);
    // El gate muerde: una referencia sin declarar y sin fallback se reporta; con
    // fallback (token de runtime) es legal.
    expect(unresolvedVarRefs(".a{color:var(--nope)}")).toEqual(["--nope"]);
    expect(unresolvedVarRefs(".a{color:var(--runtime-token,red)}")).toEqual([]);
  });

  it("el head sólo emite la piel: el CSS ya no vive en el template", () => {
    const head = readFileSync(resolve(process.cwd(), "src", "templates", "head_html.ts"), "utf8");
    expect(head).toContain("${emitSkin(PRINT_RULE_COLOR)}");
    // Ni reglas ni tokens: el template aporta el tag, no la hoja.
    expect(head).not.toContain(":root {");
    expect(head).not.toMatch(/rgba?\(/);
  });

  it("no hay tokens derivados declarados y sin uso (serían deuda silenciosa)", () => {
    const derived = tokenDeclarations(SKIN_SOURCE).filter((t) => t.derived);
    expect(derived.length).toBeGreaterThan(30);
    const uses = SKIN_SOURCE.match(/var\(--[a-z0-9-]+\)/g) ?? [];
    for (const token of derived) {
      expect(uses, `el token ${token.name} no lo usa ninguna regla`).toContain(
        `var(${token.name})`
      );
    }
  });
});

describe("piel — el CSS emitido es byte-idéntico al golden (I1)", () => {
  it("`emitSkinCss()` reproduce el `<style>` congelado, byte a byte", () => {
    const emitted = emitSkinCss(PRINT_RULE_COLOR);
    expect(emitted).toBe(goldenStyle());
  });

  it("la emisión no publica tokens derivados (congelamiento declarado)", () => {
    const emitted = emitSkinCss(PRINT_RULE_COLOR);
    expect(emitted).not.toContain("@derived");
    for (const token of tokenDeclarations(SKIN_SOURCE).filter((t) => t.derived)) {
      expect(emitted, `el token derivado ${token.name} se filtró a la emisión`).not.toContain(
        token.name
      );
    }
  });

  it("la constante del print entra por la piel, no por un literal duplicado", () => {
    expect(SKIN_SOURCE).toContain("{{print-rule}}");
    const emitted = emitSkinCss(PRINT_RULE_COLOR);
    expect(emitted).not.toContain("{{");
    expect(emitted).toContain(`border-bottom:1pt solid ${PRINT_RULE_COLOR}`);
  });

  it("el emisor falla ruidoso si la piel no trae el bloque derivado", () => {
    expect(() => emitSkinCss(PRINT_RULE_COLOR, ":root { --ink: #fff; }")).toThrow(
      /@derived:begin/
    );
  });
});

describe("piel — 0 literales de color fuera del bloque de tokens (I5)", () => {
  it("la piel real no tiene literales sueltos (sólo dentro de `:root`)", () => {
    const hits = scanColorLiterals(SKIN_SOURCE).filter((hit) => !hit.inTokenBlock);
    const detail = hits.map((hit) => `línea ${hit.line}: ${hit.value}`).join("\n");
    expect(hits, `literales de color fuera del bloque de tokens:\n${detail}`).toHaveLength(0);
  });

  it("el escáner muerde: un literal fuera de `:root` se reporta", () => {
    const hits = scanColorLiterals(":root { --ink: #fff; }\n.a { color:#000; }");
    expect(hits.map((h) => h.value)).toEqual(["#fff", "#000"]);
    expect(hits[1].inTokenBlock).toBe(false);
  });

  it("el escáner no cuenta comentarios (una nota no pinta nada)", () => {
    expect(scanColorLiterals("/* el viejo #ccc */\n.a { color:var(--ink); }")).toHaveLength(0);
  });

  it("el escáner cubre hex, rgb/rgba, hsl y nombres de color", () => {
    const css = ":root { --a: #fff; }\n.a{color:rgb(1,2,3)}.b{color:hsl(1,2%,3%)}.c{color:black}";
    const values = scanColorLiterals(css).filter((h) => !h.inTokenBlock).map((h) => h.value);
    expect(values).toEqual(["rgb(1,2,3)", "hsl(1,2%,3%)", "black"]);
  });

  it("el escáner ve nombres de color en shorthands (F4 del pase fresco)", () => {
    // El bug: mirar el carácter previo sólo detectaba `color:black`; un
    // `border:1px solid black` pasaba invisible porque el previo es una letra.
    const values = (css: string): string[] =>
      scanColorLiterals(css).filter((h) => !h.inTokenBlock).map((h) => h.value);
    expect(values(".a{border:1px solid black}")).toEqual(["black"]);
    expect(values(".a{box-shadow:0 0 8px white}")).toEqual(["white"]);
    expect(values(".a{outline:2px solid gold}")).toEqual(["gold"]);
    expect(values(".a{color:black}")).toEqual(["black"]);
  });

  it("el escáner no confunde el selector ni un identificador con un valor", () => {
    const values = (css: string): string[] =>
      scanColorLiterals(css).filter((h) => !h.inTokenBlock).map((h) => h.value);
    expect(values(".gold{color:var(--ink)}")).toEqual([]);
    expect(values(".a{white-space:nowrap}")).toEqual([]);
    expect(values("@media (x){.a:hover{border:1px solid red}}")).toEqual(["red"]);
  });

  it("`transparent` y `currentColor` no son literales de paleta", () => {
    expect(scanColorLiterals(".a{background:transparent;color:currentColor}")).toHaveLength(0);
  });
});

describe("piel — contraste declarado por par, AA verificado", () => {
  const tokens = new Map(tokenDeclarations(SKIN_SOURCE).map((t) => [t.name, t.value]));

  it("todo color de texto de la piel tiene un par declarado", () => {
    const fgs = new Set(SKIN_CONTRAST_PAIRS.map((pair) => pair.fg));
    const used = [
      ...(SKIN_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(?<![-\w])color\s*:\s*var\((--[a-z0-9-]+)\)/g) ?? [])
    ].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(10);
    for (const token of used) {
      expect(fgs, `color:var(${token}) sin par de contraste declarado`).toContain(token);
    }
  });

  it("el gate cubre las combinaciones reales texto/tinte, no sólo el par de tokens", () => {
    // F1 del pase fresco: `.status-paused` pinta ink-meta-10 DETRÁS del texto;
    // el par --ink-meta/--card medía una superficie que el texto nunca ve.
    // Toda regla que declara color + fondo de tinte tiene que estar declarada.
    const declared = new Set(SKIN_CONTRAST_PAIRS.map((pair) => `${pair.fg}|${pair.bg}`));
    const rules = tintedTextRules(SKIN_SOURCE);
    expect(rules.length).toBeGreaterThanOrEqual(18);
    for (const rule of rules) {
      expect(
        declared,
        `${rule.selector}: ${rule.fg} sobre ${rule.bg} no tiene par de contraste`
      ).toContain(`${rule.fg}|${rule.bg}`);
    }
  });

  it("los chips de estado declaran su pila real y están endeudados con el ratio medido", () => {
    const cases = [
      { selector: ".status-paused", fg: "--ink-meta", bg: "--ink-meta-10", bases: ["--bg-1", "--card"], ratio: 4.28 },
      { selector: ".project-falta", fg: "--ink-meta", bg: "--gold-05", bases: ["--bg-1", "--card"], ratio: 4.48 }
    ];
    for (const item of cases) {
      const pair = SKIN_CONTRAST_PAIRS.find((p) => p.fg === item.fg && p.bg === item.bg);
      expect(pair, `falta el par ${item.fg}/${item.bg}`).toBeDefined();
      expect(pair!.bases, `${item.selector}: pila de fondos`).toEqual(item.bases);
      expect(resolvePair(pair!, tokens), item.selector).toBeCloseTo(item.ratio, 2);
      const debt = AA_DEBT.find((d) => d.selector === item.selector);
      expect(debt, `${item.selector} no está en AA_DEBT`).toBeDefined();
      expect(debt!.ratio).toBeCloseTo(item.ratio, 2);
    }
  });

  it("cada par declara tokens existentes y una razón de uso", () => {
    expect(SKIN_CONTRAST_PAIRS.length).toBeGreaterThanOrEqual(10);
    for (const pair of SKIN_CONTRAST_PAIRS) {
      expect(tokens.has(pair.fg), `token desconocido ${pair.fg}`).toBe(true);
      expect(tokens.has(pair.bg), `token desconocido ${pair.bg}`).toBe(true);
      for (const base of pair.bases ?? []) {
        expect(tokens.has(base), `token desconocido ${base}`).toBe(true);
      }
      expect(pair.usage.length).toBeGreaterThan(10);
    }
  });

  it("todo par pasa su umbral AA (y las deudas siguen siendo deudas)", () => {
    const keyOf = (item: { fg: string; bg: string; bases?: readonly string[] }): string =>
      `${item.fg}|${item.bg}|${(item.bases ?? []).join(">")}`;
    const debts = new Set(AA_DEBT.map(keyOf));
    for (const pair of SKIN_CONTRAST_PAIRS) {
      const ratio = resolvePair(pair, tokens);
      const key = keyOf(pair);
      if (debts.has(key)) {
        // Auto-eliminación: si el par ya cumple, la deuda es mentira y el test falla.
        expect(ratio, `AA_DEBT quedó obsoleta: ${key} ya cumple ${pair.min}:1`).toBeLessThan(pair.min);
        continue;
      }
      expect(
        ratio,
        `${key} = ${ratio.toFixed(2)}:1 < ${pair.min}:1 (${pair.usage})`
      ).toBeGreaterThanOrEqual(pair.min);
    }
  });

  it("toda deuda declara razón, selector real y pertenece a un par declarado", () => {
    for (const debt of AA_DEBT) {
      expect(debt.reason.length).toBeGreaterThan(20);
      // El selector existe en la piel: una deuda sin superficie es una excusa.
      expect(SKIN_SOURCE).toContain(debt.selector);
      const pair = SKIN_CONTRAST_PAIRS.find(
        (item) =>
          item.fg === debt.fg &&
          item.bg === debt.bg &&
          (item.bases ?? []).join(">") === (debt.bases ?? []).join(">")
      );
      expect(pair, `la deuda ${debt.selector} no tiene par declarado`).toBeDefined();
      expect(pair!.min).toBe(debt.min);
    }
  });

  it("la cifra de cada deuda coincide con el par que declara (F3)", () => {
    // F3 del pase fresco: AA_DEBT citaba 3,30:1 para el par --ink-faint/--bg-1,
    // que en realidad mide 3,41. El test recalcula y ata la cita al par.
    for (const debt of AA_DEBT) {
      const pair = SKIN_CONTRAST_PAIRS.find(
        (item) =>
          item.fg === debt.fg &&
          item.bg === debt.bg &&
          (item.bases ?? []).join(">") === (debt.bases ?? []).join(">")
      );
      expect(pair, `falta el par de ${debt.selector}`).toBeDefined();
      expect(resolvePair(pair!, tokens), `${debt.selector}: ratio citado ≠ medido`).toBeCloseTo(
        debt.ratio,
        2
      );
    }
  });

  it("cada tinte con alpha deriva de su color base con ESE alpha", () => {
    // `--teal-28` no es un literal independiente: es `--teal` al 28%. Si un
    // tinte driftea de su base, la piel miente sobre su propia paleta.
    const tints = /^--(teal|gold|ink-meta|bg-0|bg-1)-(\d{2,3})$/;
    let checked = 0;
    for (const [name, value] of tokens) {
      const match = name.match(tints);
      if (!match) continue;
      const base = parseColor(tokens.get(`--${match[1]}`) ?? "");
      const tint = parseColor(value);
      const alpha = Number(match[2]) / (match[2].length === 2 ? 100 : 1000);
      expect(tint.a, `${name}: alpha declarado`).toBeCloseTo(alpha, 5);
      expect([tint.r, tint.g, tint.b], `${name}: canales de --${match[1]}`).toEqual([
        Math.round(base.r),
        Math.round(base.g),
        Math.round(base.b)
      ]);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(34);
  });

  it("el ratio documentado de `--ink-meta` sobre tarjeta (4,79:1) no driftea", () => {
    const pair = SKIN_CONTRAST_PAIRS.find(
      (p) =>
        p.fg === "--ink-meta" &&
        p.bg === "--card" &&
        (p.bases ?? []).join(">") === "--bg-1"
    );
    expect(pair, "falta el par declarado en el manual de estilo").toBeDefined();
    expect(resolvePair(pair!, tokens).toFixed(2)).toBe("4.79");
  });

  it("la matemática WCAG muerde los extremos", () => {
    expect(contrastRatio(parseColor("#000000"), parseColor("#ffffff"))).toBeCloseTo(21, 1);
    expect(contrastRatio(parseColor("#ffffff"), parseColor("#ffffff"))).toBeCloseTo(1, 5);
    // alpha: blanco 1.6% sobre el fondo-1 compone un gris apenas más claro.
    const card = resolvePair(
      { fg: "--ink", bg: "--card", bases: ["--bg-1"], min: 4.5, usage: "texto sobre tarjeta" },
      tokens
    );
    expect(card).toBeGreaterThan(15);
  });
});
