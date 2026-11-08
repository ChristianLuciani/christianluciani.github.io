/**
 * GOLDEN — secciones del HTML generado, para localizar un cambio de render.
 *
 * `assembleHtml()` concatena bloques en un orden fijo (head, print, cover, hero,
 * plano, salas, footer). Este módulo corta la salida por los marcadores que
 * abren cada bloque y devuelve las secciones con nombre. Un refactor que mueve
 * código sin cambiar el render produce secciones byte-idénticas; uno que cambia
 * el render falla en la sección exacta, no en un diff de 140 KB.
 *
 * No conoce el contenido: si un marcador desaparece, `sectionsOf` tira con el
 * nombre del bloque que falta — un cambio estructural es un fallo visible.
 */

export interface Section {
  name: string;
  html: string;
}

/** Marcadores de apertura en el orden en que `assembleHtml()` los emite. */
const FIXED_STARTS: { name: string; marker: string }[] = [
  { name: "print-cv", marker: '<div id="print-cv"' },
  // Variante EN del print (#160): bloque hermano, mismo layout, texto EN.
  { name: "print-cv-en", marker: '<div id="print-cv-en"' },
  { name: "cover", marker: '<header class="hud">' },
  { name: "hero", marker: '<section id="hero">' },
  { name: "plano", marker: '<section id="room-plano">' }
];

const ROOM_START = /<section class="room[^"]*" id="room-([a-z]+)">/g;
const BODY_CLOSE = "</body>";

/**
 * Secciones del documento, en orden. La primera (`head`) incluye doctype, meta,
 * JSON-LD y el `<style>` global; la última (`footer`) es el cierre del body.
 */
export function sectionsOf(html: string): Section[] {
  const marks: { name: string; at: number }[] = [{ name: "head", at: 0 }];

  for (const { name, marker } of FIXED_STARTS) {
    const at = html.indexOf(marker);
    if (at < 0) throw new Error(`golden: falta el marcador de la sección "${name}": ${marker}`);
    marks.push({ name, at });
  }

  for (const match of html.matchAll(ROOM_START)) {
    marks.push({ name: `sala-${match[1]}`, at: match.index ?? -1 });
  }

  const close = html.indexOf(BODY_CLOSE);
  if (close < 0) throw new Error(`golden: el documento no cierra el body (${BODY_CLOSE})`);
  marks.push({ name: "footer", at: close });

  // Sin `sort`: los marcadores se empujan en el orden en que `assembleHtml()`
  // los emite, y ordenarlos antes de validar dejaba el chequeo muerto (siempre
  // pasaba). Un reordenamiento real tiene que fallar acá, no rotular mal.
  for (let i = 1; i < marks.length; i += 1) {
    if (marks[i].at <= marks[i - 1].at) {
      throw new Error(`golden: marcadores fuera de orden (${marks[i - 1].name} ≥ ${marks[i].name})`);
    }
  }

  return marks.map((mark, i) => ({
    name: mark.name,
    html: html.slice(mark.at, i + 1 < marks.length ? marks[i + 1].at : html.length)
  }));
}

export interface Drift {
  section: string;
  /** Línea 1-based dentro de la sección. */
  line: number;
  expected: string;
  actual: string;
}

/** Primer punto de divergencia entre dos textos, con la línea y su contenido. */
export function firstDiff(expected: string, actual: string, section = "documento"): Drift | null {
  if (expected === actual) return null;

  const max = Math.min(expected.length, actual.length);
  let at = 0;
  while (at < max && expected[at] === actual[at]) at += 1;

  const line = expected.slice(0, at).split("\n").length;
  const lineOf = (text: string): string => {
    const start = text.lastIndexOf("\n", Math.max(0, at - 1)) + 1;
    const end = text.indexOf("\n", Math.max(at, start));
    return text.slice(start, end < 0 ? text.length : end);
  };

  return { section, line, expected: lineOf(expected), actual: lineOf(actual) };
}

/** Deriva por sección entre dos documentos; vacío cuando el render no cambió. */
export function sectionDrifts(golden: string, live: string): Drift[] {
  const g = sectionsOf(golden);
  let l: Section[];
  try {
    l = sectionsOf(live);
  } catch (error) {
    // Un marcador que desaparece es un cambio estructural: se reporta como
    // deriva (con el motivo) en vez de reventar el test con un stack trace.
    return [
      {
        section: "estructura",
        line: 0,
        expected: g.map((s) => s.name).join(" · "),
        actual: `no se pudo cortar el documento: ${(error as Error).message}`
      }
    ];
  }
  const drifts: Drift[] = [];

  if (g.length !== l.length) {
    const gNames = new Set(g.map((s) => s.name));
    const lNames = new Set(l.map((s) => s.name));
    const missing = [...gNames].filter((n) => !lNames.has(n));
    const extra = [...lNames].filter((n) => !gNames.has(n));
    drifts.push({
      section: "estructura",
      line: 0,
      expected: g.map((s) => s.name).join(" · "),
      actual: l.map((s) => s.name).join(" · ") + ` (faltan: ${missing.join(",") || "—"}; sobran: ${extra.join(",") || "—"})`
    });
    return drifts;
  }

  g.forEach((section, i) => {
    const drift = firstDiff(section.html, l[i].html, section.name);
    if (drift) drifts.push(drift);
  });
  return drifts;
}

/**
 * Recorta dos líneas alrededor del punto donde divergen.
 *
 * Cortar desde el inicio (las primeras N columnas) hacía que, en líneas largas,
 * esperado y actual se vieran idénticos: el mensaje perdía justo el carácter
 * que cambió. Se quita el prefijo común y se conserva contexto a cada lado.
 */
function clip(expected: string, actual: string, width = 160): [string, string] {
  const max = Math.min(expected.length, actual.length);
  let start = 0;
  while (start < max && expected[start] === actual[start]) start += 1;
  const lead = Math.max(0, start - 40);
  const from = lead;
  const to = start + width;
  const cut = (text: string): string =>
    `${lead > 0 ? "…" : ""}${text.slice(from, to)}${to < text.length ? "…" : ""}`;
  return [cut(expected), cut(actual)];
}

/** Mensaje accionable a partir de una deriva. */
export function describeDrift(d: Drift): string {
  const [expected, actual] = clip(d.expected, d.actual);
  return (
    `sección "${d.section}" cambió en la línea ${d.line}\n` +
    `  esperado: ${expected}\n` +
    `  actual:   ${actual}`
  );
}
