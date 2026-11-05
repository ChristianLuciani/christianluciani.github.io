/**
 * PUNTEROS DE DOCS: `docs/SPEC.md` afirma dónde vive cada dato, y esas
 * afirmaciones se pueden resolver contra el árbol. Este módulo convierte las
 * referencias en aserciones mecánicas, sin red y sin LLM:
 *
 * 1. Todo path en backticks que apunte a un archivo o directorio de ESTE repo
 *    debe existir. Los paths de otros repos (`profile-data/…`, `schema/…`,
 *    `packages/…`) no se resuelven acá: no están en el árbol.
 * 2. Si una celda de tabla nombra un símbolo en backticks junto a un path
 *    (`src/x.ts` (`EXPORT`)), el archivo inmediatamente anterior en esa celda
 *    debe exportarlo. Así «el copy vive en X (§seccion)» no puede sobrevivir si
 *    X no expone lo que la fila dice que vive ahí.
 * 3. Un puntero por sección (`§ancla`) sólo es verificable si el archivo
 *    declara el ancla literal (`§ancla`). La tabla canónica referencia código
 *    por export, no por sección: un `§` sin ancla es una atribución no resoluble.
 *
 * La sección «8. Plan por fases» queda fuera: nombra archivos PLANEADOS que
 * todavía no existen (es roadmap declarado, no un puntero muerto).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type PointerViolationKind = "missing-path" | "unverified-anchor" | "missing-export";

export interface PointerViolation {
  /** Línea 1-based del markdown. */
  line: number;
  kind: PointerViolationKind;
  detail: string;
}

export interface PointerReport {
  violations: PointerViolation[];
  /** Paths del repo resueltos (métrica anti-pase-vacío). */
  paths: number;
  /** Símbolos verificados contra un export (métrica anti-pase-vacío). */
  symbols: number;
}

/** Prefijos que identifican un path de ESTE repo. */
const REPO_ROOTS = ["src/", "tools/", "docs/", "public/", "assets/", ".github/"];

/** Archivos de la raíz citados sin prefijo (el SPEC los nombra así). */
const ROOT_FILES = new Set([
  "build.sh",
  "build.ts",
  "brand-kit.lock.json",
  "ESTADO.md",
  "index.html",
  "LICENSE",
  "package-lock.json",
  "package.json",
  "README.md",
  "tsconfig.json",
  "vite.config.ts"
]);

/** Secciones del SPEC que describen el futuro, no el árbol actual. */
const PLANNED_SECTIONS = ["## 8. Plan por fases"];

const BACKTICK = /`([^`\n]+)`/g;
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const ANCHOR = /§([A-Za-z0-9_-]+)/g;

/** Un token backticked que es un path de este repo, o `null`. */
export function repoPath(token: string): string | null {
  if (!token || /\s/.test(token) || token.includes("*")) return null;
  if (!token.includes("/")) return ROOT_FILES.has(token) ? token : null;
  if (token.startsWith("http://") || token.startsWith("https://")) return null;
  return REPO_ROOTS.some((root) => token.startsWith(root)) ? token : null;
}

/** ¿El archivo exporta `symbol`? Regex sobre el fuente: no ejecuta el módulo. */
export function exportsSymbol(source: string, symbol: string): boolean {
  const name = symbol.replace(/[$]/g, "\\$");
  const declaration = new RegExp(
    `\\bexport\\s+(?:async\\s+)?(?:const|let|var|function|class|interface|type|enum)\\s+${name}\\b`
  );
  if (declaration.test(source)) return true;
  return new RegExp(`\\bexport\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`).test(source);
}

interface Token {
  value: string;
  index: number;
  path: string | null;
}

function tokensOf(cell: string): Token[] {
  const tokens: Token[] = [];
  for (const match of cell.matchAll(BACKTICK)) {
    const value = match[1].trim();
    tokens.push({ value, index: match.index ?? 0, path: repoPath(value) });
  }
  return tokens;
}

function plannedLines(lines: string[]): Set<number> {
  const skip = new Set<number>();
  let inside = false;
  lines.forEach((line, index) => {
    if (/^##\s/.test(line)) {
      inside = PLANNED_SECTIONS.some((heading) => line.startsWith(heading));
    }
    if (inside) skip.add(index);
  });
  return skip;
}

/** Devuelve las violaciones de punteros de un markdown (por defecto el SPEC). */
export function checkDocPointers(markdown: string, root: string = process.cwd()): PointerReport {
  const lines = markdown.split("\n");
  const skip = plannedLines(lines);
  const violations: PointerViolation[] = [];
  let paths = 0;
  let symbols = 0;

  lines.forEach((line, index) => {
    if (skip.has(index)) return;
    const lineNumber = index + 1;

    for (const token of tokensOf(line)) {
      if (!token.path) continue;
      paths += 1;
      if (!existsSync(resolve(root, token.path))) {
        violations.push({
          line: lineNumber,
          kind: "missing-path",
          detail: `\`${token.path}\` no existe en el árbol`
        });
      }
    }

    // Símbolos y anclas sólo se resuelven dentro de una celda de tabla contra
    // los paths que esa misma celda cita.
    if (!line.trimStart().startsWith("|")) return;
    const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");

    for (const cell of cells) {
      const cellTokens = tokensOf(cell);
      if (!cellTokens.some((token) => token.path)) continue;

      let lastPath: string | null = null;
      for (const token of cellTokens) {
        if (token.path) {
          lastPath = token.path;
          continue;
        }
        if (!lastPath || !IDENTIFIER.test(token.value)) continue;
        const file = resolve(root, lastPath);
        if (!existsSync(file)) continue;
        symbols += 1;
        const source = readFileSync(file, "utf8");
        if (!exportsSymbol(source, token.value)) {
          violations.push({
            line: lineNumber,
            kind: "missing-export",
            detail: `\`${token.value}\` no es export de \`${lastPath}\``
          });
        }
      }

      // Anclas: el path inmediatamente anterior debe declarar `§ancla`.
      for (const match of cell.matchAll(ANCHOR)) {
        const anchorIndex = match.index ?? 0;
        const before = cellTokens.filter((token) => token.path && token.index < anchorIndex);
        const target = before.at(-1)?.path;
        if (!target) continue;
        const file = resolve(root, target);
        if (!existsSync(file)) continue;
        const source = readFileSync(file, "utf8");
        if (!source.includes(`§${match[1]}`)) {
          violations.push({
            line: lineNumber,
            kind: "unverified-anchor",
            detail: `§${match[1]} no está declarado en \`${target}\`; nombrá el export que resuelve la fila`
          });
        }
      }
    }
  });

  return { violations, paths, symbols };
}
