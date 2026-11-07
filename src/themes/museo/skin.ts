/**
 * PIEL del tema `museo` (SPEC §5.6 · ADR-001 D11).
 *
 * `skin.css` es la ÚNICA fuente del CSS del tema: tokens, reset, componentes,
 * print y accesibilidad. Este módulo la carga y la EMITE.
 *
 * CONGELAMIENTO (I1 del epic, #130). Durante la FASE 5 el tema default publica
 * byte-idéntico. La piel se autora con tokens de alpha (`--teal-04`, …), pero
 * el CSS emitido conserva los literales históricos: los tokens marcados como
 * DERIVADOS (entre los marcadores `@derived:begin` y `@derived:end`) existen
 * sólo en la fuente y `emitSkinCss()` los resuelve a su valor. Publicarlos —y
 * dejar que
 * las reglas emitan `var()`— es un cambio de render DELIBERADO: se declara con
 * `Golden-Cambio: render` y se regenera el golden. No es un efecto colateral de
 * este archivo.
 *
 * POR QUÉ el escaneo es textual y no un parser CSS: la piel es un archivo de
 * datos, no un programa; el gate necesita decir archivo:línea y no depender de
 * una dependencia de parsing. Lo que sí exige es que el CSS sea un subconjunto
 * predecible (bloques `:root { … }` sin anidamiento), y eso lo verifica el test.
 */
import { readFileSync } from "node:fs";

/** La piel, cargada desde el archivo (misma fuente en build y en tests). */
export const SKIN_SOURCE: string = readFileSync(new URL("./skin.css", import.meta.url), "utf8");

/** Placeholder del color de las reglas del print (`PRINT_RULE_COLOR`). */
export const PRINT_RULE_PLACEHOLDER = "{{print-rule}}";

/**
 * Marcadores del bloque derivado. El bloque arranca en el salto de línea previo
 * para que quitarlo devuelva EXACTAMENTE el CSS histórico (sin línea en blanco
 * residual); el golden es el que muerde si esto se rompe.
 */
const DERIVED_BLOCK =
  /\n[ \t]*\/\* @derived:begin \*\/[\s\S]*?[ \t]*\/\* @derived:end \*\//;

export interface TokenDeclaration {
  readonly name: string;
  readonly value: string;
  /** true → sólo vive en la fuente; el emisor lo resuelve a su literal. */
  readonly derived: boolean;
}

export interface ColorLiteral {
  readonly value: string;
  /** Línea 1-based dentro del CSS. */
  readonly line: number;
  readonly inTokenBlock: boolean;
}

/**
 * Nombres de color de CSS que el gate vigila. La lista es CERRADA (los que el
 * repo puede usar) y se amplía cuando aparece uno nuevo: un color con nombre
 * que el escáner no conozca sería un literal invisible.
 */
const NAMED_COLORS = [
  "white",
  "black",
  "red",
  "green",
  "blue",
  "yellow",
  "orange",
  "purple",
  "pink",
  "gray",
  "grey",
  "silver",
  "maroon",
  "navy",
  "aqua",
  "fuchsia",
  "lime",
  "olive",
  "cyan",
  "magenta",
  "gold",
  "coral",
  "beige",
  "brown",
  "ivory"
] as const;

/** `transparent` y `currentColor` no son colores de paleta: no se tokenizan. */
const KEYWORDS = new Set(["transparent", "currentColor", "inherit", "initial", "unset", "none"]);

/**
 * Reemplaza cada comentario CSS por espacios (conservando los saltos de línea)
 * para que los índices sigan alineados con el texto original. Un comentario no
 * pinta nada: citar `#ccc` en una nota no es declarar un color.
 */
export function blankComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, " ")
  );
}

/** Rangos `[inicio, fin)` de los bloques `:root { … }` (sin anidamiento). */
export function tokenBlockRanges(css: string): { start: number; end: number }[] {
  const clean = blankComments(css);
  const ranges: { start: number; end: number }[] = [];
  const selector = /:root\s*\{/g;
  for (const match of clean.matchAll(selector)) {
    const start = (match.index ?? 0) + match[0].length;
    let depth = 1;
    let i = start;
    while (i < clean.length && depth > 0) {
      if (clean[i] === "{") depth += 1;
      else if (clean[i] === "}") depth -= 1;
      i += 1;
    }
    if (depth !== 0) throw new Error("piel: bloque `:root` sin cerrar");
    ranges.push({ start, end: i - 1 });
  }
  return ranges;
}

/** Declaraciones `--token: valor;` de los bloques `:root`, en orden de fuente. */
export function tokenDeclarations(css: string): TokenDeclaration[] {
  const clean = blankComments(css);
  const derivedAt = css.search(/\/\* @derived:begin \*\//);
  const derivedEnd = css.search(/\/\* @derived:end \*\//);
  const tokens: TokenDeclaration[] = [];
  for (const range of tokenBlockRanges(css)) {
    const block = clean.slice(range.start, range.end);
    for (const match of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      const at = range.start + (match.index ?? 0);
      tokens.push({
        name: `--${match[1]}`,
        // El valor puede traer espacios de formato (`rgba(140, 170, 200, 0.14)`).
        value: match[2].trim().replace(/\s+/g, " "),
        derived: derivedAt >= 0 && derivedEnd > derivedAt && at > derivedAt && at < derivedEnd
      });
    }
  }
  return tokens;
}

/** Tokens que sólo existen en la fuente (se resuelven al emitir). */
export function derivedTokens(css: string = SKIN_SOURCE): TokenDeclaration[] {
  return tokenDeclarations(css).filter((token) => token.derived);
}

/**
 * Rangos `[inicio, fin)` del VALOR de cada declaración (después del `:` de la
 * declaración, hasta `;` o `}`). El `:` de un selector (`:hover`, `:root`) no
 * abre un valor porque está fuera de un bloque (`{ … }`).
 */
function declarationValueRanges(clean: string): [number, number][] {
  const ranges: [number, number][] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (char === "{") {
      depth += 1;
      start = -1;
    } else if (char === "}") {
      depth = Math.max(0, depth - 1);
      if (start >= 0) ranges.push([start, i]);
      start = -1;
    } else if (depth > 0 && char === ":") {
      start = i + 1;
    } else if (char === ";" && start >= 0) {
      ranges.push([start, i]);
      start = -1;
    }
  }
  return ranges;
}

/**
 * Literales de color del CSS, con su línea y si están dentro de un bloque de
 * tokens. Cubre hex, `rgb()/rgba()`, `hsl()/hsla()` y la lista cerrada de
 * nombres. Los comentarios se ignoran.
 */
export function scanColorLiterals(css: string): ColorLiteral[] {
  const clean = blankComments(css);
  const ranges = tokenBlockRanges(css);
  const inTokenBlock = (index: number): boolean =>
    ranges.some((range) => index >= range.start && index < range.end);
  const lineOf = (index: number): number => clean.slice(0, index).split("\n").length;

  const hits: { index: number; value: string }[] = [];

  for (const match of clean.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g)) {
    hits.push({ index: match.index ?? 0, value: match[0] });
  }

  // Nombre de color: se busca SÓLO en el valor de una declaración (después de
  // `:` y antes de `;`/`}`). Mirar el carácter previo no alcanzaba: en el
  // shorthand `border:1px solid black` el previo es una letra y el literal
  // pasaba invisible (F4 del pase fresco de #130).
  const named = new RegExp(
    `(?<![\\w.-])(?:${NAMED_COLORS.join("|")})(?![\\w-])`,
    "g"
  );
  const values = declarationValueRanges(clean);
  for (const match of clean.matchAll(named)) {
    const at = match.index ?? 0;
    if (!values.some(([start, end]) => at >= start && at < end)) continue;
    if (KEYWORDS.has(match[0])) continue;
    hits.push({ index: at, value: match[0] });
  }

  return hits
    .sort((a, b) => a.index - b.index)
    .map((hit) => ({
      value: hit.value,
      line: lineOf(hit.index),
      inTokenBlock: inTokenBlock(hit.index)
    }));
}

/** Regla que declara a la vez un color de texto y un fondo de tinte derivado. */
export interface TintedTextRule {
  readonly selector: string;
  readonly fg: string;
  readonly bg: string;
}

/**
 * Combinaciones texto/tinte que la piel declara en UNA misma regla (chips,
 * estados, botones). Es el universo que el gate de contraste no puede dejar
 * afuera: declarar pares por token no modela el alpha del fondo (F1 del pase
 * fresco de #130). No cubre el color heredado (hover de un contenedor): esos
 * pares se declaran a mano, porque el CSS no dice qué hijo hereda qué.
 */
export function tintedTextRules(css: string): TintedTextRule[] {
  const clean = blankComments(css);
  const derived = new Set(derivedTokens(css).map((token) => token.name));
  const found = new Map<string, TintedTextRule>();
  for (const rule of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].trim().replace(/\s+/g, " ");
    if (selector.startsWith("@")) continue;
    const fg = rule[2].match(/(?<![-\w])color\s*:\s*var\((--[a-z0-9-]+)\)/i)?.[1];
    const bg = rule[2].match(/(?<![-\w])background(?:-color)?\s*:\s*var\((--[a-z0-9-]+)\)/i)?.[1];
    if (!fg || !bg || !derived.has(bg)) continue;
    found.set(`${selector}|${fg}|${bg}`, { selector, fg, bg });
  }
  return [...found.values()];
}

/** Nombres referenciados con `var(--x)` (en cualquier parte del CSS). */
export function varRefs(css: string): string[] {
  const clean = blankComments(css);
  const refs = new Set<string>();
  for (const match of clean.matchAll(/var\((--[a-z0-9-]+)/gi)) refs.add(match[1]);
  return [...refs];
}

/**
 * Todo custom property DECLARADO, en `:root` o en una regla. El gate de
 * referencias muertas usa esta lista y no sólo la paleta: `--brand-size` es un
 * token local de un componente (se declara en su propia regla) y es legítimo.
 */
export function declaredCustomProperties(css: string): string[] {
  const clean = blankComments(css);
  const names = new Set<string>();
  for (const match of clean.matchAll(/(--[a-z0-9-]+)\s*:/gi)) names.add(match[1]);
  return [...names];
}

/**
 * `var()` sin declaración y SIN fallback: el único caso que rompe de verdad.
 * `var(--dc,2.7s)` lo escribe el runtime (logoAnim) y trae fallback; una
 * referencia así es legal y no es una referencia muerta.
 */
export function unresolvedVarRefs(css: string): string[] {
  const clean = blankComments(css);
  const declared = new Set(declaredCustomProperties(css));
  const missing = new Set<string>();
  for (const match of clean.matchAll(/var\((--[a-z0-9-]+)\s*(,)?/gi)) {
    if (!declared.has(match[1]) && !match[2]) missing.add(match[1]);
  }
  return [...missing];
}

/**
 * CSS del tema listo para el `<style>`: resuelve los tokens derivados a su
 * literal y sustituye el color del print. Falla ruidoso si falta el bloque
 * derivado (una piel sin él no se puede congelar sin adivinar).
 */
export function emitSkinCss(printRuleColor: string, source: string = SKIN_SOURCE): string {
  const substituted = source.split(PRINT_RULE_PLACEHOLDER).join(printRuleColor);
  const block = DERIVED_BLOCK.exec(substituted);
  if (!block) {
    throw new Error(
      "piel: falta el bloque `/* @derived:begin */ … /* @derived:end */`; " +
        "sin él no hay forma determinista de emitir el CSS congelado"
    );
  }
  const tokens = tokenDeclarations(substituted).filter((token) => token.derived);
  let out = substituted.slice(0, block.index) + substituted.slice(block.index + block[0].length);
  for (const token of tokens) {
    out = out.split(`var(${token.name})`).join(token.value);
  }
  return out;
}
