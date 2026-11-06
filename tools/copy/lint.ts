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

function wordsOf(value: string): string[] {
  return value
    .replace(/&[a-z]+;/gi, " ")
    .split(/\s+/)
    .filter((word) => WORD.test(word));
}

function isCopy(value: string): boolean {
  return wordsOf(value).length >= MIN_WORDS;
}

/**
 * Descarte de strings TÉCNICAS (no son copy aunque tengan espacios).
 *
 * Filtro explícito y documentado, aplicado por línea de texto reconstruido:
 *  · un token único (import, clave `pub.*`, id, URL sin espacios);
 *  · URL absoluta, path POSIX/relativo o ruta con unidad Windows;
 *  · código/CSS/plantilla: `=`, `;`, `{`, `}`.
 * Si un string técnico cae acá, no se reporta; una frase de copy real no cae
 * en ninguna de estas formas.
 */
function isTechnical(value: string): boolean {
  const text = value.trim();
  if (!text) return true;
  if (!/\s/.test(text)) return true;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return true;
  if (/^(\.{1,2}\/|\/|[A-Za-z]:[\\/])/.test(text)) return true;
  if (/[=;{}]/.test(text)) return true;
  return false;
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

  // 1) nodos de texto. Se evalúa LÍNEA por línea: cada chunk arranca en una
  // línea propia (se concatenan con `\n`), así un literal plano interpolado no
  // se diluye en el texto de los chunks vecinos.
  for (const segment of textSegments(masked)) {
    let offset = 0;
    for (const line of segment.text.split("\n")) {
      const text = line.replace(/\s+/g, " ").trim();
      if (isCopy(text) && !isTechnical(text)) {
        const lead = line.length - line.trimStart().length;
        hits.push({ file, line: lineAt(segment.start + offset + lead), kind: "texto", text });
      }
      offset += line.length + 1;
    }
  }

  // 2) atributos de copy. Las interpolaciones no están en la reconstrucción:
  // un valor 100% `t()` queda vacío y no se reporta; un resto literal sí.
  const tagRe = /<([a-zA-Z][\w-]*)([^>]*)>/g;
  let tag: RegExpExecArray | null;
  while ((tag = tagRe.exec(masked))) {
    const tagName = tag[1].toLowerCase();
    const attrRe = /([\w:-]+)="([^"]*)"/g;
    let attr: RegExpExecArray | null;
    while ((attr = attrRe.exec(tag[2]))) {
      const name = attr[1].toLowerCase();
      const value = attr[2].trim();
      const isMetaContent = name === "content" && tagName === "meta";
      if (!COPY_ATTRS.has(name) && !isMetaContent) continue;
      if (isCopy(value)) {
        hits.push({ file, line: lineAt(tag.index), kind: `atributo:${name}`, text: value });
      }
    }
  }
  return hits;
}

/** Todos los templates del repo (sin tests), en orden estable. */
export function templateFiles(dir = "src/templates"): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .sort()
    .map((name) => join(dir, name));
}

/** Hits de todos los templates. */
export function allCopyHits(dir = "src/templates"): CopyHit[] {
  return templateFiles(dir).flatMap((file) => copyHitsOf(file, readFileSync(file, "utf8")));
}
