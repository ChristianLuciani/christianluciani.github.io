/**
 * check-brand-kit.mjs — verifica que el espejo vendored de marca coincida con
 * el pin de `brand-kit.lock.json` (tag inmutable de cluciani-brand-kit).
 *
 * El sitio es consumidor: `assets/brand/logo/` es una copia fallback, no la
 * fuente. Este check detecta drift local (archivo editado, faltante o extra)
 * sin red; el tag del brand kit es la fuente canónica.
 *
 * Uso: npm run brand:verify
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const LOCK = resolve(ROOT, "brand-kit.lock.json");
const DIR = resolve(ROOT, "assets/brand/logo");
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fail = [];

let lock;
try {
  lock = JSON.parse(readFileSync(LOCK, "utf8"));
} catch (err) {
  console.error(`❌ brand-kit.lock.json ilegible: ${err.message}`);
  process.exit(1);
}

if (!/^v\d+\.\d+\.\d+$/.test(lock.tag ?? "")) fail.push(`tag no inmutable: ${lock.tag}`);
if (lock.cdnBase !== `https://cdn.jsdelivr.net/gh/${lock.source}@${lock.tag}`)
  fail.push(`cdnBase no coincide con source@tag: ${lock.cdnBase}`);
if (lock.source !== "ChristianLuciani/cluciani-brand-kit")
  fail.push(`source inesperado: ${lock.source}`);

const expected = Object.keys(lock.assets ?? {}).sort();
const files = readdirSync(DIR)
  .filter((f) => /\.(svg|png)$/i.test(f) && statSync(resolve(DIR, f)).isFile())
  .sort();

for (const f of expected.filter((f) => !files.includes(f))) fail.push(`falta ${f}`);
for (const f of files.filter((f) => !expected.includes(f))) fail.push(`extra ${f}`);
for (const f of expected.filter((f) => files.includes(f))) {
  const got = sha256(resolve(DIR, f));
  if (got !== lock.assets[f]) fail.push(`hash ${f}: ${got.slice(0, 12)} ≠ ${lock.assets[f].slice(0, 12)}`);
}

if (fail.length) {
  console.error(`❌ brand kit: ${fail.join(" · ")}`);
  process.exit(1);
}
console.log(`✓ brand kit ${lock.source}@${lock.tag}: ${expected.length} assets del espejo coinciden`);
