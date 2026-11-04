/**
 * verify-pagination.mjs — gate real de paginación del print-CV (F3 de #119, F1
 * de la 2.ª ronda de #119).
 *
 * Mide el PDF que produce Chrome con el CSS del propio repo (`@page` A4), no el
 * HTML ni el texto del CSS. Tres condiciones:
 *   1. todas las páginas son A4;
 *   2. el footer de procedencia no queda SOLO en la última página;
 *   3. la última página no queda casi vacía (el defecto real de #119).
 *
 * (2) se mide por diferencia: se imprime el documento con y sin `.p-footer`.
 * Si quitar el footer reduce el número de páginas, el footer ocupaba una página
 * propia. Ese diferencial es necesario pero NO suficiente: con el base 0e0c1e0
 * (p.6 = 1 skill + footer) el conteo es 6/6 y el gate pasaba. Por eso (3).
 *
 * (3) se mide sobre el PDF SIN footer (así el footer no cuenta como contenido):
 * para cada página se extrae la extensión vertical de sus líneas de texto
 * (matrices `Tm` de los bloques de texto, en unidades del stream, sin necesitar
 * fuentes ni conversión a puntos) y se exige que la última página cubra al menos
 * `MIN_LAST_PAGE_FILL` de la extensión de la página más llena del documento.
 * Es una medida RELATIVA a propósito: la escala CSS→PDF de Chrome no es
 * contrato público, y el documento es la referencia natural de «página llena».
 *
 * Medido con Chrome 156 (2026-11-04), imprimiendo desde `dist/` (así resuelven
 * los `assets/…`), sin footer, extensión de texto por página:
 *   · base 0e0c1e0 (huérfano): p.6 = 1 skill + footer; quitar el footer deja 1
 *     línea → extensión 0 (0% de la más llena, 933) y el conteo sigue 6/6.
 *   · head corregido: p.6 = cierre de Publicaciones + Competencias → 12 líneas,
 *     321 unidades = 34,4% de la más llena (934).
 * El umbral 20% queda entre ambos con margen: por debajo, la página no porta un
 * bloque real, sólo la cola de una sección. Un documento de una sola página no
 * tiene página huérfana (la más llena es ella misma); si esa única página no
 * tiene texto (p.ej. sólo el footer), la medición falla porque no hay contenido.
 *
 * El binario lo resuelve `tools/logo/chrome.mjs` (misma precedencia que los
 * gates del logo: `CHROME_PATH` primero; en CI lo setea setup-chrome). No
 * agrega dependencias: Chrome es el mismo que ya corre `logo:verify` y `zlib` es
 * de Node.
 *
 * Uso: node tools/print-cv/verify-pagination.mjs [dist/index.html]
 * Exit: 0 OK · 1 drift · 2 no se pudo medir (sin Chrome, sin build o PDF raro).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";
import { chromeFailure, chromePath } from "../logo/chrome.mjs";

/** A4 en puntos PostScript: 210mm × 297mm. */
const A4 = { width: 595.28, height: 841.89 };
/** Chrome serializa 210mm como 594.96pt: 1pt de tolerancia cubre el redondeo. */
const TOLERANCE_PT = 1;

/**
 * Piso de contenido de la última página: 20% de la extensión de texto de la
 * página más llena del documento (ver la medición en el encabezado). Un cierre
 * con 1–2 líneas ronda el 0–3%; el cierre legítimo actual, el 34%.
 */
export const MIN_LAST_PAGE_FILL = 0.2;

/* Mismos flags base que tools/logo/chrome.mjs. `--no-sandbox` sólo en linux
 * (Ubuntu 23.10+ bloquea user namespaces); macOS conserva su sandbox. */
const BASE_ARGS = [
  "--headless",
  "--disable-gpu",
  "--no-first-run",
  "--hide-scrollbars",
  "--no-pdf-header-footer",
];
if (process.platform === "linux") BASE_ARGS.push("--no-sandbox", "--disable-dev-shm-usage");

/** Falla del artefacto (drift), distinta de «no se pudo medir». */
export class GateError extends Error {}

/**
 * Quita el único `.p-footer` del HTML. Falla si no hay exactamente uno: sin esa
 * precondición la medición diferencial compararía dos documentos iguales.
 */
export function removeFooterDiv(html) {
  const footer = /<div class="p-footer">[\s\S]*?<\/div>/g;
  const matches = html.match(footer) ?? [];
  if (matches.length !== 1) {
    throw new GateError(`esperaba exactamente un .p-footer en el print-CV, encontré ${matches.length}`);
  }
  return html.replace(footer, "");
}

/** Páginas del PDF por sus objetos `/Type /Page` (no `/Pages`). */
export function pageCount(pdf) {
  return [...pdf.toString("latin1").matchAll(/\/Type\s*\/Page\b/g)].length;
}

/** MediaBox de cada página, en puntos. */
export function pageBoxes(pdf) {
  return [...pdf.toString("latin1").matchAll(
    /\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/g,
  )].map(([, x0, y0, x1, y1]) => ({
    width: Number(x1) - Number(x0),
    height: Number(y1) - Number(y0),
  }));
}

/** Páginas que no son A4 (vacío = todas A4). */
export function nonA4Pages(pdf) {
  return pageBoxes(pdf)
    .map((box, index) => ({ page: index + 1, ...box }))
    .filter(
      (box) =>
        Math.abs(box.width - A4.width) > TOLERANCE_PT ||
        Math.abs(box.height - A4.height) > TOLERANCE_PT,
    );
}

/**
 * Objetos del PDF (`N 0 obj`), con su diccionario y su stream si lo tienen.
 *
 * Se escanea el archivo en vez de leer la xref: Chrome escribe una xref clásica
 * pero también podría ser un stream; el escaneo es igual de válido si se SALTA
 * el contenido de cada stream (un `N 0 obj` puede aparecer por azar dentro de
 * bytes comprimidos). El salto usa `/Length` cuando es directo.
 */
function parsePdfObjects(pdf) {
  const src = pdf.toString("latin1");
  const objects = new Map();
  const header = /(\d+)\s+(\d+)\s+obj\b/g;
  let match;
  while ((match = header.exec(src))) {
    const num = Number(match[1]);
    let i = header.lastIndex;
    while (i < src.length && /\s/.test(src[i])) i++;

    let dict = "";
    if (src.startsWith("<<", i)) {
      let depth = 0;
      let j = i;
      while (j < src.length) {
        if (src.startsWith("<<", j)) {
          depth += 1;
          j += 2;
        } else if (src.startsWith(">>", j)) {
          depth -= 1;
          j += 2;
          if (depth === 0) break;
        } else {
          j += 1;
        }
      }
      dict = src.slice(i, j);
      i = j;
    }

    let stream = null;
    const streamStart = src.slice(i).match(/^\s*stream\r?\n/);
    if (streamStart) {
      const start = i + streamStart[0].length;
      const declared = dict.match(/\/Length\s+(\d+)\b/);
      const end = declared ? start + Number(declared[1]) : src.indexOf("endstream", start);
      stream = pdf.subarray(start, end);
      i = end;
      const endstream = src.indexOf("endstream", i);
      if (endstream !== -1) i = endstream + "endstream".length;
      const endobj = src.indexOf("endobj", i);
      if (endobj !== -1) i = endobj + "endobj".length;
    } else {
      const endobj = src.indexOf("endobj", i);
      if (endobj !== -1) i = endobj + "endobj".length;
    }

    objects.set(num, { dict, stream });
    header.lastIndex = i;
  }
  return objects;
}

/** Texto de un stream de contenido (FlateDecode o crudo). */
function streamText(object) {
  if (!object?.stream) return "";
  if (!/FlateDecode/.test(object.dict)) return object.stream.toString("latin1");
  try {
    return inflateSync(object.stream).toString("latin1");
  } catch (err) {
    throw new Error(`no pude descomprimir un stream del PDF: ${err.message}`);
  }
}

/**
 * Contenido de cada página, EN ORDEN, siguiendo el árbol `/Pages → /Kids`.
 * Un PDF sin catálogo/árbol es «no se pudo medir», no drift.
 */
export function pageContents(pdf) {
  const objects = parsePdfObjects(pdf);
  const catalog = [...objects.values()].find((object) => /\/Type\s*\/Catalog\b/.test(object.dict));
  if (!catalog) throw new Error("el PDF no tiene /Catalog");
  const pagesRef = catalog.dict.match(/\/Pages\s+(\d+)\s+0\s+R/);
  if (!pagesRef) throw new Error("el /Catalog no apunta a /Pages");

  const pages = [];
  const walk = (num) => {
    const object = objects.get(num);
    if (!object) throw new Error(`falta el objeto ${num} del árbol de páginas`);
    const kids = object.dict.match(/\/Kids\s*\[([^\]]*)\]/);
    if (kids) {
      for (const kid of kids[1].matchAll(/(\d+)\s+0\s+R/g)) walk(Number(kid[1]));
      return;
    }
    if (/\/Type\s*\/Page\b/.test(object.dict)) pages.push(object);
  };
  walk(Number(pagesRef[1]));

  return pages.map((page) => {
    const refs = page.dict.match(/\/Contents\s*(\[[^\]]*\]|\d+\s+0\s+R)/);
    if (!refs) return "";
    const nums = [...refs[1].matchAll(/(\d+)\s+0\s+R/g)].map((ref) => Number(ref[1]));
    return nums.map((num) => streamText(objects.get(num))).join("\n");
  });
}

/**
 * Extensión vertical del texto de cada página, en unidades del stream.
 *
 * Chrome emite un `Tm` por línea (los runs de la misma línea se posicionan con
 * `Td`), dentro de bloques `BT … ET`; de ahí salen las líneas y la altura. Como
 * solo se comparan páginas del MISMO PDF, la escala común se cancela y no hace
 * falta convertir a puntos (ni leer fuentes).
 */
export function pageTextExtents(pdf) {
  return pageContents(pdf).map((content) => {
    const ys = [];
    for (const block of content.matchAll(/BT([\s\S]*?)ET/g)) {
      for (const tm of block[1].matchAll(
        /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm\b/g,
      )) {
        ys.push(Number(tm[6]));
      }
    }
    if (ys.length === 0) return { lines: 0, extent: 0 };
    const lines = new Set(ys.map((y) => y.toFixed(1))).size;
    return { lines, extent: Math.max(...ys) - Math.min(...ys) };
  });
}

/**
 * Condición (3): la última página no puede ser casi vacía. Lanza GateError con
 * el caso medido; `pageExtents` es la salida de `pageTextExtents` sobre el PDF
 * SIN footer (por eso el footer no suma contenido).
 */
export function lastPageFillViolation(pageExtents) {
  if (pageExtents.length === 0) {
    throw new GateError("el PDF no tiene páginas: el print-CV no renderizó");
  }
  const fullest = Math.max(...pageExtents.map((page) => page.extent));
  if (fullest <= 0) {
    throw new GateError(
      "el print-CV no tiene texto medible sin el footer: la última página no porta contenido",
    );
  }
  const last = pageExtents[pageExtents.length - 1];
  const fill = last.extent / fullest;
  if (fill < MIN_LAST_PAGE_FILL) {
    throw new GateError(
      `la última página quedó casi vacía: ${last.lines} línea(s) cubren el ` +
        `${(fill * 100).toFixed(1)}% de la página más llena (mínimo ` +
        `${(MIN_LAST_PAGE_FILL * 100).toFixed(0)}%) — el cierre no puede ser sólo ` +
        "la cola de una sección",
    );
  }
}

function printPdf(htmlPath, pdfPath) {
  const profile = mkdtempSync(join(tmpdir(), "cv-pagination-profile-"));
  try {
    const result = spawnSync(
      chromePath(),
      [...BASE_ARGS, `--user-data-dir=${profile}`, `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href],
      { encoding: "utf8", timeout: 120_000, maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
    );
    if (result.error) {
      throw chromeFailure({ message: result.error.message, code: result.error.code }, result.stderr);
    }
    if (result.status !== 0 || result.signal) throw chromeFailure(result, result.stderr);
  } finally {
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    } catch {
      /* perfil temporal: lo limpia el SO antes que romper el gate */
    }
  }
}

function main() {
  const input = resolve(process.argv[2] ?? "dist/index.html");
  if (!existsSync(input)) {
    console.error(`[cv-pagination] no se pudo medir: no existe ${input} — corré \`npm run build\` primero`);
    process.exit(2);
  }

  const workDir = dirname(input);
  const suffix = `cv-pagination-${process.pid}-${Date.now()}`;
  const withoutFooterHtml = join(workDir, `${suffix}-no-footer.html`);
  const withPdf = join(tmpdir(), `${suffix}-with-footer.pdf`);
  const withoutPdf = join(tmpdir(), `${suffix}-no-footer.pdf`);
  let exitCode = 0;

  try {
    const html = readFileSync(input, "utf8");
    /* La copia vive junto al artefacto para que `assets/…` siga resolviendo
     * igual (el QR del encabezado es parte del layout). */
    writeFileSync(withoutFooterHtml, removeFooterDiv(html), "utf8");

    printPdf(input, withPdf);
    printPdf(withoutFooterHtml, withoutPdf);

    const withBytes = readFileSync(withPdf);
    const withoutBytes = readFileSync(withoutPdf);
    const withPages = pageCount(withBytes);
    const withoutPages = pageCount(withoutBytes);
    const notA4 = nonA4Pages(withBytes);

    if (withPages === 0) {
      throw new GateError("el PDF no tiene páginas: el print-CV no renderizó");
    }
    if (notA4.length > 0) {
      const detail = notA4
        .map((box) => `p${box.page}=${box.width.toFixed(2)}×${box.height.toFixed(2)}pt`)
        .join(", ");
      throw new GateError(`páginas que no son A4 (${detail}; esperado ${A4.width}×${A4.height}pt)`);
    }
    if (withPages !== withoutPages) {
      throw new GateError(
        `el footer abre una página propia: ${withPages} páginas con footer vs ${withoutPages} sin él — ` +
          "la última página del print-CV contiene sólo el footer de procedencia",
      );
    }
    /* Medido sobre el PDF SIN footer: el footer no cuenta como contenido. */
    lastPageFillViolation(pageTextExtents(withoutBytes));

    console.log(
      `✅ print-CV: ${withPages} páginas A4; el footer comparte la última ` +
        `(quitar el footer no reduce el conteo: ${withoutPages}) y la última ` +
        `página cubre el contenido mínimo (≥${(MIN_LAST_PAGE_FILL * 100).toFixed(0)}% de la más llena)`,
    );
  } catch (err) {
    if (err instanceof GateError) {
      console.error(`[cv-pagination] FAIL: ${err.message}`);
      exitCode = 1;
    } else {
      console.error(`[cv-pagination] no se pudo medir: ${err.message}`);
      exitCode = 2;
    }
  } finally {
    for (const path of [withoutFooterHtml, withPdf, withoutPdf]) {
      try {
        rmSync(path, { force: true });
      } catch {
        /* temporal: no enmascara el veredicto */
      }
    }
  }
  /* `process.exit()` dentro del catch saltearía el finally y dejaría la copia
   * temporal junto al artefacto (medido): el código se setea y se sale natural. */
  process.exitCode = exitCode;
}

const invokedDirectly =
  process.argv[1] != null && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) main();
