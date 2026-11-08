/**
 * verify-pagination.mjs — gate real de paginación del print-CV (F3 de #119, F1
 * de la 2.ª ronda y F1–F4 de la 3.ª ronda de #119).
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
 * para cada página se extraen las posiciones de línea de sus bloques de texto
 * siguiendo la matriz de texto (`Tm`, `Td`, `TD` y `T*` con su `TL`, dentro de
 * `BT … ET`; en unidades del stream, sin fuentes ni conversión a puntos) y se
 * exigen DOS medidas relativas a la página más llena del documento: al menos
 * `MIN_LAST_PAGE_FILL` de su extensión vertical Y de su número de líneas. La
 * extensión sola deja pasar una página con 2 líneas en el tope y el pie; el
 * conteo solo deja pasar una página densa pero sin alto. El mínimo de ambas
 * cierra los dos casos sin agregar constantes. Es una medida RELATIVA a
 * propósito: la escala CSS→PDF de Chrome no es contrato público, y el documento
 * es la referencia natural de «página llena».
 *
 * Medido con Chrome 156 (2026-11-04), imprimiendo desde `dist/` (así resuelven
 * los `assets/…`), sin footer, por página (líneas/extensión):
 *   · base 0e0c1e0 (huérfano): p.6 = 1 skill + footer; quitar el footer deja 1
 *     línea → extensión 0 (0% de la más llena) y el conteo sigue 6/6.
 *   · head corregido: p.6 = cierre de Publicaciones + Competencias → 12 líneas,
 *     321 unidades = 34,4% de la extensión (934) y 12/37 = 32,4% de las líneas
 *     de la página más llena (p.2, 37 líneas).
 * El umbral 20% queda entre ambos con margen: por debajo, la página no porta un
 * bloque real, sólo la cola de una sección. Un documento de una sola página no
 * tiene página huérfana (la más llena es ella misma); si esa única página no
 * tiene texto (p.ej. sólo el footer), la medición falla porque no hay contenido.
 *
 * ASUNCIÓN DECLARADA (F2 de la 3.ª ronda): el extractor reconoce líneas
 * posicionadas por `Tm`/`Td`/`TD`/`T*`; si una versión de Chrome avanzara
 * líneas con otro operador (o cambiara el modelo de texto), TODAS las páginas
 * medirían 0. Ese caso se reporta como «no se pudo medir» (exit 2, mensaje
 * explícito sobre el operador), nunca como «página vacía» y nunca como OK.
 *
 * Detección de invocación directa (F1 de la 3.ª ronda): Node realpath-ea el
 * módulo de entrada (`import.meta.url`), no `argv[1]`; comparar ambos crudos
 * da false por symlink y el gate salía 0 sin medir. Se comparan los realpaths.
 *
 * El binario lo resuelve `tools/logo/chrome.mjs` (misma precedencia que los
 * gates del logo: `CHROME_PATH` primero; en CI lo setea setup-chrome). No
 * agrega dependencias: Chrome es el mismo que ya corre `logo:verify` y `zlib` es
 * de Node.
 *
 * DOS VARIANTES (#160): el print-CV se publica en ES (`#print-cv`) y EN
 * (`#print-cv-en`), y la piel muestra una u otra según `html[lang]`. Las tres
 * condiciones se miden sobre CADA variante: el texto EN es más corto y puede
 * mover los cortes de página (la condición del footer huérfano es la que se
 * rompe primero). La variante EN se imprime desde una copia del artefacto con
 * `lang="en"` — el mismo estado que deja el toggle, sin ejecutar su JS.
 *
 * Uso: node tools/print-cv/verify-pagination.mjs [dist/index.html]
 * Exit: 0 OK · 1 drift · 2 no se pudo medir (sin Chrome, sin build o PDF raro).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";
import { chromeFailure, chromePath } from "../logo/chrome.mjs";
import { Unmeasurable } from "../logo/fidelity-verdict.mjs";

/** A4 en puntos PostScript: 210mm × 297mm. */
const A4 = { width: 595.28, height: 841.89 };
/** Chrome serializa 210mm como 594.96pt: 1pt de tolerancia cubre el redondeo. */
const TOLERANCE_PT = 1;

/**
 * Piso de contenido de la última página: 20% de la página más llena, exigido
 * sobre la extensión vertical Y sobre el número de líneas (ver la medición en
 * el encabezado). Un cierre con 1–2 líneas ronda el 0–3%; el cierre legítimo
 * actual, 34% de extensión y 32% de líneas.
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

/** Bloque del print-CV de un idioma. `#print-cv` y `#print-cv-en` son hermanos. */
export function printBlockRange(html, id) {
  const open = `<div id="${id}"`;
  const start = html.indexOf(open);
  if (start < 0) throw new GateError(`no encontré el bloque #${id} del print-CV`);
  const ends = ['<div id="print-cv-en"', '<header class="hud">']
    .map((marker) => html.indexOf(marker, start + open.length))
    .filter((at) => at > start);
  return { start, end: ends.length ? Math.min(...ends) : html.length };
}

/**
 * Quita el `.p-footer` del bloque del idioma medido. Falla si dentro de ESE
 * bloque no hay exactamente uno: sin esa precondición la medición diferencial
 * compararía dos documentos iguales.
 *
 * El otro bloque (el del idioma inactivo) queda intacto: el PDF sólo renderiza
 * la variante visible, así que su footer no entra en la cuenta de páginas.
 */
export function removeFooterDiv(html, id = "print-cv") {
  const { start, end } = printBlockRange(html, id);
  const block = html.slice(start, end);
  const footer = /<div class="p-footer">[\s\S]*?<\/div>/g;
  const matches = block.match(footer) ?? [];
  if (matches.length !== 1) {
    throw new GateError(
      `esperaba exactamente un .p-footer en #${id}, encontré ${matches.length}`,
    );
  }
  return html.slice(0, start) + block.replace(footer, "") + html.slice(end);
}

/**
 * Copia del documento con `<html lang="en">`: así se imprime la variante EN sin
 * depender del toggle (que corre JS). Falla si el `lang` no está donde se espera
 * — un documento sin `lang` no se puede medir por variante.
 */
export function withDocumentLang(html, lang) {
  const replaced = html.replace(/<html\b[^>]*\blang="[^"]*"/, `<html lang="${lang}"`);
  if (replaced === html) {
    throw new GateError("el documento no declara `lang` en <html>: no puedo medir la variante");
  }
  return replaced;
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
 * Operadores que establecen una posición de línea de texto, en orden. Los seis
 * números son `Tm` (fija la matriz); dos son `Td`/`TD` (desplazan la línea);
 * `T*` avanza una línea con el `TL` vigente. `ET` cierra el bloque: fuera de
 * `BT … ET` no hay posiciones de texto que medir.
 */
const TEXT_POSITION_RE =
  /(BT)\b|(ET)\b|(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm\b|(-?[\d.]+)\s+(-?[\d.]+)\s+(TD|Td)\b|(T\*)|(-?[\d.]+)\s+TL\b/g;

/**
 * Coordenadas Y de cada línea posicionada en un stream de contenido.
 *
 * Chrome emite un `Tm` por línea, pero la medición no depende de eso: se
 * sigue la matriz de texto (`Tm`, `Td`/`TD`, `T*` + `TL`), así que una versión
 * que avance líneas con `Td`/`T*` mide igual. Solo importa Y (el documento no
 * rota texto); los desplazamientos horizontales no agregan líneas porque se
 * deduplican por Y. Asunción declarada en el encabezado: otro modelo de
 * posicionamiento produce 0 líneas y se reporta como «no se pudo medir».
 */
function textLineYs(content) {
  const ys = [];
  let leading = 0;
  let y = 0;
  let inText = false;
  for (const m of content.matchAll(TEXT_POSITION_RE)) {
    if (m[1]) {
      inText = true;
      y = 0;
      continue;
    }
    if (m[2]) {
      inText = false;
      continue;
    }
    if (!inText) continue;
    if (m[3] !== undefined) {
      y = Number(m[8]);
      ys.push(y);
      continue;
    }
    if (m[9] !== undefined) {
      const ty = Number(m[10]);
      if (m[11] === "TD") leading = -ty;
      y += ty;
      ys.push(y);
      continue;
    }
    if (m[12]) {
      y -= leading;
      ys.push(y);
      continue;
    }
    if (m[13] !== undefined) leading = Number(m[13]);
  }
  return ys;
}

/**
 * Líneas y extensión vertical del texto de cada página, en unidades del stream.
 *
 * `lines` cuenta posiciones Y distintas (una `Tm`/`Td`/`T*` por línea); dos
 * runs de la misma línea en distinta X colapsan a una. `extent` es el alto
 * cubierto. Como solo se comparan páginas del MISMO PDF, la escala común se
 * cancela y no hace falta convertir a puntos (ni leer fuentes).
 */
export function pageTextExtents(pdf) {
  return pageContents(pdf).map((content) => {
    const ys = textLineYs(content);
    if (ys.length === 0) return { lines: 0, extent: 0 };
    return {
      lines: new Set(ys.map((y) => y.toFixed(1))).size,
      extent: Math.max(...ys) - Math.min(...ys),
    };
  });
}

/**
 * Condición (3): la última página no puede ser casi vacía. Mide EXTENSIÓN y
 * LÍNEAS relativas a la página más llena; el mínimo de ambas es el piso (ver
 * encabezado). Lanza GateError con el caso medido; `pageExtents` es la salida
 * de `pageTextExtents` sobre el PDF SIN footer (por eso el footer no suma).
 */
export function lastPageFillViolation(pageExtents) {
  if (pageExtents.length === 0) {
    throw new GateError("el PDF no tiene páginas: el print-CV no renderizó");
  }
  const fullest = Math.max(...pageExtents.map((page) => page.extent));
  if (fullest <= 0) {
    /* Ninguna página expone posiciones de texto: o el documento no tiene
     * contenido, o el modelo de posicionamiento cambió. No se puede distinguir,
     * así que se declara «no se pudo medir» (exit 2), nunca «página vacía». */
    throw new Unmeasurable(
      "no pude medir el texto del print-CV: ninguna página expone posiciones de línea " +
        "(`Tm`/`Td`/`TD`/`T*` dentro de `BT … ET`) sin el footer — ¿cambió cómo Chrome " +
        "posiciona el texto?",
    );
  }
  const last = pageExtents[pageExtents.length - 1];
  const fullestLines = Math.max(...pageExtents.map((page) => page.lines));
  const extentFill = last.extent / fullest;
  const lineFill = fullestLines > 0 ? last.lines / fullestLines : 0;
  const fill = Math.min(extentFill, lineFill);
  if (fill < MIN_LAST_PAGE_FILL) {
    throw new GateError(
      `la última página quedó casi vacía: ${last.lines} línea(s) y ${last.extent} ` +
        `unidades cubren el ${(lineFill * 100).toFixed(1)}% de las líneas y el ` +
        `${(extentFill * 100).toFixed(1)}% de la extensión de la página más llena ` +
        `(${fullestLines} líneas/${fullest}; mínimo ${(MIN_LAST_PAGE_FILL * 100).toFixed(0)}% ` +
        "en ambas) — el cierre no puede ser sólo la cola de una sección",
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

/**
 * Variantes medidas. El print-CV tiene una por idioma (#160): `#print-cv` en ES
 * y `#print-cv-en` en EN. La piel del tema muestra la del `html[lang]` activo,
 * así que la variante EN se imprime desde una copia con `lang="en"` — el toggle
 * del sitio hace exactamente eso en runtime, sin JS de por medio en el PDF.
 */
const VARIANTS = [
  { lang: "es", id: "print-cv" },
  { lang: "en", id: "print-cv-en" },
];

/**
 * Mide una variante de idioma: A4, footer no-huérfano y última página con
 * contenido. Devuelve el renglón del reporte; `temps` acumula los archivos a
 * borrar (el caller los limpia aunque la medición falle).
 */
function measureVariant(source, variant, workDir, suffix, temps) {
  const html = variant.lang === "es" ? source : withDocumentLang(source, variant.lang);
  /* Las copias viven junto al artefacto para que `assets/…` siga resolviendo
   * igual (el QR del encabezado es parte del layout). */
  const withFooterHtml = join(workDir, `${suffix}-${variant.lang}.html`);
  const withoutFooterHtml = join(workDir, `${suffix}-${variant.lang}-no-footer.html`);
  const withPdf = join(tmpdir(), `${suffix}-${variant.lang}-with-footer.pdf`);
  const withoutPdf = join(tmpdir(), `${suffix}-${variant.lang}-no-footer.pdf`);
  temps.push(withFooterHtml, withoutFooterHtml, withPdf, withoutPdf);

  writeFileSync(withFooterHtml, html, "utf8");
  writeFileSync(withoutFooterHtml, removeFooterDiv(html, variant.id), "utf8");

  printPdf(withFooterHtml, withPdf);
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
    throw new GateError(
      `páginas que no son A4 (${detail}; esperado ${A4.width}×${A4.height}pt)`,
    );
  }
  if (withPages !== withoutPages) {
    throw new GateError(
      `el footer abre una página propia: ${withPages} páginas con footer vs ` +
        `${withoutPages} sin él — la última página del print-CV contiene sólo el footer ` +
        "de procedencia",
    );
  }
  /* Medido sobre el PDF SIN footer: el footer no cuenta como contenido. */
  try {
    lastPageFillViolation(pageTextExtents(withoutBytes));
  } catch (err) {
    if (err instanceof GateError) {
      throw new GateError(`${err.message} (documento de ${withPages} página(s))`);
    }
    throw err;
  }

  return (
    `${variant.lang}: ${withPages} páginas A4; el footer comparte la última ` +
    `(sin él, ${withoutPages}) y la última cubre el contenido mínimo ` +
    `(≥${(MIN_LAST_PAGE_FILL * 100).toFixed(0)}% de la extensión y de las líneas de la más llena)`
  );
}

function main() {
  const input = resolve(process.argv[2] ?? "dist/index.html");
  if (!existsSync(input)) {
    console.error(`[cv-pagination] no se pudo medir: no existe ${input} — corré \`npm run build\` primero`);
    process.exit(2);
  }

  const workDir = dirname(input);
  const suffix = `cv-pagination-${process.pid}-${Date.now()}`;
  const temps = [];
  let exitCode = 0;

  try {
    const source = readFileSync(input, "utf8");
    const summaries = [];

    for (const variant of VARIANTS) {
      try {
        summaries.push(measureVariant(source, variant, workDir, suffix, temps));
      } catch (err) {
        /* Una falla de medición SIEMPRE dice de qué variante: el texto EN es
         * más corto y es la que primero rompe los cortes de página (#160). */
        if (err instanceof GateError) throw new GateError(`[${variant.lang}] ${err.message}`);
        throw err;
      }
    }

    console.log(`✅ print-CV · ${summaries.join(" · ")}`);
  } catch (err) {
    if (err instanceof GateError) {
      console.error(`[cv-pagination] FAIL: ${err.message}`);
      exitCode = 1;
    } else {
      console.error(`[cv-pagination] no se pudo medir: ${err.message}`);
      exitCode = 2;
    }
  } finally {
    for (const path of temps) {
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

/* Invocación directa (F1 de la 3.ª ronda): `import.meta.url` es el path
 * REALPATH-eado del módulo, mientras `argv[1]` conserva el path con que se
 * invocó (p.ej. un symlink). Comparar los strings crudos da false y el gate
 * salía 0 sin medir; comparar realpaths detecta también el caso symlink. Si no
 * se puede resolver alguno, no se asume main: el módulo se importó. */
function invokedDirectly() {
  if (process.argv[1] == null) return false;
  try {
    return (
      realpathSync(resolve(process.argv[1])) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}
if (invokedDirectly()) main();
