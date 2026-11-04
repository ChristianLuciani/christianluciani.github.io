/**
 * verify-pagination.mjs — gate real de paginación del print-CV (F3 de #119).
 *
 * Mide el PDF que produce Chrome con el CSS del propio repo (`@page` A4), no el
 * HTML ni el texto del CSS. Dos condiciones:
 *   1. todas las páginas son A4;
 *   2. el footer de procedencia no queda SOLO en la última página.
 *
 * (2) se mide por diferencia: se imprime el documento con y sin `.p-footer`.
 * Si quitar el footer reduce el número de páginas, el footer ocupaba una página
 * propia. Esto es lo que faltaba: «el footer es el último hijo de #print-cv» ya
 * era cierto en el base 0e0c1e0 y la página 6 seguía huérfana, así que esa
 * aserción no mide paginación.
 *
 * El binario lo resuelve `tools/logo/chrome.mjs` (misma precedencia que los
 * gates del logo: `CHROME_PATH` primero; en CI lo setea setup-chrome). No
 * agrega dependencias: Chrome es el mismo que ya corre `logo:verify`.
 *
 * Uso: node tools/print-cv/verify-pagination.mjs [dist/index.html]
 * Exit: 0 OK · 1 drift · 2 no se pudo medir (sin Chrome o sin build).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromeFailure, chromePath } from "../logo/chrome.mjs";

/** A4 en puntos PostScript: 210mm × 297mm. */
const A4 = { width: 595.28, height: 841.89 };
/** Chrome serializa 210mm como 594.96pt: 1pt de tolerancia cubre el redondeo. */
const TOLERANCE_PT = 1;

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

    const withPages = pageCount(readFileSync(withPdf));
    const withoutPages = pageCount(readFileSync(withoutPdf));
    const notA4 = nonA4Pages(readFileSync(withPdf));

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

    console.log(
      `✅ print-CV: ${withPages} páginas A4; el footer comparte la última ` +
        `(quitar el footer no reduce el conteo: ${withoutPages})`,
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
