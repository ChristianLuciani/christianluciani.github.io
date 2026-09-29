/**
 * png.test.mjs — decoder PNG mínimo (issue #55).
 *
 * Los gates de movimiento necesitan medir el fotograma REAL (el screenshot de
 * Chrome), no lo que el DOM dice que debería verse. Este decoder es la pieza
 * pura: PNG 8-bit sin entrelazar (los que produce Chrome), con los 5 filtros
 * de scanline. El test construye PNGs sintéticos con cada filtro y verifica
 * que el round-trip devuelva exactamente los píxeles de origen.
 */
import { describe, it, expect } from "vitest";
import { deflateSync } from "node:zlib";
import { decodePng, sampleRegion, differenceStats, luminance, redness } from "./png.mjs";

/* ── encoder mínimo de fixture (inverso del decoder) ─────────────────── */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const paeth = (a, b, c) => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** filtra los píxeles de origen con el filtro f (0..4), como haría un encoder */
function filterScanlines(pixels, width, height, channels, f) {
  const stride = width * channels;
  const out = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    out[y * (stride + 1)] = f;
    for (let x = 0; x < stride; x++) {
      const raw = pixels[y * stride + x];
      const a = x >= channels ? pixels[y * stride + x - channels] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0;
      const v = f === 0 ? raw
        : f === 1 ? raw - a
        : f === 2 ? raw - b
        : f === 3 ? raw - ((a + b) >> 1)
        : raw - paeth(a, b, c);
      out[y * (stride + 1) + 1 + x] = (v + 256) & 0xff;
    }
  }
  return out;
}

/** PNG sintético: pixels = array de bytes (RGB o RGBA), filtro f */
function makePng({ width, height, pixels, channels, filter = 0 }) {
  const colorType = channels === 4 ? 6 : 2;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;            // bit depth
  ihdr[9] = colorType;
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // deflate, filtro adaptativo, sin interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(filterScanlines(pixels, width, height, channels, filter))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* gradiente 4×3 conocido: ejercita los cinco filtros con datos no triviales */
const rgbPixels = Buffer.from([
  10, 20, 30,  40, 50, 60,  70, 80, 90, 100, 110, 120,
  130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240,
  250, 200, 150, 100, 50, 0, 33, 66, 99, 132, 165, 198,
]);
const rgbaPixels = Buffer.from(
  [...rgbPixels].flatMap((v, i) => (i % 3 === 2 ? [v, 255 - (i % 7) * 10] : [v])),
);

describe("png — decoder (issue #55: medir el fotograma real)", () => {
  for (const filter of [0, 1, 2, 3, 4]) {
    it(`round-trip con filtro ${filter} (RGB 8-bit)`, () => {
      const img = decodePng(makePng({ width: 4, height: 3, pixels: rgbPixels, channels: 3, filter }));
      expect([img.width, img.height]).toEqual([4, 3]);
      expect(img.channels).toBe(4); // siempre RGBA normalizado
      for (let i = 0; i < 4 * 3; i++) {
        expect(img.rgba[i * 4 + 0]).toBe(rgbPixels[i * 3 + 0]);
        expect(img.rgba[i * 4 + 1]).toBe(rgbPixels[i * 3 + 1]);
        expect(img.rgba[i * 4 + 2]).toBe(rgbPixels[i * 3 + 2]);
        expect(img.rgba[i * 4 + 3]).toBe(255); // alfa opaco implícito
      }
    });
  }

  it("round-trip RGBA 8-bit preserva el alfa", () => {
    const img = decodePng(makePng({ width: 4, height: 3, pixels: rgbaPixels, channels: 4, filter: 4 }));
    expect([...img.rgba]).toEqual([...rgbaPixels]);
  });

  it("rechaza formatos que no produce Chrome (16-bit / entrelazado)", () => {
    const png = makePng({ width: 4, height: 3, pixels: rgbPixels, channels: 3 });
    const deep = Buffer.from(png); deep[24] = 16;            // bit depth 16
    expect(() => decodePng(deep)).toThrow(/bit depth/i);
    const interlaced = Buffer.from(png); interlaced[28] = 1; // interlace Adam7
    expect(() => decodePng(interlaced)).toThrow(/entrelaz/i);
  });

  it("rechaza un buffer que no es PNG", () => {
    expect(() => decodePng(Buffer.from("no soy un png"))).toThrow(/firma/i);
  });
});

describe("png — medición de regiones", () => {
  const img = decodePng(makePng({ width: 4, height: 3, pixels: rgbPixels, channels: 3 }));

  it("sampleRegion promedia sólo los píxeles del disco pedido", () => {
    // disco centrado en (0,0) con r=0 ⇒ un solo píxel: el (10,20,30)
    const s = sampleRegion(img, { x: 0, y: 0, r: 0 });
    expect(s.n).toBe(1);
    expect(s.mean).toBeCloseTo(luminance(10, 20, 30), 6);
    expect(s.max).toBeCloseTo(s.mean, 6);
  });

  it("luminancia Rec.709: blanco 1, negro 0, canal puro por su peso", () => {
    expect(luminance(255, 255, 255)).toBeCloseTo(1, 6);
    expect(luminance(0, 0, 0)).toBe(0);
    expect(luminance(255, 0, 0)).toBeCloseTo(0.2126, 4);
    expect(luminance(0, 255, 0)).toBeCloseTo(0.7152, 4);
  });

  it("canal estrella: aísla el rojo de las estrellas del oro de la C (issue #55)", () => {
    /* colores reales del artefacto: estrella #ff8a70, oro #c9a84c, teal #00c9c0 */
    expect(redness(0xff, 0x8a, 0x70)).toBeGreaterThan(0.3); // 91/255
    expect(redness(0xc9, 0xa8, 0x4c)).toBe(0);              // el oro no cuenta
    expect(redness(0x00, 0xc9, 0xc0)).toBe(0);              // el teal tampoco
    expect(redness(0xff, 0xff, 0xff)).toBe(0);              // ni el blanco
    expect(redness(0x05, 0x08, 0x10)).toBeCloseTo(5 / 255, 6); // fondo: casi nada
  });

  it("sampleRegion acepta otra métrica: con estrella mide rojo, con oro no (issue #55)", () => {
    /* 2×1: píxel estrella (#ff8a70) y píxel oro (#c9a84c) */
    const estrella = makePng({ width: 2, height: 1, channels: 3, filter: 0,
      pixels: Buffer.from([0xff, 0x8a, 0x70, 0xc9, 0xa8, 0x4c]) });
    const img2 = decodePng(estrella);
    const star = sampleRegion(img2, { x: 0, y: 0, r: 0, metric: redness });
    const gold = sampleRegion(img2, { x: 1, y: 0, r: 0, metric: redness });
    expect(star.mean).toBeCloseTo(redness(0xff, 0x8a, 0x70), 6);
    expect(star.mean).toBeGreaterThan(0.3);
    expect(gold.mean).toBe(0);
    expect(sampleRegion(img2, { x: 0, y: 0, r: 1 }).mean).toBeCloseTo(sampleRegion(img2, { x: 0, y: 0, r: 1, metric: luminance }).mean, 9);
  });

  it("promedia el disco completo cuando cubre toda la imagen", () => {
    const s = sampleRegion(img, { x: 1.5, y: 1, r: 99 });
    expect(s.n).toBe(12);
    const all = [...Array(12)].map((_, i) => luminance(rgbPixels[i * 3], rgbPixels[i * 3 + 1], rgbPixels[i * 3 + 2]));
    expect(s.mean).toBeCloseTo(all.reduce((a, b) => a + b, 0) / 12, 6);
  });
});

describe("png — diferencia contra una referencia (el halo de la estrella, #55)", () => {
  /* 5×1: la referencia (estado settled), una estrella compacta y la misma luz
     abierta — el defecto de #55 es la misma luz repartida hacia afuera */
  const settled = decodePng(makePng({ width: 5, height: 1, channels: 3,
    pixels: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10]) }));
  const compacta = decodePng(makePng({ width: 5, height: 1, channels: 3,
    pixels: Buffer.from([0, 0, 0, 0, 0, 0, 200, 200, 200, 0, 0, 0, 10, 10, 10]) }));
  const abierta = decodePng(makePng({ width: 5, height: 1, channels: 3,
    pixels: Buffer.from([0, 0, 0, 120, 120, 120, 120, 120, 120, 120, 120, 120, 10, 10, 10]) }));

  it("acumula sólo lo que la imagen agrega sobre la referencia", () => {
    const s = differenceStats(compacta, settled, { x: 2, y: 0, r: 4 });
    expect(s.n).toBe(1);
    expect(s.light).toBeCloseTo(luminance(200, 200, 200), 4); // el fondo no suma
    expect(s.spread).toBeCloseTo(0, 6);                        // luz en el centro
    expect(s.area).toBe(5);                                    // el disco entero (5×1)
    expect(s.mean).toBeCloseTo(s.light / 5, 6);                 // repartida en el disco
  });

  it("la misma luz abierta tiene MÁS radio de giro (el bloom de #55)", () => {
    const a = differenceStats(compacta, settled, { x: 2, y: 0, r: 4 });
    const b = differenceStats(abierta, settled, { x: 2, y: 0, r: 4 });
    expect(a.spread).toBeCloseTo(0, 6);
    expect(b.spread).toBeCloseTo(Math.sqrt(2 / 3), 6); // luz en x=1,2,3 ⇒ rms
    expect(b.spread).toBeGreaterThan(a.spread);
  });

  it("no acepta imágenes de distinto tamaño", () => {
    const chica = decodePng(makePng({ width: 2, height: 1, channels: 3, pixels: Buffer.from([0, 0, 0, 0, 0, 0]) }));
    expect(() => differenceStats(chica, settled, { x: 0, y: 0, r: 1 })).toThrow(/tamaño/);
  });
});
