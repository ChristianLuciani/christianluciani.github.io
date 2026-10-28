#!/usr/bin/env node
/**
 * contraste.mjs — ratios de contraste de las dos paletas (issue #89).
 *
 * Determinista y sin dependencias: los ratios de la NOTA salen de acá, no a ojo.
 * Fórmula WCAG 2.1 §relative luminance y §contrast ratio.
 *
 * Uso: node proposals/estilo-lab/contraste.mjs
 */
const hex = (h) => {
  const v = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
};
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (fg, bg) => {
  const [a, b] = [lum(hex(fg)), lum(hex(bg))].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};
/** alpha-blend de un color con alfa sobre una base opaca (tarjetas del sitio). */
const blend = (fg, alpha, bg) => {
  const [f, b] = [hex(fg), hex(bg)];
  return (
    "#" +
    f
      .map((c, i) => Math.round((c * alpha + b[i] * (1 - alpha)) * 255))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
};

const BGS = {
  "--bg-0 (sitio: --night)": "#050810",
  "--bg-1 (sitio: --deep)": "#0b1120",
  "tarjeta del prototipo": blend("#ffffff", 0.016, "#0b1120"),
  "tarjeta del sitio (surface)": "#111827",
};

const FGS = {
  /* laboratorio */
  "lab --ink": "#e7edf6",
  "lab --ink-dim": "#8b9bb0",
  "lab --ink-faint": "#5b6a7e",
  "lab --ink-meta (ajuste AA)": "#75849a",
  /* sitio */
  "--text del sitio": "#d6dde8",
  "--muted del sitio": "#6b7a8d",
  /* acentos compartidos por las dos superficies */
  "--teal (ambos)": "#00c9c0",
  "--gold (ambos)": "#c9a84c",
  "--ice (lab)": "#7ad7ff",
  "--coral (lab)": "#ff8a70",
};

const verdict = (r) => (r >= 4.5 ? "AA" : r >= 3 ? "solo texto grande (AA-Large)" : "BAJO — no usar para texto");

console.log(`# Contraste WCAG 2.1 (AA normal = 4.5 · AA texto grande = 3.0)\n`);
const head = ["texto", ...Object.keys(BGS)];
console.log(`| ${head.join(" | ")} |`);
console.log(`|${head.map(() => "---").join("|")}|`);
for (const [fname, fg] of Object.entries(FGS)) {
  const cells = Object.values(BGS).map((bg) => `${ratio(fg, bg).toFixed(2)} (${verdict(ratio(fg, bg))})`);
  console.log(`| \`${fname}\` ${fg} | ${cells.join(" | ")} |`);
}

console.log(`\n## Pares reales del prototipo (lo que se ve)\n`);
const PAIRS = [
  ["cuerpo del prototipo: --ink-dim sobre tarjeta", "#8b9bb0", blend("#ffffff", 0.016, "#0b1120")],
  ["nota: --gold sobre tarjeta", "#c9a84c", blend("#ffffff", 0.016, "#0b1120")],
  ["meta: --ink-meta sobre tarjeta (usado)", "#75849a", blend("#ffffff", 0.016, "#0b1120")],
  ["meta: --ink-faint sobre tarjeta (descartado)", "#5b6a7e", blend("#ffffff", 0.016, "#0b1120")],
  ["etiqueta: --teal sobre --bg-0", "#00c9c0", "#050810"],
  ["cuerpo del sitio: --text sobre --night", "#d6dde8", "#050810"],
  ["tagline del sitio: --muted sobre --night", "#6b7a8d", "#050810"],
  ["nota del sitio: --gold sobre tarjeta", "#c9a84c", "#1c2130"],
];
for (const [name, fg, bg] of PAIRS) {
  const r = ratio(fg, bg);
  console.log(`- ${name}: **${r.toFixed(2)}** → ${verdict(r)}`);
}
