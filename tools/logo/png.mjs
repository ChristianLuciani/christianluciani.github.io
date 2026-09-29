/**
 * png.mjs — decoder PNG mínimo + medición de regiones (issue #55).
 *
 * Por qué existe: los gates de movimiento tienen que medir el fotograma REAL
 * (el screenshot de Chrome headless) porque el "destello" que reporta el
 * operador no se ve en el DOM — se ve en los píxeles compuestos (glow
 * difuminado, opacidad de grupo, escalado). Sin dependencias: `zlib` alcanza.
 *
 * Alcance: lo único que Chrome emite para `--screenshot` — 8 bits por canal,
 * sin entrelazar, color type 0/2/4/6. Cualquier otra cosa tira error explícito
 * (nunca un número silenciosamente mal medido).
 */

import { inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS_BY_COLOR_TYPE = { 0: 1, 2: 3, 4: 2, 6: 4 };

const paeth = (a, b, c) => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/**
 * decodePng(buffer) → { width, height, channels: 4, rgba: Uint8Array }
 * Los color type sin alfa se normalizan a alfa opaco.
 */
export function decodePng(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("PNG: firma inválida");

  let ihdr = null;
  const idat = [];
  for (let off = 8; off + 8 <= buf.length; ) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") ihdr = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  if (!ihdr || ihdr.length < 13) throw new Error("PNG: falta IHDR");
  if (!idat.length) throw new Error("PNG: falta IDAT");

  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  if (bitDepth !== 8) throw new Error(`PNG: bit depth ${bitDepth} no soportado (sólo 8)`);
  if (interlace !== 0) throw new Error("PNG: imagen entrelazada (Adam7) no soportada");
  const channels = CHANNELS_BY_COLOR_TYPE[colorType];
  if (!channels) throw new Error(`PNG: color type ${colorType} no soportado`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      const v = filter === 0 ? line[x]
        : filter === 1 ? line[x] + a
        : filter === 2 ? line[x] + b
        : filter === 3 ? line[x] + ((a + b) >> 1)
        : filter === 4 ? line[x] + paeth(a, b, c)
        : NaN;
      if (Number.isNaN(v)) throw new Error(`PNG: filtro de scanline ${filter} desconocido`);
      cur[x] = v & 0xff;
    }
    prev = cur;
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels, d = i * 4;
    if (channels === 4) {
      rgba[d] = out[s]; rgba[d + 1] = out[s + 1]; rgba[d + 2] = out[s + 2]; rgba[d + 3] = out[s + 3];
    } else if (channels === 3) {
      rgba[d] = out[s]; rgba[d + 1] = out[s + 1]; rgba[d + 2] = out[s + 2]; rgba[d + 3] = 255;
    } else if (channels === 2) {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = out[s]; rgba[d + 3] = out[s + 1];
    } else {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = out[s]; rgba[d + 3] = 255;
    }
  }
  return { width, height, channels: 4, rgba };
}

/** luminancia relativa Rec.709 (0..1) de un píxel 0..255 */
export function luminance(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * canal "estrella": rojo menos verde/azul — aísla la luz de las estrellas del
 * oro de la C. Medido sobre el artefacto: la estrella `#ff8a70` da 91/255 > 0,
 * el oro `#c9a84c` da −59/255 → 0, el teal del espiral también 0. Sirve para
 * medir la luz de la estrella de la punta aunque el trazo dorado esté encima
 * (con luminancia cruda, el oro tapa la medición — y el destello de #55 es
 * justamente la luz de la estrella creciendo mientras se apaga).
 */
export function redness(r, g, b) {
  return Math.max(0, r - 2 * g + b) / 255;
}

/**
 * sampleRegion(img, { x, y, r }) → { n, mean, max, min }
 * Promedio de la métrica sobre el disco (centro x,y, radio r) en píxeles de la
 * imagen. r=0 ⇒ un solo píxel. Fuera de los límites ⇒ sólo lo que cae dentro.
 * `metric` permite medir otro canal (p. ej. `redness`).
 */
export function sampleRegion(img, { x, y, r = 0, metric = luminance }) {
  const { width, height, rgba } = img;
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(width - 1, Math.ceil(x + r));
  const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(height - 1, Math.ceil(y + r));
  let n = 0, sum = 0, max = -Infinity, min = Infinity;
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      if (r > 0 && (px - x) ** 2 + (py - y) ** 2 > r * r) continue;
      const i = (py * width + px) * 4;
      const lum = metric(rgba[i], rgba[i + 1], rgba[i + 2]);
      n++; sum += lum;
      if (lum > max) max = lum;
      if (lum < min) min = lum;
    }
  }
  if (!n) return { n: 0, mean: NaN, max: NaN, min: NaN };
  return { n, mean: sum / n, max, min };
}

/**
 * differenceStats(img, ref, { x, y, r, metric }) → { light, mean, spread, n, area }
 *
 * Aísla lo que la imagen AGREGA respecto de una referencia (el estado settled,
 * sin la estrella) dentro del disco, y devuelve dos cosas:
 *   · light  — suma del exceso de la métrica (la luz propia de la estrella);
 *   · mean   — ese exceso repartido sobre todo el disco (comparable a `sampleRegion`);
 *   · spread — radio de giro de esa luz (cuánto se ABRE el halo).
 *
 * Es la medición del defecto de #55: la estrella de la punta se apagaba
 * agrandándose, y eso no se ve en la intensidad (baja) sino en el reparto: la
 * luz se corre hacia afuera. Restar el settled cancela estrellas de fondo y
 * cualquier otra luz que no sea la de la estrella.
 */
export function differenceStats(img, ref, { x, y, r = 0, metric = luminance }) {
  if (img.width !== ref.width || img.height !== ref.height)
    throw new Error("differenceStats: las imágenes tienen distinto tamaño");
  const { width, height, rgba } = img;
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(width - 1, Math.ceil(x + r));
  const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(height - 1, Math.ceil(y + r));
  let light = 0, moment = 0, n = 0, area = 0;
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const d2 = (px - x) ** 2 + (py - y) ** 2;
      if (r > 0 && d2 > r * r) continue;
      area++;
      const i = (py * width + px) * 4;
      const excess = metric(rgba[i], rgba[i + 1], rgba[i + 2])
        - metric(ref.rgba[i], ref.rgba[i + 1], ref.rgba[i + 2]);
      if (excess <= 0) continue; // sólo lo que la estrella agrega
      light += excess;
      moment += excess * d2;
      n++;
    }
  }
  return { light, mean: area ? light / area : 0,
    spread: light > 0 ? Math.sqrt(moment / light) : 0, n, area };
}
