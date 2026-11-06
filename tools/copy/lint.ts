/**
 * GATE DE COPY EN TEMPLATES (#127) — cero texto visible hardcodeado.
 *
 * Un template (`src/templates/**`, sin contar sus tests) no puede contener
 * texto visible: pide claves al pack (`t()`/`th()`/`ta()`). Este linter es el
 * diente del invariante: recorre los literales del AST, reconstruye el HTML que
 * emiten (concatenando chunks en orden de fuente), descarta comentarios HTML,
 * CSS/JS y bloques `<style>`/`<script>`, y reporta todo segmento de TEXTO
 * (fuera de tags) con más de 2 palabras.
 *
 * Por qué > 2 palabras: una o dos (una sigla, `2026`, `EN`) no son copy; un
 * sintagma de tres sí. Es el umbral que fijó el issue y el que atrapa una frase
 * nueva en un template sin obligar a mover cada número.
 *
 * El texto de un `throw`/`new Error` no es visible: se excluye del scan (un
 * mensaje accionable para el operador no es copy del sitio).
 */
import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface CopyHit {
  file: string;
  line: number;
  text: string;
}

/** Palabras mínimas para considerar un segmento copy visible. */
export const MIN_WORDS = 3;

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

/** Texto visible de un HTML emitido: fuera de tags, sin comentarios ni CSS/JS. */
function visibleText(html: string): string {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/[^\n]*$/gm, " ");
  let out = "";
  let inTag = false;
  for (const c of stripped) {
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
  const hits: CopyHit[] = [];
  let pos = 0;
  for (const segment of visibleText(html).split("\n")) {
    const text = segment
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text && text.split(/\s+/).length >= MIN_WORDS && !/[=;{}]/.test(text)) {
      hits.push({ file, line: lineAt(pos), text });
    }
    pos += segment.length + 1;
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
