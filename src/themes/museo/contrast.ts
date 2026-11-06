/**
 * CONTRASTE de la piel (SPEC §5.6 · ADR-001 I5).
 *
 * La piel declara PARES texto/fondo —no sólo colores— y cada par declara su
 * umbral. El test de `skin.test.ts` resuelve los dos tokens contra `skin.css` y
 * calcula WCAG. Consecuencia buscada: cambiar un token mueve el ratio y el
 * gate lo ve sin que nadie tenga que acordarse de recalcular a mano.
 *
 * `AA_DEBT` no es una lista de permisos: es deuda DECLARADA que se
 * auto-elimina. Si un par endeudado empieza a cumplir, el test falla pidiendo
 * borrar la deuda. Sin esa asimetría, una excepción vive para siempre.
 */

export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export interface ContrastPair {
  /** Token de texto (`color:`). */
  readonly fg: string;
  /** Token de fondo; si tiene alpha se compone sobre `base`. */
  readonly bg: string;
  /** Fondo opaco debajo de un `bg` con alpha (p. ej. `--card` sobre `--bg-1`). */
  readonly base?: string;
  /** Umbral WCAG: 4,5 texto normal; 3 texto grande o pieza de UI. */
  readonly min: number;
  /** Para qué se usa el par; una razón, no un label. */
  readonly usage: string;
}

export interface ContrastDebt {
  readonly fg: string;
  readonly bg: string;
  readonly min: number;
  readonly reason: string;
}

const NAMED: Record<string, Rgba> = {
  white: { r: 255, g: 255, b: 255, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
  transparent: { r: 0, g: 0, b: 0, a: 0 }
};

/** Parsea un color de la piel; falla si el token no es un color reconocible. */
export function parseColor(value: string): Rgba {
  const text = value.trim().toLowerCase();
  if (text in NAMED) return NAMED[text];

  const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const raw =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((c) => c + c)
            .join("")
        : hex[1];
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
      a: 1
    };
  }

  const fn = text.match(/^rgba?\(([^)]+)\)$/);
  if (fn) {
    const parts = fn[1].split(",").map((part) => part.trim());
    if (parts.length < 3) throw new Error(`contraste: color rgba inválido: ${value}`);
    const [r, g, b, a = "1"] = parts;
    return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
  }

  throw new Error(`contraste: no sé parsear el color "${value}"`);
}

/** Compone `fg` (con alpha) sobre `bg` opaco. */
export function composite(fg: Rgba, bg: Rgba): Rgba {
  if (fg.a >= 1) return fg;
  const a = fg.a + bg.a * (1 - fg.a);
  // Se redondea a 8 bits: el navegador pinta canales enteros, y el ratio que
  // documenta el manual (4,79:1) es el del color PINTADO, no el algebraico.
  const mix = (top: number, bottom: number): number =>
    Math.round((top * fg.a + bottom * bg.a * (1 - fg.a)) / (a || 1));
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a };
}

/** Luminancia relativa WCAG 2.x. */
export function relativeLuminance({ r, g, b }: Rgba): number {
  const channel = (value: number): number => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Ratio de contraste WCAG entre dos colores (1:1 … 21:1). */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Pares texto/fondo DECLARADOS. Cubre todo `color: var(--x)` de la piel (el
 * test lo exige) sobre los fondos en los que ese texto se usa. Los fondos con
 * alpha se componen sobre el token opaco que hay debajo.
 */
export const SKIN_CONTRAST_PAIRS: readonly ContrastPair[] = [
  { fg: "--ink", bg: "--bg-0", min: 4.5, usage: "texto principal sobre el fondo base" },
  { fg: "--ink", bg: "--bg-1", min: 4.5, usage: "texto principal sobre el fondo alto" },
  { fg: "--ink", bg: "--surface", min: 4.5, usage: "texto principal sobre superficie sólida" },
  { fg: "--ink", bg: "--card", base: "--bg-1", min: 4.5, usage: "texto principal sobre tarjeta" },
  { fg: "--ink-dim", bg: "--bg-0", min: 4.5, usage: "texto secundario sobre el fondo base" },
  { fg: "--ink-dim", bg: "--bg-1", min: 4.5, usage: "texto secundario sobre el fondo alto" },
  { fg: "--ink-dim", bg: "--card", base: "--bg-1", min: 4.5, usage: "texto secundario sobre tarjeta" },
  { fg: "--ink-meta", bg: "--bg-0", min: 4.5, usage: "texto chico/label sobre el fondo base" },
  { fg: "--ink-meta", bg: "--bg-1", min: 4.5, usage: "texto chico/label sobre el fondo alto" },
  { fg: "--ink-meta", bg: "--card", base: "--bg-1", min: 4.5, usage: "texto chico/label sobre tarjeta (caso AA documentado 4,79:1)" },
  { fg: "--ink-grey", bg: "--bg-0", min: 4.5, usage: "nodo en desarrollo de la constelación" },
  { fg: "--teal", bg: "--bg-0", min: 4.5, usage: "acento teal: labels, numeración y links" },
  { fg: "--teal", bg: "--bg-1", min: 4.5, usage: "acento teal sobre el fondo alto" },
  { fg: "--gold", bg: "--bg-0", min: 4.5, usage: "acento dorado: notas y subtítulos" },
  { fg: "--gold", bg: "--card", base: "--bg-1", min: 4.5, usage: "acento dorado sobre tarjeta" },
  { fg: "--bg-0", bg: "--teal", min: 4.5, usage: "skip-link: texto oscuro sobre píldora teal" },
  { fg: "--print-ink", bg: "--print-paper", min: 4.5, usage: "texto del CV impreso sobre papel" },
  { fg: "--print-meta", bg: "--print-paper", min: 4.5, usage: "metadatos del CV impreso sobre papel" },
  { fg: "--ink-faint", bg: "--bg-0", min: 4.5, usage: "código de la traza de procedencia (hero) sobre el fondo base" }
];

/**
 * DEUDA AA declarada (#130). El único par que hoy NO llega a 4,5:1 es
 * `--ink-faint` usado como `color:` en `.hero-provenance code` (10px). El
 * comentario del bloque de tokens dice que el token «sólo decora», pero el CSS
 * lo usa como texto: esa contradicción es el hallazgo, no una excepción.
 *
 * Corregirlo exige cambiar el render (usar `--ink-meta`), que I1 prohíbe en
 * esta fase: no se fuerza, se declara. Cuando el par cumpla, el test falla
 * pidiendo borrar esta entrada.
 */
export const AA_DEBT: readonly ContrastDebt[] = [
  {
    fg: "--ink-faint",
    bg: "--bg-0",
    min: 4.5,
    reason:
      "3,63:1 en .hero-provenance code: el token declarado como decoración se usa como texto; " +
      "corregirlo mueve el render (I1), se resuelve al levantar el congelamiento"
  }
];

/** Resuelve un par declarado contra el mapa de tokens de la piel. */
export function resolvePair(pair: ContrastPair, tokens: ReadonlyMap<string, string>): number {
  const read = (name: string): Rgba => {
    const value = tokens.get(name);
    if (!value) throw new Error(`contraste: el par usa un token inexistente: ${name}`);
    return parseColor(value);
  };
  const bg = pair.base ? composite(read(pair.bg), read(pair.base)) : read(pair.bg);
  return contrastRatio(read(pair.fg), bg);
}
