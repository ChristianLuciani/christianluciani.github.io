/**
 * finish-paint.mjs — la PINTURA del acabado de la C en el DOM (#91).
 *
 * El bloque del acabado de `verify-dom-fidelity.mjs` comparaba sólo
 * DECLARACIONES de `defs` (stops de `c-perp-*`/`c-tint-*`, `stdDeviation` de
 * `c-bloom`): si el DOM dejaba de pintar el barrido, el recorte de la
 * bisectriz o el glow, el gate seguía verde. Medido el 2026-10-27 contra
 * `main` @ `8c2a110`: las cuatro mutaciones del issue #91 daban exit 0.
 *
 * Esta pieza es la mitad que faltaba, y vive acá —pura, sin Chrome— para que
 * las mutaciones se prueben en CI sin depender del binario:
 *   · cada brazo `k` de `.c-band` se recorta con `clip-path="url(#c-clip-k)"`;
 *   · dentro de ese recorte hay un path `fill="url(#c-perp-k)"` (bisel) y un
 *     path `fill="url(#c-tint-k)"` (barrido): la referencia se PINTA, no sólo
 *     se declara;
 *   · el nodo de `.c-glow` lleva `filter="url(#c-bloom)"`;
 *   · cada `c-perp-k` tiene eje real (`x1≠x2 || y1≠y2`): un gradiente sin
 *     dirección no produce volumen aunque sus stops sean correctos.
 *
 * Anclaje deliberado en REFERENCIAS (`url(#…)`, `filter`, ejes del gradiente)
 * y no en el markup literal: un refactor sin cambio visual no puede poner el
 * gate rojo (ADR-lite del issue). Los mensajes dicen QUÉ falta, no sólo que
 * algo difiere — el mismo contrato que el resto del gate.
 */

/** Atributos de una etiqueta serializada por Chrome (`<tag a="b" …>`). */
const attrsOf = (tag) => {
  const attrs = {};
  for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
};

/**
 * `groupText(dump, openRe)` → el grupo que abre `openRe` con TODO su contenido
 * y su `</g>` de cierre (null si no existe). Recorre anidando: un `</g>` a
 * secas cortaría en el primer grupo interno, y el c-band tiene dos.
 */
export function groupText(dump, openRe) {
  const m = openRe.exec(dump);
  if (!m) return null;
  const start = m.index;
  const tags = /<g\b[^>]*>|<\/g>/g;
  tags.lastIndex = start;
  let depth = 0;
  for (let t = tags.exec(dump); t; t = tags.exec(dump)) {
    if (t[0] === "</g>") {
      depth--;
      if (depth === 0) return dump.slice(start, t.index + "</g>".length);
    } else {
      depth++;
    }
  }
  return null;
}

const bandOf = (dump) => groupText(dump, /<g\b[^>]*\bclass="c-band"[^>]*>/);
const glowOf = (dump) => groupText(dump, /<g\b[^>]*\bclass="c-glow"[^>]*>/);
const clipGroupOf = (band, k) =>
  groupText(band, new RegExp(`<g\\b[^>]*clip-path="url\\(#c-clip-${k}\\)"[^>]*>`));
const paintsFill = (text, ref) => new RegExp(`<path\\b[^>]*fill="url\\(#${ref}\\)"`).test(text);

/** Gradiente lineal por id, con sus atributos (null si no está). */
function gradientOf(dump, id) {
  for (const m of dump.matchAll(/<linearGradient\b[^>]*>/g)) {
    const attrs = attrsOf(m[0]);
    if (attrs.id === id) return attrs;
  }
  return null;
}

/** Eje real: los cuatro valores existen y (x1≠x2 || y1≠y2). */
function axisProblem(attrs) {
  const p = (key) => parseFloat(attrs?.[key]);
  const [x1, y1, x2, y2] = [p("x1"), p("y1"), p("x2"), p("y2")];
  if (![x1, y1, x2, y2].every(Number.isFinite)) return "no declara el eje (x1/y1/x2/y2)";
  if (x1 === x2 && y1 === y2) return "tiene un eje degenerado (x1==x2 y y1==y2)";
  return null;
}

/**
 * `finishPaintFindings(dump)` → diferencias de PINTURA del acabado en el DOM
 * de la versión áurea (array vacío = el acabado se pinta como lo pide
 * `cFinish`; los números ya viven en las referencias del DOM).
 */
export function finishPaintFindings(dump) {
  const findings = [];
  const band = bandOf(dump);
  if (!band) {
    findings.push("la C no tiene el grupo .c-band: no se puede verificar la pintura del acabado");
  } else {
    for (const k of [1, 2]) {
      const clip = clipGroupOf(band, k);
      if (!clip) {
        findings.push(`la C no recorta el brazo ${k}: falta el grupo clip-path="url(#c-clip-${k})" dentro de .c-band`);
        continue;
      }
      if (!paintsFill(clip, `c-perp-${k}`))
        findings.push(`el volumen del brazo ${k} no se pinta: falta un path con fill="url(#c-perp-${k})" dentro de c-clip-${k}`);
      if (!paintsFill(clip, `c-tint-${k}`))
        findings.push(`el barrido del brazo ${k} no se pinta: falta un path con fill="url(#c-tint-${k})" dentro de c-clip-${k}`);
    }
  }

  const glow = glowOf(dump);
  if (!glow) {
    findings.push("la C no tiene el grupo .c-glow: el bloom del acabado no se puede verificar");
  } else if (!/<path\b[^>]*filter="url\(#c-bloom\)"/.test(glow)) {
    findings.push('el glow de la C no se pinta: el nodo dentro de .c-glow no lleva filter="url(#c-bloom)"');
  }

  for (const k of [1, 2]) {
    const why = axisProblem(gradientOf(dump, `c-perp-${k}`));
    if (why) findings.push(`el bisel c-perp-${k} ${why}: un gradiente sin dirección no pinta el volumen`);
  }

  return findings;
}
