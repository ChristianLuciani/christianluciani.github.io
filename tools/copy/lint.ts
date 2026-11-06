/**
 * GATE DE COPY EN TEMPLATES (#127) — cero texto visible hardcodeado.
 *
 * Un template (`src/templates/**`, sin contar sus tests) no puede contener
 * texto visible: pide claves al pack (`t()`/`th()`/`ta()`). Este linter es el
 * diente del invariante. Recorre los literales del AST, reconstruye el HTML
 * que emiten (concatenando chunks en orden de fuente), descarta comentarios
 * HTML, CSS/JS y bloques `<style>`/`<script>`, y reporta dos superficies:
 *
 *   1. TEXTO fuera de tags con más de 2 palabras (un nodo visible);
 *   2. ATRIBUTOS de copy (`aria-label`, `alt`, `title`, `placeholder`,
 *      `data-caption`, `data-aria-es/en` y `content` de `<meta>`) con más de
 *      2 palabras. Un aria-label literal es copy: lo lee un lector de pantalla
 *      y el toggle ES/EN no lo traduce.
 *
 * El umbral > 2 palabras es el que fijó el issue: una o dos (una sigla, `2026`,
 * `EN`) no son copy; un sintagma de tres sí. Los tokens sin letra ni dígito
 * (`·`, `—`) no cuentan como palabra.
 *
 * El texto de un `throw`/`new Error` no es visible: se excluye del scan (un
 * mensaje accionable para el operador no es copy del sitio).
 *
 * LÍMITE DECLARADO DEL INSTRUMENTO. Esto es un lint AST HEURÍSTICO sobre los
 * strings del fuente, no un oráculo del HTML emitido: reconstruye el markup que
 * los literales producirían, pero no ejecuta el render (no conoce lo que
 * devuelven `t()`/SSOT ni resuelve interpolaciones). Un nodo armado con piezas
 * de varios literales, o copy que sólo existe tras una función, puede quedar
 * fuera. Su cierre estructural —stub determinista de `t()`/SSOT + scan del HTML
 * emitido + property test de formas— es un INSTRUMENTO PENDIENTE, no una
 * promesa de este gate. Acá se declara lo que hay, no lo que faltaría.
 *
 * LÍMITE RESIDUAL DE TOKENIZACIÓN. El gate reconoce como separadores la
 * puntuación de prosa `·`, `—`, `–`, `•` y `…` (y las entidades que las
 * producen); las entidades desconocidas cuentan como espacio. Un identificador
 * conserva `-`, `_` y `.` (`profile-as-code` es UN token). Un guion usado como
 * separador de prosa (`uno - dos - tres`) no se cierra acá: es un límite
 * declarado, no un caso pendiente de este gate.
 */
import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface CopyHit {
  file: string;
  /** 1-based, línea del chunk de string que contiene el hit. */
  line: number;
  /** `texto` = nodo visible; `atributo:<nombre>` = copy de accesibilidad/meta. */
  kind: string;
  text: string;
}

/** Palabras mínimas para considerar un segmento copy visible. */
export const MIN_WORDS = 3;

/** Atributos que transportan copy legible (no son técnica ni datos). */
export const COPY_ATTRS = new Set([
  "aria-label",
  "alt",
  "title",
  "placeholder",
  "data-caption",
  "data-aria-es",
  "data-aria-en"
]);

/** Un token cuenta como palabra si tiene al menos una letra o un dígito. */
const WORD = /[\p{L}\p{N}]/u;

/**
 * Entidades HTML que el copy usa de verdad. Se decodifican ANTES del test
 * técnico y del conteo de palabras: una entidad siempre trae `;`, y el filtro
 * técnico descarta líneas con `;` (código/CSS). Sin decodificar, `&amp;`
 * escondía una frase entera — el bypass que cerró el pase 4.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  hairsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  middot: "·",
  bull: "•",
  laquo: "«",
  raquo: "»",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  copy: "©",
  reg: "®",
  trade: "™",
  deg: "°",
  times: "×",
  divide: "÷",
  eacute: "é",
  aacute: "á",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  ntilde: "ñ",
  uuml: "ü",
  ccedil: "ç"
};

/** Decodifica entidades nominales y numéricas (`&#38;`, `&#x26;`). */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-z][a-z0-9]*);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
    // Entidad desconocida ⇒ espacio: no se inventa su carácter, pero tampoco
    // se arrastra el `;` (que parecía código) ni se pegan dos palabras.
    .replace(/&[a-z][a-z0-9]*;/gi, " ");
}

/** Recorta puntuación/símbolos de BORDE de un token (`{opción}`, `diseño;`). */
function trimEdge(token: string): string {
  return token.replace(/^[\p{P}\p{S}]+/u, "").replace(/[\p{P}\p{S}]+$/u, "");
}

/**
 * Tokens-palabra: separación por whitespace (el texto ya viene decodificado,
 * así `&nbsp;`/`&emsp;`/`&ensp;`/`&thinsp;` son espacios reales) y recorte de
 * puntuación de borde. `{ display: grid; }` produce 2 tokens-palabra; una
 * frase de copy produce 3+.
 */
/** Texto decodificado con la puntuación separadora convertida en espacio. */
function normalize(value: string): string {
  return decodeEntities(value)
    // Puntuación que SEPARA palabras en prosa/tipografía, no dentro de un
    // identificador: `·`, `—`, `–`, `•`, `…` (y sus entidades).
    .replace(/[·—–•…]/g, " ");
}

function wordsOf(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .map(trimEdge)
    .filter((word) => WORD.test(word));
}

function isCopy(value: string): boolean {
  return wordsOf(value).length >= MIN_WORDS;
}

/**
 * Descarte de strings TÉCNICAS (no son copy aunque tengan espacios).
 *
 * Clasificación POR TOKEN, no por carácter de la línea: una línea con `=`,
 * `;` o `{}` puede ser copy (`La fórmula es E = mc cuadrado`), así que el
 * filtro no puede mirar caracteres sueltos.
 *  · un token único (import, clave `pub.*`, id, URL sin espacios);
 *  · URL absoluta, path POSIX/relativo o ruta con unidad Windows;
 *  · menos de `MIN_WORDS` tokens-palabra tras el recorte de borde.
 * Se evalúa sobre el texto YA decodificado: `&amp;` es `&`, no `;`.
 */
function isTechnical(value: string): boolean {
  const text = normalize(value).trim();
  if (!text) return true;
  if (!/\s/.test(text)) return true;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return true;
  if (/^(\.{1,2}\/|\/|[A-Za-z]:[\\/])/.test(text)) return true;
  return wordsOf(text).length < MIN_WORDS;
}

function isInsideErrorOrThrow(node: ts.Node): boolean {
  let cur: ts.Node | undefined = node;
  while (cur) {
    if (ts.isThrowStatement(cur)) return true;
    if (
      ts.isNewExpression(cur) &&
      ts.isIdentifier(cur.expression) &&
      cur.expression.text === "Error"
    ) {
      return true;
    }
    cur = cur.parent;
  }
  return false;
}

interface Chunk {
  text: string;
  line: number;
}

/** Chunks de string/template de un archivo, en orden de fuente. */
function chunksOf(file: string, source: string): Chunk[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const chunks: Chunk[] = [];
  function walk(node: ts.Node): void {
    const k = node.kind;
    if (
      k === ts.SyntaxKind.StringLiteral ||
      k === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
      k === ts.SyntaxKind.TemplateHead ||
      k === ts.SyntaxKind.TemplateMiddle ||
      k === ts.SyntaxKind.TemplateTail
    ) {
      if (!isInsideErrorOrThrow(node)) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        const literal = node as unknown as { text: string };
        // TODO literal es candidato, incluido el string plano: un template
        // puede emitirlo por interpolación (`<p>${x}</p>`, `${"copy"}`,
        // `aria-label={"copy"}`) y filtrar por la forma del literal de origen
        // era el bypass del gate. El aislamiento es por chunk (cada uno se
        // concatena con un `\n`) y el ruido técnico se descarta al evaluar la
        // línea, no al recolectar (ver `isTechnical`).
        chunks.push({ text: literal.text, line: line + 1 });
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(sf);
  return chunks;
}

/**
 * HTML con comentarios HTML, CSS/JS y bloques <style>/<script> ENMASCARADOS.
 *
 * El enmascarado PRESERVA LONGITUD: cada carácter removido se reemplaza por un
 * espacio y los `\n` se conservan. Un `clean` que acorta la cadena rompe la
 * correspondencia entre un índice del HTML y la línea del fuente — el defecto
 * que reportaba coordenadas falsas (pase 2, F1).
 */
function maskHtml(html: string): string {
  const mask = (match: string): string => match.replace(/[^\n]/g, " ");
  return html
    .replace(/<!--[\s\S]*?-->/g, mask)
    .replace(/<script[\s\S]*?<\/script>/g, mask)
    .replace(/<style[\s\S]*?<\/style>/g, mask)
    .replace(/\/\*[\s\S]*?\*\//g, mask)
    .replace(/^[ \t]*\/\/[^\n]*$/gm, mask);
}

/** Segmentos de TEXTO fuera de tags, con su offset en el HTML enmascarado. */
function textSegments(masked: string): { start: number; text: string }[] {
  const segments: { start: number; text: string }[] = [];
  let start = 0;
  let inTag = false;
  for (let i = 0; i < masked.length; i++) {
    const c = masked[i];
    if (c === "<") {
      if (!inTag && i > start) segments.push({ start, text: masked.slice(start, i) });
      inTag = true;
      continue;
    }
    if (c === ">") {
      inTag = false;
      start = i + 1;
    }
  }
  if (!inTag && start < masked.length) segments.push({ start, text: masked.slice(start) });
  return segments;
}

/** Hits de copy literal en un archivo. Vacío = el gate pasa. */
export function copyHitsOf(file: string, source: string): CopyHit[] {
  const chunks = chunksOf(file, source);
  let html = "";
  const marks: { start: number; line: number }[] = [];
  for (const chunk of chunks) {
    marks.push({ start: html.length, line: chunk.line });
    html += chunk.text + "\n";
  }
  /**
   * Línea real del fuente para un offset del HTML reconstruido.
   *
   * El offset pertenece al chunk de string que lo contiene; dentro de un
   * template multilínea, cada `\n` del texto avanza una línea del fuente. Por
   * eso: línea del chunk + cantidad de `\n` entre el inicio del chunk y el
   * offset. Devolver la línea del chunk (lo que hacía antes) mentía en todos
   * los templates de varias líneas.
   */
  const lineAt = (pos: number): number => {
    let mark = marks[0];
    for (const m of marks) if (m.start <= pos) mark = m;
    if (!mark) return 1;
    const slice = html.slice(mark.start, Math.max(mark.start, pos));
    let newlines = 0;
    for (const c of slice) if (c === "\n") newlines++;
    return mark.line + newlines;
  };
  // Enmascarar preserva offsets: los índices del texto/atributos son índices
  // de `html`, que es sobre lo que se acumulan los `marks`.
  const masked = maskHtml(html);
  const hits: CopyHit[] = [];

  // 1) nodos de texto. La unidad es el NODO emitido (segmento entre tags) y
  // los `\n` internos se colapsan: un nodo partido en dos líneas de fuente
  // sigue siendo un nodo (`investigación y\ndesarrollo aplicado`). Los chunks
  // NO se juntan entre sí: cada porción de chunk dentro del segmento se evalúa
  // aparte, para que el bloque de imports no parezca una frase.
  const chunkStarts = marks.map((mark) => mark.start);
  for (const segment of textSegments(masked)) {
    const bounds = [
      segment.start,
      ...chunkStarts.filter((pos) => pos > segment.start && pos < segment.start + segment.text.length),
      segment.start + segment.text.length
    ];
    for (let i = 0; i < bounds.length - 1; i++) {
      const from = bounds[i]!;
      const to = bounds[i + 1]!;
      const raw = masked.slice(from, to);
      const text = decodeEntities(raw).replace(/\s+/g, " ").trim();
      if (!isCopy(text) || isTechnical(text)) continue;
      const lead = raw.length - raw.trimStart().length;
      hits.push({ file, line: lineAt(from + lead), kind: "texto", text });
    }
  }

  // 2) atributos de copy. Las interpolaciones no están en la reconstrucción:
  // un valor 100% `t()` queda vacío y no se reporta; un resto literal sí.
  const tagRe = /<([a-zA-Z][\w-]*)([^>]*)>/g;
  let tag: RegExpExecArray | null;
  while ((tag = tagRe.exec(masked))) {
    const tagName = tag[1].toLowerCase();
    // Atributos con comilla simple o doble y espacios opcionales alrededor de
    // `=`: el HTML válido admite las dos formas y el gate no puede elegir una.
    const attrRe = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let attr: RegExpExecArray | null;
    while ((attr = attrRe.exec(tag[2]))) {
      const name = attr[1].toLowerCase();
      const value = decodeEntities(attr[2] ?? attr[3] ?? "").trim();
      const isMetaContent = name === "content" && tagName === "meta";
      if (!COPY_ATTRS.has(name) && !isMetaContent) continue;
      if (isCopy(value) && !isTechnical(value)) {
        hits.push({ file, line: lineAt(tag.index), kind: `atributo:${name}`, text: value });
      }
    }
  }
  return hits;
}

/**
 * Todos los templates del repo (sin tests), en orden estable.
 *
 * El contrato dice `src/templates/**`: el descubrimiento es RECURSIVO y acepta
 * `.tsx` además de `.ts`. Un template nuevo en un subdirectorio no puede quedar
 * fuera del gate por no estar en el primer nivel.
 */
export function templateFiles(dir = "src/templates"): string[] {
  const files: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        files.push(path);
      }
    }
  };
  walk(dir);
  return files.sort();
}

/** Hits de todos los templates. */
export function allCopyHits(dir = "src/templates"): CopyHit[] {
  return templateFiles(dir).flatMap((file) => copyHitsOf(file, readFileSync(file, "utf8")));
}
