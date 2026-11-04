/**
 * Tests de la parte pura del gate de paginación (sin Chrome). El gate real se
 * corre con `npm run print:verify` en CI, donde setup-chrome provee el binario.
 */
import { describe, expect, it } from "vitest";
import {
  GateError,
  nonA4Pages,
  pageBoxes,
  pageCount,
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
