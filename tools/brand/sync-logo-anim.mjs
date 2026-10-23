/**
 * sync-logo-anim.mjs — genera src/ts/brand/logoAnim.js desde la animación
 * de referencia (proposals/logo-triangulo-espiral/aurea7.html).
 *
 * El módulo del sitio no debe editarse a mano: la fuente es la animación
 * aprobada. El header/footer del módulo (montaje del SVG y mini mark) viven
 * en tools/brand/logoAnim.{header,footer}.txt.
 *
 * Uso: npm run brand:sync   (CI verifica que no quede drift)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const SRC = resolve(REPO, "proposals/logo-triangulo-espiral/aurea7.html");
const OUT = resolve(REPO, "src/ts/brand/logoAnim.js");
const header = readFileSync(resolve(HERE, "logoAnim.header.txt"), "utf8");
const footer = readFileSync(resolve(HERE, "logoAnim.footer.txt"), "utf8");
const html = readFileSync(SRC, "utf8");

const match = html.match(/<script>\n([\s\S]*)\n<\/script>/);
if (!match) {
  console.error("❌ no se encontró <script> en aurea7.html");
  process.exit(1);
}

const script = match[1]
  .replace('"use strict";\n', "")
  .replace('const svg = document.getElementById("logo");\n', "")
  .replace('document.getElementById("replay").addEventListener("click", render);\nrender();', "");

for (const forbidden of ['document.getElementById("logo")', 'document.getElementById("replay")']) {
  if (script.includes(forbidden)) {
    console.error(`❌ el script de la animación todavía contiene ${forbidden}`);
    process.exit(1);
  }
}

writeFileSync(OUT, header + script + footer);
console.log(`✅ ${OUT.replace(REPO + "/", "")} generado desde aurea7.html`);
