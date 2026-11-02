/**
 * finish-paint.test.mjs — la pintura del acabado de la C (#91, #100/F1).
 *
 * Cada mutación del issue tiene su caso: (1) sin overlay del barrido,
 * (2) sin recorte de la bisectriz, (3) sin filter del glow, (4) gradiente
 * degenerado. Las mutaciones están ADAPTADAS al render real: el artefacto arma
 * el DOM por JS, así que en el gate real se muta ese JS (borrar el
 * `appendChild`, quitar el atributo, etc.), no markup literal. Además están
 * las contrapruebas del pase fresco de #100/F1: un `clipPath` vacío y un path
 * con `d="M 0 0"` conservan la referencia y no pintan nada.
 *
 * `finishPaintFindings` compara el DOM serializado —el mismo que produce
 * `chrome.mjs`— sin necesitar Chrome, así que la regresión se ve en CI (donde
 * sólo corre `npm test`).
 */
import { describe, expect, it } from "vitest";
import { finishPaintFindings, groupText, pathProblem } from "./finish-paint.mjs";

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
 * del bloom, y `defs` con gradientes y clipPaths. Cada opción apaga UNA pieza,
 * como la mutación correspondiente.
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
  tintD = {},
  perpD = {},
  glowD = "M 0 0 L 10 10",
  clipPaths = { 1: "M 0 0 L 100 0 L 100 100 Z", 2: "M 0 0 L 100 0 L 100 100 Z" },
} = {}) => {
  const d = (over, fallback) => over ?? fallback;
  const arms = [1, 2].map((k) => {
    const attrs = clips.includes(k) ? ` clip-path="url(#c-clip-${k})"` : "";
    const paths = [
      perp.includes(k) ? `<path d="${d(perpD[k], "M 0 0 L 10 10")}" fill="url(#c-perp-${k})"></path>` : "",
      tint.includes(k) ? `<path d="${d(tintD[k], "M 0 0 L 10 10")}" fill="url(#c-tint-${k})"></path>` : "",
    ].join("");
    return `<g${attrs}>${paths}</g>`;
  }).join("");
  const bandHtml = band ? `<g class="c-band">${arms}</g>` : "";
  const glowPath = glowFilter
    ? `<path d="${glowD}" stroke="#dfa637" filter="url(#c-bloom)" stroke-width="16" opacity="0.28"></path>`
    : `<path d="${glowD}" stroke="#dfa637" stroke-width="16" opacity="0.28"></path>`;
  const glowHtml = glow ? `<g class="c-glow" style="opacity: 1;">${glowPath}</g>` : "";
  const clipHtml = [1, 2]
    .filter((k) => clipPaths[k] != null)
    .map((k) => {
      const nodes = clipPaths[k] === "" ? "" : `<path d="${clipPaths[k]}"></path>`;
      return `<clipPath id="c-clip-${k}">${nodes}</clipPath>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg">${bandHtml}${glowHtml}`
    + `<defs id="c-defs">${gradient("c-perp-1", perp1)}${gradient("c-perp-2", perp2)}${clipHtml}</defs></svg>`;
};

const messages = (dump) => finishPaintFindings(dump).join("\n");

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

  it("un contorno con curvas/arcos relativos y cierre cuenta como geometría real", () => {
    // el `outline` real usa M/L/Q/A/Z; acá también comandos relativos
    const outline = "M 1 2 L 10 2 Q 11 2 11 3 l 0 5 a 5 5 0 0 0 -10 0 Z";
    expect(finishPaintFindings(finishDom({ perpD: { 1: outline }, tintD: { 1: outline } }))).toEqual([]);
  });
});

describe("finishPaintFindings — las 4 mutaciones del issue #91 (adaptadas al render)", () => {
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

describe("finishPaintFindings — contrapruebas del pase fresco #100/F1", () => {
  it("clipPath vacío (conserva el clip-path del grupo) ⇒ el recorte no aplica", () => {
    // equivale a borrar `cp.appendChild(...)` en aurea7.html:407
    const findings = finishPaintFindings(finishDom({ clipPaths: { 1: "", 2: "M 0 0 L 100 0 L 100 100 Z" } }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/clipPath c-clip-1 está vacío \(sin nodo de geometría\)/);
  });

  it("los dos clipPath vacíos ⇒ dos findings, no uno", () => {
    const findings = finishPaintFindings(finishDom({ clipPaths: { 1: "", 2: "" } }));
    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatch(/c-clip-1 está vacío/);
    expect(findings[1]).toMatch(/c-clip-2 está vacío/);
  });

  it('barrido con d="M 0 0" (conserva el fill) ⇒ no dibuja geometría', () => {
    const findings = finishPaintFindings(finishDom({ tintD: { 1: "M 0 0" } }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/barrido del brazo 1 no se pinta/);
    expect(findings[0]).toMatch(/no dibuja geometría \(d sin segmento de dibujo\)/);
  });

  it('bisel con d="M 0 0 L 0 0" ⇒ degenerado: todos los puntos son el mismo', () => {
    const findings = finishPaintFindings(finishDom({ perpD: { 2: "M 0 0 L 0 0" } }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/volumen del brazo 2 no se pinta/);
    expect(findings[0]).toMatch(/d degenerado \(un solo punto\)/);
  });

  it("clipPath con un path sin forma dibujable ⇒ no aporta geometría", () => {
    const findings = finishPaintFindings(finishDom({ clipPaths: { 1: "M 0 0", 2: "M 0 0 L 9 9" } }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/clipPath c-clip-1 no aporta geometría dibujable/);
  });

  it("clipPath declarado sin el elemento ⇒ lo nombra", () => {
    const findings = finishPaintFindings(finishDom({ clipPaths: { 2: "M 0 0 L 9 9" } }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/falta el clipPath id="c-clip-1"/);
  });

  it("glow con d degenerado (conserva el filter) ⇒ no dibuja geometría", () => {
    const findings = finishPaintFindings(finishDom({ glowD: "M 0 0" }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/glow de la C no dibuja geometría/);
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
    const findings = finishPaintFindings(finishDom({
      tint: [],
      glowFilter: false,
      perp1: { x1: "1", y1: "1", x2: "1", y2: "1" },
    }));
    expect(findings).toHaveLength(4);
  });
});

describe("pathProblem — dibujabilidad de un path data", () => {
  it("acepta un contorno real (moveto + líneas + arco + cierre)", () => {
    expect(pathProblem("M 499.6 576.7 L 206.3 490.8 Q 204 490 205 488 L 496 184 A 5 5 0 0 0 488 178 Z")).toBeNull();
  });

  it("acepta comandos implícitos después del moveto", () => {
    expect(pathProblem("M 0 0 10 0 10 10")).toBeNull();
  });

  it('rechaza un moveto solo (d="M 0 0")', () => {
    expect(pathProblem("M 0 0")).toBe("d sin segmento de dibujo");
  });

  it("rechaza un path donde todos los puntos son el mismo", () => {
    expect(pathProblem("M 5 5 L 5 5 L 5 5")).toBe("d degenerado (un solo punto)");
  });

  it("rechaza `d` ausente o vacío", () => {
    expect(pathProblem(undefined)).toBe("no declara d");
    expect(pathProblem("   ")).toBe("no declara d");
  });

  it("rechaza un número sin comando y un comando desconocido", () => {
    expect(pathProblem("0 0 L 1 1")).toBe("d inválido (número sin comando)");
    expect(pathProblem("M 0 0 X 1 1")).toBe('d inválido (comando "X")');
  });

  it("rechaza un comando con argumentos incompletos", () => {
    expect(pathProblem("M 0 0 L 10")).toBe("d incompleto (lineto sin coordenadas)");
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
