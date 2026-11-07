/**
 * CONTRASTE de la piel `ingenieria` (SPEC §5.6 · ADR-001 I5).
 *
 * La piel declara PARES texto/fondo —no sólo colores— y cada par declara su
 * umbral y la PILA de fondos con alpha que hay debajo (`bases`). El gate `themes:check` resuelve los tokens contra `skin.css` y calcula WCAG.
 * Consecuencia buscada: cambiar un token mueve el ratio y el gate lo ve sin que
 * nadie tenga que acordarse de recalcular a mano.
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
  /** Token de fondo (el más cercano al texto); puede tener alpha. */
  readonly bg: string;
  /**
   * Pila opaca DEBAJO de `bg`, de abajo hacia arriba. `["--bg-1", "--card"]`
   * significa `--card` sobre `--bg-1`. Sin `bases`, `bg` es opaco.
   *
   * Existe porque un par por tokens no modela un chip: `.status-paused` pinta
   * `--ink-meta-10` sobre la tarjeta, y el fondo efectivo es tinte → card →
   * bg-1. Declarar sólo `--ink-meta`/`--card` mide una superficie que el texto
   * nunca ve (F1 del pase fresco de #130).
   */
  readonly bases?: readonly string[];
  /** Umbral WCAG: 4,5 texto normal; 3 texto grande o pieza de UI. */
  readonly min: number;
  /** Para qué se usa el par; una razón, no un label. */
  readonly usage: string;
}

export interface ContrastDebt {
  readonly fg: string;
  readonly bg: string;
  readonly bases?: readonly string[];
  readonly min: number;
  /** Ratio medido del par declarado; el test lo recalcula (no se cita a mano). */
  readonly ratio: number;
  /** Selector real de `skin.css` que usa la combinación. */
  readonly selector: string;
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
 * test lo exige) y todo estado que pinta un tinte detrás de texto (chips,
 * hover, selección): el fondo se modela con su pila real (`bases`), no como si
 * el tinte no existiera. `tintedTextRules()` extrae del CSS las combinaciones
 * de una misma regla y el test falla si alguna no está acá: el universo no se
 * mantiene a mano.
 */
export const SKIN_CONTRAST_PAIRS: readonly ContrastPair[] = [
{ fg: "--ink", bg: "--bg-0", min: 4.5, usage: "texto principal sobre el fondo base" },
  { fg: "--ink", bg: "--bg-1", min: 4.5, usage: "texto principal sobre el fondo alto (peor extremo del gradiente)" },
  { fg: "--ink", bg: "--surface", min: 4.5, usage: "texto principal sobre superficie sólida" },
  { fg: "--ink", bg: "--card", bases: ["--bg-1"], min: 4.5, usage: "texto principal sobre tarjeta" },
  { fg: "--ink-dim", bg: "--bg-0", min: 4.5, usage: "texto secundario sobre el fondo base" },
  { fg: "--ink-dim", bg: "--bg-1", min: 4.5, usage: "texto secundario sobre el fondo alto" },
  { fg: "--ink-dim", bg: "--card", bases: ["--bg-1"], min: 4.5, usage: "texto secundario sobre tarjeta" },
  { fg: "--ink-meta", bg: "--bg-0", min: 4.5, usage: "texto chico/label sobre el fondo base" },
  { fg: "--ink-meta", bg: "--bg-1", min: 4.5, usage: "texto chico/label sobre el fondo alto" },
  { fg: "--ink-meta", bg: "--card", bases: ["--bg-1"], min: 4.5, usage: "texto chico/label sobre tarjeta (AA 4,79:1 documentado)" },
  { fg: "--ink-grey", bg: "--bg-0", min: 4.5, usage: "nodo en desarrollo de la constelación" },
  { fg: "--teal", bg: "--bg-0", min: 4.5, usage: "acento teal: labels, numeración y links" },
  { fg: "--teal", bg: "--bg-1", min: 4.5, usage: "acento teal sobre el fondo alto" },
  { fg: "--gold", bg: "--bg-0", min: 4.5, usage: "acento dorado: notas y subtítulos" },
  { fg: "--gold", bg: "--card", bases: ["--bg-1"], min: 4.5, usage: "acento dorado sobre tarjeta" },
  { fg: "--bg-0", bg: "--teal", min: 4.5, usage: "skip-link: texto oscuro sobre píldora teal" },
  { fg: "--print-ink", bg: "--print-paper", min: 4.5, usage: "texto del CV impreso sobre papel" },
  { fg: "--print-meta", bg: "--print-paper", min: 4.5, usage: "metadatos del CV impreso sobre papel" },
  { fg: "--ink-faint", bg: "--bg-1", min: 4.5, usage: "código de la traza de procedencia (hero)" },
  { fg: "--teal", bg: "--teal-10", bases: ["--bg-1", "--card"], min: 4.5, usage: ".status-active: teal sobre su propio tinte al 10%" },
  { fg: "--gold", bg: "--gold-10", bases: ["--bg-1", "--card"], min: 4.5, usage: ".status-private: gold sobre su propio tinte al 10%" },
  { fg: "--ink-meta", bg: "--ink-meta-10", bases: ["--bg-1", "--card"], min: 4.5, usage: ".status-paused: ink-meta sobre su propio tinte al 10%" },
  { fg: "--ink-meta", bg: "--gold-05", bases: ["--bg-1", "--card"], min: 4.5, usage: ".project-falta: ink-meta sobre el tinte dorado del bloque de deuda" },
  { fg: "--gold", bg: "--gold-05", bases: ["--bg-1", "--card"], min: 4.5, usage: ".project-falta-label: gold sobre el tinte dorado del bloque" },
  { fg: "--teal", bg: "--teal-12", bases: ["--bg-1", "--bg-0-88"], min: 4.5, usage: ".nav-dot.active / #btn-skip-intro:hover: teal sobre tinte al 12% sobre el HUD" },
  { fg: "--ink", bg: "--white-03", bases: ["--bg-1", "--bg-0-88"], min: 4.5, usage: ".nav-dot:hover: ink sobre blanco 3% sobre el HUD" },
  { fg: "--teal", bg: "--white-03", bases: ["--bg-1", "--bg-0-88"], min: 4.5, usage: "#btn-sound:hover: teal sobre blanco 3% sobre el HUD" },
  { fg: "--ink-dim", bg: "--teal-06", bases: ["--bg-0"], min: 4.5, usage: "#btn-skip-intro: ink-dim sobre tinte teal al 6% del loader" },
  { fg: "--ink-dim", bg: "--gold-06", bases: ["--bg-1", "--white-012"], min: 4.5, usage: ".timeline-note: ink-dim sobre tinte dorado sobre el showcase" },
  { fg: "--gold", bg: "--gold-06", bases: ["--bg-1", "--white-012"], min: 4.5, usage: ".timeline-note strong: gold sobre tinte dorado sobre el showcase" },
  { fg: "--ink-dim", bg: "--teal-03", bases: ["--bg-1", "--card"], min: 4.5, usage: ".entry:hover .entry-body: ink-dim sobre tinte teal al 3% sobre tarjeta" },
  { fg: "--ink", bg: "--teal-03", bases: ["--bg-1", "--card"], min: 4.5, usage: ".entry:hover .entry-title: ink sobre tinte teal al 3% sobre tarjeta" },
  { fg: "--ink-meta", bg: "--teal-03", bases: ["--bg-1", "--card"], min: 4.5, usage: ".entry:hover .entry-org: ink-meta sobre tinte teal al 3% sobre tarjeta" },
  { fg: "--teal", bg: "--teal-03", bases: ["--bg-1", "--card"], min: 4.5, usage: ".entry:hover .entry-period: teal sobre tinte teal al 3% sobre tarjeta" },
  { fg: "--ink-dim", bg: "--teal-04", bases: ["--bg-1", "--card"], min: 4.5, usage: ".skill-block:hover: ink-dim sobre tinte teal al 4% sobre tarjeta" },
  { fg: "--teal", bg: "--teal-04", bases: ["--bg-1", "--card"], min: 4.5, usage: ".skill-block:hover .skill-label: teal sobre tinte teal al 4%" },
  { fg: "--gold", bg: "--teal-04", bases: ["--bg-1", "--card"], min: 4.5, usage: ".project-card:hover .project-note: gold sobre tinte teal al 4%" },
  { fg: "--ink-dim", bg: "--teal-05", bases: ["--bg-1", "--card"], min: 4.5, usage: ".drahma-cell:hover: ink-dim sobre tinte teal al 5% sobre tarjeta" },
  { fg: "--teal", bg: "--teal-05", bases: ["--bg-1", "--card"], min: 4.5, usage: ".drahma-cell:hover .drahma-cell-label: teal sobre tinte teal al 5%" },
  { fg: "--ink", bg: "--teal-28", bases: ["--bg-1", "--card"], min: 4.5, usage: "::selection: ink sobre la selección teal al 28%" },
  { fg: "--ink-dim", bg: "--white-012", bases: ["--bg-1"], min: 4.5, usage: ".contact-link: ink-dim sobre blanco 1,2%" },
  { fg: "--ink-meta", bg: "--teal-04", bases: ["--bg-1"], min: 4.5, usage: ".pub-thumb.error: ink-meta sobre tinte teal al 4%" },
  { fg: "--ink-meta", bg: "--teal-06", bases: ["--bg-1"], min: 4.5, usage: ".pub-thumb-placeholder: ink-meta sobre tinte teal al 6%" },
  { fg: "--ink", bg: "--bg-0-90", bases: ["--bg-1", "--black-35"], min: 4.5, usage: ".gallery-caption: ink sobre el degradado oscuro del slot" },
  { fg: "--ink", bg: "--bg-tip-96", bases: ["--bg-1"], min: 4.5, usage: "#graph-tip: ink sobre el tooltip del grafo" },
  { fg: "--teal", bg: "--teal-09", bases: ["--bg-1"], min: 4.5, usage: "#btn-download: teal sobre tinte teal al 9%" },
  { fg: "--teal", bg: "--teal-18", bases: ["--bg-1"], min: 4.5, usage: "#btn-download:hover: teal sobre tinte teal al 18%" },
];

/**
 * DEUDA AA de `ingenieria`: NINGUNA. La piel nace sin excepciones de contraste
 * (a diferencia de `museo`, cuyas tres deudas son del render congelado de I1).
 * Si un par futuro no llega a AA, se declara acá con ratio medido y selector;
 * el gate borra la deuda sola cuando el par empieza a cumplir.
 */
export const AA_DEBT: readonly ContrastDebt[] = [];

/** Resuelve un par declarado contra el mapa de tokens de la piel. */
export function resolvePair(pair: ContrastPair, tokens: ReadonlyMap<string, string>): number {
  const read = (name: string): Rgba => {
    const value = tokens.get(name);
    if (!value) throw new Error(`contraste: el par usa un token inexistente: ${name}`);
    return parseColor(value);
  };
  const bases = pair.bases ?? [];
  let bg = read(bases.length > 0 ? bases[0] : pair.bg);
  for (const base of bases.slice(1)) bg = composite(read(base), bg);
  if (bases.length > 0) bg = composite(read(pair.bg), bg);
  return contrastRatio(read(pair.fg), bg);
}
