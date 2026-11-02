/**
 * finish-paint.test.mjs — la pintura del acabado de la C (#91).
 *
 * Cada mutación del issue tiene su caso: (1) sin overlay del barrido,
 * (2) sin recorte de la bisectriz, (3) sin filter del glow, (4) gradiente
 * degenerado. Antes daban exit 0 porque el gate sólo leía las declaraciones
 * de `defs`; ahora `finishPaintFindings` compara el DOM serializado —el mismo
 * que produce `chrome.mjs`— sin necesitar Chrome, así que la regresión se ve
 * en CI (donde sólo corre `npm test`).
 */
import { describe, expect, it } from "vitest";
import { finishPaintFindings, groupText } from "./finish-paint.mjs";

/** Un gradiente serializado como Chrome: id + ejes en userSpaceOnUse. */
const gradient = (id, { x1 = "499.66", y1 = "576.73", x2 = "496.85", y2 = "586.33" } = {}) => {
  const attrs = Object.entries({ x1, y1, x2, y2 })
    .filter(([, v]) => v != null)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join("");
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse"${attrs}><stop offset="0%" stop-color="#fffbe6"></stop></linearGradient>`;
};

/**
 * DOM mínimo con la misma forma que el serializado real: `.c-band` con un
 * grupo recortado por brazo que pinta bisel y barrido, `.c-glow` con el path
 * del bloom, y los gradientes en `defs`. Cada opción apaga UNA pieza, como la
 * mutación correspondiente del issue.
 */
const finishDom = ({
  clips = [1, 2],
  perp = [1, 2],
  tint = [1, 2],
  glowFilter = true,
  band = true,
  glow = true,
  perp1 = {},
  perp2 = {},
} = {}) => {
  const arms = [1, 2].map((k) => {
    const attrs = clips.includes(k) ? ` clip-path="url(#c-clip-${k})"` : "";
    const paths = [
      perp.includes(k) ? `<path d="M 0 0 L 10 10" fill="url(#c-perp-${k})"></path>` : "",
      tint.includes(k) ? `<path d="M 0 0 L 10 10" fill="url(#c-tint-${k})"></path>` : "",
    ].join("");
    return `<g${attrs}>${paths}</g>`;
  }).join("");
  const bandHtml = band ? `<g class="c-band">${arms}</g>` : "";
  const glowPath = glowFilter
    ? '<path d="M 0 0" stroke="#dfa637" filter="url(#c-bloom)" stroke-width="16" opacity="0.28"></path>'
    : '<path d="M 0 0" stroke="#dfa637" stroke-width="16" opacity="0.28"></path>';
  const glowHtml = glow ? `<g class="c-glow" style="opacity: 1;">${glowPath}</g>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg">${bandHtml}${glowHtml}`
    + `<defs id="c-defs">${gradient("c-perp-1", perp1)}${gradient("c-perp-2", perp2)}</defs></svg>`;
};

describe("finishPaintFindings — DOM sano", () => {
  it("un DOM sano no reporta nada", () => {
    expect(finishPaintFindings(finishDom())).toEqual([]);
  });

  it("se ancla en referencias, no en el markup: atributos de más no lo ponen rojo", () => {
    const dump = finishDom().replace('<path d="M 0 0 L 10 10" fill="url(#c-tint-1)">', '<path d="M 0 0 L 10 10" class="tint" data-x="1" fill="url(#c-tint-1)">');
    expect(finishPaintFindings(dump)).toEqual([]);
  });

  it("un eje con sólo un componente distinto es real (y1≠y2 alcanza)", () => {
    expect(finishPaintFindings(finishDom({ perp1: { x1: "10", y1: "10", x2: "10", y2: "20" } }))).toEqual([]);
  });
});

describe("finishPaintFindings — las 4 mutaciones del issue #91", () => {
  it("(1) sin overlay del barrido ⇒ dice qué brazo y qué fill falta", () => {
    const findings = finishPaintFindings(finishDom({ tint: [2] }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/barrido del brazo 1 no se pinta/);
    expect(findings[0]).toMatch(/fill="url\(#c-tint-1\)"/);
  });

  it("(2) sin recorte de la bisectriz ⇒ un finding por brazo", () => {
    const findings = finishPaintFindings(finishDom({ clips: [] }));
    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatch(/no recorta el brazo 1/);
    expect(findings[1]).toMatch(/no recorta el brazo 2/);
  });

  it("(3) sin filter del glow ⇒ el bloom no se pinta", () => {
    const findings = finishPaintFindings(finishDom({ glowFilter: false }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/glow de la C no se pinta/);
    expect(findings[0]).toMatch(/filter="url\(#c-bloom\)"/);
  });

  it("(4) gradiente degenerado (x1==x2 y y1==y2) ⇒ eje sin dirección", () => {
    const findings = finishPaintFindings(finishDom({ perp1: { x1: "10", y1: "10", x2: "10", y2: "10" } }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/c-perp-1 tiene un eje degenerado/);
  });

  it("(4b) degenerado en c-perp-2 también se ve", () => {
    const findings = finishPaintFindings(finishDom({ perp2: { x1: "5", y1: "5", x2: "5", y2: "5" } }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/c-perp-2 tiene un eje degenerado/);
  });
});

describe("finishPaintFindings — estructuras ausentes o incompletas", () => {
  it("sin `.c-band` no se puede verificar y lo dice (en vez de pasar en silencio)", () => {
    const findings = finishPaintFindings(finishDom({ band: false }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/no tiene el grupo \.c-band/);
  });

  it("sin `.c-glow` el bloom tampoco se verifica en silencio", () => {
    const findings = finishPaintFindings(finishDom({ glow: false }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/no tiene el grupo \.c-glow/);
  });

  it("un path con el fill del bisel pero FUERA del recorte no cuenta", () => {
    const dump = finishDom({ perp: [2] }).replace(
      '<g clip-path="url(#c-clip-1)"><path d="M 0 0 L 10 10" fill="url(#c-tint-1)"></path></g>',
      '<path d="M 0 0 L 10 10" fill="url(#c-perp-1)"></path><g clip-path="url(#c-clip-1)"><path d="M 0 0 L 10 10" fill="url(#c-tint-1)"></path></g>',
    );
    const findings = finishPaintFindings(dump);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/volumen del brazo 1 no se pinta/);
  });

  it("un c-perp sin ejes declarados no se lee como «eje real»", () => {
    const findings = finishPaintFindings(finishDom({ perp1: { x2: null } }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/c-perp-1 no declara el eje/);
  });

  it("varios faltantes se reportan todos, no sólo el primero", () => {
    const findings = finishPaintFindings(finishDom({ tint: [], glowFilter: false, perp1: { x1: "1", y1: "1", x2: "1", y2: "1" } }));
    expect(findings).toHaveLength(4);
  });
});

describe("groupText — recorrido anidado", () => {
  it("devuelve el grupo con sus subgrupos y el cierre correcto", () => {
    const band = groupText(finishDom(), /<g\b[^>]*\bclass="c-band"[^>]*>/);
    expect(band.startsWith('<g class="c-band">')).toBe(true);
    expect(band.endsWith("</g></g>")).toBe(true);
    expect(band).toContain("c-perp-1");
    expect(band).toContain("c-tint-2");
  });

  it("un grupo sin cierre balanceado no se inventa: null", () => {
    expect(groupText('<g class="c-band"><g><path d="M 0 0"></g>', /<g\b[^>]*\bclass="c-band"[^>]*>/)).toBeNull();
  });
});
