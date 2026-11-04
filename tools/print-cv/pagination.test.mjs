/**
 * Tests de la parte pura del gate de paginación (sin Chrome). El gate real se
 * corre con `npm run print:verify` en CI, donde setup-chrome provee el binario.
 */
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  GateError,
  nonA4Pages,
  pageBoxes,
  MIN_LAST_PAGE_FILL,
  lastPageFillViolation,
  pageCount,
  pageTextExtents,
  removeFooterDiv,
} from "./verify-pagination.mjs";

const a4Box = "/MediaBox [0 0 594.95996 841.91998]";

describe("verify-pagination — parsers del PDF", () => {
  it("cuenta páginas por /Type /Page y no confunde /Pages", () => {
    const pdf = Buffer.from(
      "%PDF-1.4\n1 0 obj <</Type /Pages /Count 2>>\n2 0 obj <</Type /Page>>\n3 0 obj <</Type /Page>>",
      "latin1",
    );
    expect(pageCount(pdf)).toBe(2);
  });

  it("no cuenta /Type /Pages como página", () => {
    expect(pageCount(Buffer.from("<</Type /Pages /Count 0>>", "latin1"))).toBe(0);
  });

  it("lee el MediaBox y detecta una página que no es A4", () => {
    const pdf = Buffer.from(`${a4Box}\n/MediaBox [0 0 612 792]`, "latin1");
    expect(pageBoxes(pdf)).toEqual([
      { width: 594.95996, height: 841.91998 },
      { width: 612, height: 792 },
    ]);
    expect(nonA4Pages(pdf)).toEqual([{ page: 2, width: 612, height: 792 }]);
  });

  it("acepta el redondeo de Chrome para 210mm sin marcarlo drift", () => {
    expect(nonA4Pages(Buffer.from(a4Box, "latin1"))).toEqual([]);
  });
});

describe("verify-pagination — precondición del footer", () => {
  const html = `<div id="print-cv"><p>x</p><div class="p-footer">generado @ abc</div></div>`;

  it("quita el único footer", () => {
    const without = removeFooterDiv(html);
    expect(without).not.toContain("p-footer");
    expect(without).toContain("<p>x</p>");
    expect(without).toContain("</div>");
  });

  it("falla ruidoso si no hay footer o si hay más de uno", () => {
    expect(() => removeFooterDiv("<div id=\"print-cv\"></div>")).toThrow(GateError);
    expect(() => removeFooterDiv(`${html}${html}`)).toThrow(/encontré 2/);
  });
});

/* ── Piso de contenido de la última página (F1 de la 2.ª ronda de #119) ──
 *
 * El caso pre-fix: con origin/main (0e0c1e0) la p.6 quedaba con 1 skill + el
 * footer; el diferencial con/sin footer daba 6/6 y el gate pasaba. Estos
 * fixtures reproducen ESA geometría sin Chrome: el PDF se arma a mano con las
 * mismas líneas de texto (una `Tm` por línea) y el gate debe fallar.
 */

/**
 * PDF mínimo válido (xref incluida) con una página por entrada. Cada entrada es
 * la lista de coordenadas Y de sus líneas de texto, en unidades del stream.
 * `compress` usa FlateDecode, como los PDFs de Chrome.
 */
function buildPdf(pages, { compress = true } = {}) {
  const pageNums = pages.map((_, index) => 3 + index * 2);
  const contentNums = pages.map((_, index) => 4 + index * 2);
  const bodies = new Map();
  const maxNum = 2 + pages.length * 2;

  bodies.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  bodies.set(
    2,
    `<< /Type /Pages /Kids [${pageNums.map((num) => `${num} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );
  pages.forEach((lines, index) => {
    const text = lines
      .map((y) => `BT /F1 9 Tf 1 0 0 1 57 ${y} Tm <0024> Tj ET`)
      .join("\n");
    const raw = Buffer.from(text, "latin1");
    const payload = compress ? deflateSync(raw) : raw;
    bodies.set(
      pageNums[index],
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 594.95996 841.91998] ` +
        `/Resources << >> /Contents ${contentNums[index]} 0 R >>`,
    );
    bodies.set(
      contentNums[index],
      `<< /Length ${payload.length}${compress ? " /Filter /FlateDecode" : ""} >>\nstream\n` +
        `${payload.toString("latin1")}\nendstream`,
    );
  });

  const chunks = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  const offsets = [];
  let length = chunks[0].length;
  for (let num = 1; num <= maxNum; num += 1) {
    const chunk = Buffer.from(`${num} 0 obj\n${bodies.get(num)}\nendobj\n`, "latin1");
    offsets[num] = length;
    chunks.push(chunk);
    length += chunk.length;
  }
  const xref = [
    `xref\n0 ${maxNum + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    `trailer\n<< /Size ${maxNum + 1} /Root 1 0 R >>`,
    `startxref\n${length}`,
    "%%EOF",
    "",
  ].join("\n");
  chunks.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(chunks);
}

/** Líneas equiespaciadas: extensión `span` repartida en `count` líneas. */
const linesAt = (count, { top = 100, span = 700 } = {}) =>
  Array.from({ length: count }, (_, index) => top + (count === 1 ? 0 : (span * index) / (count - 1)));

describe("verify-pagination — extensión de texto por página", () => {
  it("lee una línea por Tm, cuenta líneas y mide la extensión vertical", () => {
    const pdf = buildPdf([[100, 200, 300], [100, 140]]);
    expect(pageTextExtents(pdf)).toEqual([
      { lines: 3, extent: 200 },
      { lines: 2, extent: 40 },
    ]);
  });

  it("funciona con streams sin comprimir (mismo resultado)", () => {
    const pdf = buildPdf([[100, 300]], { compress: false });
    expect(pageTextExtents(pdf)).toEqual([{ lines: 2, extent: 200 }]);
  });

  it("una página sin texto mide 0 líneas y extensión 0", () => {
    expect(pageTextExtents(buildPdf([[]]))).toEqual([{ lines: 0, extent: 0 }]);
  });
});

describe("verify-pagination — piso de contenido de la última página", () => {
  it("falla con la geometría pre-fix exacta: última página = 1 skill + footer", () => {
    /* origin/main (0e0c1e0): p.6 = 1 skill + footer. Con footer son 2 líneas;
     * sin footer queda 1. El diferencial de páginas da 2/2 y no lo ve: el piso
     * de contenido sí. */
    const withFooter = buildPdf([linesAt(30), [100, 200]]);
    const withoutFooter = buildPdf([linesAt(30), [100]]);
    expect(pageCount(withFooter)).toBe(pageCount(withoutFooter));

    const extents = pageTextExtents(withoutFooter);
    expect(extents.at(-1)).toEqual({ lines: 1, extent: 0 });
    expect(() => lastPageFillViolation(extents)).toThrow(GateError);
    expect(() => lastPageFillViolation(extents)).toThrow(/casi vacía/);
  });

  it("acepta el cierre corregido: una página con un bloque real (≥20% de la más llena)", () => {
    const extents = pageTextExtents(buildPdf([linesAt(35), linesAt(12, { top: 100, span: 321 })]));
    expect(extents.at(-1).extent / Math.max(...extents.map((page) => page.extent))).toBeGreaterThanOrEqual(
      MIN_LAST_PAGE_FILL,
    );
    expect(() => lastPageFillViolation(extents)).not.toThrow();
  });

  it("una única página sin texto (sólo quedaba el footer) también falla", () => {
    expect(() => lastPageFillViolation(pageTextExtents(buildPdf([[]])))).toThrow(/no tiene texto medible/);
  });

  it("una única página con contenido no es una página huérfana", () => {
    expect(() => lastPageFillViolation(pageTextExtents(buildPdf([linesAt(20)])))).not.toThrow();
  });
});
