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
        chunks.push({ text: literal.text, line: line + 1 });
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(sf);
  return chunks;
}

/** HTML emitido sin comentarios HTML, CSS/JS ni bloques <style>/<script>. */
function cleanHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/[^\n]*$/gm, " ");
}

/** Texto visible de un HTML emitido: fuera de tags. */
function visibleText(html: string): string {
  let out = "";
  let inTag = false;
  for (const c of html) {
    if (c === "<") {
      inTag = true;
      out += "\n";
      continue;
    }
    if (c === ">") {
      inTag = false;
      out += "\n";
      continue;
    }
    if (!inTag) out += c;
  }
  return out;
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
  const lineAt = (pos: number): number => {
    let line = 1;
    for (const mark of marks) if (mark.start <= pos) line = mark.line;
    return line;
  };
  const clean = cleanHtml(html);
  const hits: CopyHit[] = [];

  // 1) nodos de texto
  let pos = 0;
  for (const segment of visibleText(clean).split("\n")) {
    const text = segment.replace(/\s+/g, " ").trim();
    if (isCopy(text) && !/[=;{}]/.test(text)) {
      hits.push({ file, line: lineAt(pos), kind: "texto", text });
    }
    pos += segment.length + 1;
  }

  // 2) atributos de copy. Las interpolaciones no están en la reconstrucción:
  // un valor 100% `t()` queda vacío y no se reporta; un resto literal sí.
  const tagRe = /<([a-zA-Z][\w-]*)([^>]*)>/g;
  let tag: RegExpExecArray | null;
  while ((tag = tagRe.exec(clean))) {
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
