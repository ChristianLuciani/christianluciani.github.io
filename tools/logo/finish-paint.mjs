/**
 * finish-paint.mjs — la PINTURA del acabado de la C en el DOM (#91, #100/F1).
 *
 * El bloque del acabado de `verify-dom-fidelity.mjs` comparaba sólo
 * DECLARACIONES de `defs` (stops de `c-perp-*`/`c-tint-*`, `stdDeviation` de
 * `c-bloom`): si el DOM dejaba de pintar el barrido, el recorte de la
 * bisectriz o el glow, el gate seguía verde. Medido el 2026-10-27 contra
 * `main` @ `8c2a110`: las cuatro mutaciones del issue #91 —ADAPTADAS al render
 * real, porque el HTML arma ese DOM por JS y el `perl` del issue apunta a
 * markup que no existe— daban exit 0.
 *
 * Esta pieza es la mitad que faltaba, y vive acá —pura, sin Chrome— para que
 * las mutaciones se prueben en CI sin depender del binario. La referencia
 * adjunta NO alcanza: una capa que conserva `fill`/`clip-path` y no dibuja
 * nada es el mismo defecto una vuelta más adentro (F1 del pase fresco de
 * #100). Por eso cada pieza exige geometría dibujable:
 *   · cada brazo `k` de `.c-band` se recorta con `clip-path="url(#c-clip-k)"`
 *     y ese `clipPath` contiene al menos un nodo de geometría (un `path` con
 *     forma real, o un rect/circle/polygon/…);
 *   · dentro de ese recorte hay un path `fill="url(#c-perp-k)"` (bisel) y uno
 *     `fill="url(#c-tint-k)"` (barrido) cuyo `d` tiene un moveto, al menos un
 *     segmento de dibujo y más de un punto (no `d="M 0 0"`);
 *   · el nodo de `.c-glow` lleva `filter="url(#c-bloom)"` y su `d` también
 *     dibuja;
 *   · cada `c-perp-k` tiene eje real (`x1≠x2 || y1≠y2`): un gradiente sin
 *     dirección no produce volumen aunque sus stops sean correctos.
 *
 * Anclaje deliberado en REFERENCIAS (`url(#…)`, `filter`, ejes) y en la
 * DIBUJABILIDAD del `d`, nunca en el markup literal ni en la forma concreta:
 * un refactor sin cambio visual no puede poner el gate rojo. Los mensajes
 * dicen QUÉ falta, no sólo que algo difiere — el mismo contrato que el resto
 * del gate.
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

/* ── dibujabilidad de un `d` ─────────────────────────────────────────────
   Un path con `d="M 0 0"` no dibuja: tiene moveto pero ningún segmento. Un
   `M 0 0 L 0 0` tampoco: todos sus puntos son el mismo. El chequeo no ata la
   FORMA (un contorno distinto pero real sigue siendo geometría); sólo exige
   que haya algo que pintar. */
const isCommand = (token) => /^[a-zA-Z]$/.test(token);

/**
 * `pathProblem(d)` → motivo por el que el `d` no dibuja nada (null si dibuja).
 * Parser mínimo de path data: comando + argumentos, con la repetición implícita
 * del estándar SVG (después de un moveto, pares sueltos son linetos).
 */
export function pathProblem(d) {
  if (typeof d !== "string" || d.trim() === "") return "no declara d";
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  let i = 0, cmd = null, x = 0, y = 0, sx = 0, sy = 0, movetos = 0, draws = 0;
  const pts = new Set();
  const num = () => {
    const v = Number(toks[i++]);
    return Number.isFinite(v) ? v : NaN;
  };
  const args = (n) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      const v = num();
      if (!Number.isFinite(v)) return null;
      out.push(v);
    }
    return out;
  };
  while (i < toks.length) {
    if (isCommand(toks[i])) {
      cmd = toks[i++];
    } else if (!cmd) {
      return "d inválido (número sin comando)";
    }
    const rel = cmd === cmd.toLowerCase();
    switch (cmd) {
      case "M": case "m": {
        const a = args(2);
        if (!a) return "d incompleto (moveto sin coordenadas)";
        x = rel ? x + a[0] : a[0];
        y = rel ? y + a[1] : a[1];
        sx = x; sy = y;
        pts.add(`${x},${y}`);
        movetos++;
        cmd = rel ? "l" : "L"; // pares siguientes = lineto implícito (spec)
        break;
      }
      case "L": case "l": {
        const a = args(2);
        if (!a) return "d incompleto (lineto sin coordenadas)";
        x = rel ? x + a[0] : a[0];
        y = rel ? y + a[1] : a[1];
        pts.add(`${x},${y}`); draws++;
        break;
      }
      case "H": case "h": {
        const a = args(1);
        if (!a) return "d incompleto (horizontal lineto sin coordenada)";
        x = rel ? x + a[0] : a[0];
        pts.add(`${x},${y}`); draws++;
        break;
      }
      case "V": case "v": {
        const a = args(1);
        if (!a) return "d incompleto (vertical lineto sin coordenada)";
        y = rel ? y + a[0] : a[0];
        pts.add(`${x},${y}`); draws++;
        break;
      }
      case "C": case "c": case "S": case "s": case "Q": case "q": {
        const a = args(cmd === "C" || cmd === "c" ? 6 : 4);
        if (!a) return "d incompleto (curva sin coordenadas)";
        // el endpoint es el último par; los de control no cambian el extremo
        x = rel ? x + a[a.length - 2] : a[a.length - 2];
        y = rel ? y + a[a.length - 1] : a[a.length - 1];
        pts.add(`${x},${y}`); draws++;
        break;
      }
      case "T": case "t": {
        const a = args(2);
        if (!a) return "d incompleto (curva suave sin coordenadas)";
        x = rel ? x + a[0] : a[0];
        y = rel ? y + a[1] : a[1];
        pts.add(`${x},${y}`); draws++;
        break;
      }
      case "A": case "a": {
        const a = args(7);
        if (!a) return "d incompleto (arco sin coordenadas)";
        x = rel ? x + a[5] : a[5];
        y = rel ? y + a[6] : a[6];
        pts.add(`${x},${y}`); draws++;
        break;
      }
      case "Z": case "z":
        x = sx; y = sy;
        pts.add(`${x},${y}`); draws++;
        cmd = null; // después de cerrar hace falta comando explícito
        break;
      default:
        return `d inválido (comando "${cmd}")`;
    }
  }
  if (movetos === 0) return "d sin moveto";
  if (draws === 0) return "d sin segmento de dibujo";
  if (pts.size < 2) return "d degenerado (un solo punto)";
  return null;
}

/** Tags `<path>` de `text` cuyo `fill` referencia `ref`, como atributos. */
function pathsWithFill(text, ref) {
  const re = new RegExp(`<path\\b[^>]*\\bfill="url\\(#${ref}\\)"[^>]*>`, "g");
  return [...text.matchAll(re)].map((m) => attrsOf(m[0]));
}

/**
 * Motivo por el que un `fill=url(#ref)` no PINTA geometría (null si pinta).
 * No basta con que exista el path: su `d` tiene que dibujar algo.
 */
function fillProblem(text, ref) {
  const tags = pathsWithFill(text, ref);
  if (!tags.length) return `falta un path con fill="url(#${ref})"`;
  const problems = tags.map((t) => pathProblem(t.d)).filter(Boolean);
  if (problems.length === tags.length) {
    return `el path con fill="url(#${ref})" no dibuja geometría (${problems[0]})`;
  }
  return null;
}

/** Nodos de geometría que puede contener un `clipPath`. */
const GEOMETRY_NODE = /<(path|rect|polygon|circle|ellipse|line|polyline)\b[^>]*>/g;

/** Motivo por el que un `clipPath` no recorta nada (null si recorta). */
function clipPathProblem(dump, k) {
  const m = new RegExp(`<clipPath\\b[^>]*\\bid="c-clip-${k}"[^>]*>([\\s\\S]*?)</clipPath>`).exec(dump);
  if (!m) return `falta el clipPath id="c-clip-${k}" en defs`;
  const nodes = [...m[1].matchAll(GEOMETRY_NODE)];
  if (!nodes.length) return `el clipPath c-clip-${k} está vacío (sin nodo de geometría)`;
  const paintable = nodes.some((n) => {
    if (n[1] !== "path") return true;
    return pathProblem(attrsOf(n[0]).d) === null;
  });
  if (!paintable) return `el clipPath c-clip-${k} no aporta geometría dibujable (${pathProblem(attrsOf(nodes[0][0]).d)})`;
  return null;
}

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
 * de la versión áurea (array vacío = el acabado se pinta con geometría real;
 * los números del acabado viven en las referencias del DOM y la FORMA
 * dibujada no se compara).
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
      const perp = fillProblem(clip, `c-perp-${k}`);
      if (perp) findings.push(`el volumen del brazo ${k} no se pinta: ${perp} dentro de c-clip-${k}`);
      const tint = fillProblem(clip, `c-tint-${k}`);
      if (tint) findings.push(`el barrido del brazo ${k} no se pinta: ${tint} dentro de c-clip-${k}`);
    }
  }

  for (const k of [1, 2]) {
    const why = clipPathProblem(dump, k);
    if (why) findings.push(`el recorte de la C no aplica: ${why}`);
  }

  const glow = glowOf(dump);
  if (!glow) {
    findings.push("la C no tiene el grupo .c-glow: el bloom del acabado no se puede verificar");
  } else {
    const filtered = [...glow.matchAll(/<path\b[^>]*\bfilter="url\(#c-bloom\)"[^>]*>/g)].map((m) => attrsOf(m[0]));
    if (!filtered.length) {
      findings.push('el glow de la C no se pinta: el nodo dentro de .c-glow no lleva filter="url(#c-bloom)"');
    } else {
      const problems = filtered.map((t) => pathProblem(t.d)).filter(Boolean);
      if (problems.length === filtered.length) {
        findings.push(`el glow de la C no dibuja geometría (${problems[0]})`);
      }
    }
  }

  for (const k of [1, 2]) {
    const why = axisProblem(gradientOf(dump, `c-perp-${k}`));
    if (why) findings.push(`el bisel c-perp-${k} ${why}: un gradiente sin dirección no pinta el volumen`);
  }

  return findings;
}
