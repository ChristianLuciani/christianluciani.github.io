#!/usr/bin/env node
/**
 * check-artifact-links — gate sobre el artefacto: TODA URL raíz-absoluta que
 * cualquier página de dist/ referencia en href/src (anchors incluidos) debe
 * existir dentro de dist/. Cierra la clase de "el footer apunta a /clients/
 * y bajo SITE_BASE eso 404ea" (#145, F3 del review del pase 6).
 *
 * Uso: npm run build && npm run links:check
 * Exit 0 OK · 1 hay rutas rotas · 2 falta dist/.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const DIST = resolve(process.cwd(), "dist");

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

/** `/clients/` → dist/clients/index.html · `/assets/x.js` → dist/assets/x.js · `/` → dist/index.html */
function targetExists(dist, urlPath) {
  const clean = urlPath.split(/[?#]/)[0];
  if (clean.endsWith("/")) return existsSync(join(dist, clean, "index.html"));
  return existsSync(join(dist, clean));
}

function main() {
  if (!existsSync(DIST)) {
    console.error("❌ links:check — falta dist/; corré `npm run build` antes");
    process.exit(2);
  }
  const broken = [];
  let checked = 0;
  for (const file of htmlFiles(DIST)) {
    // Los comentarios HTML no son referencias servidas (placeholders de galería).
    const html = readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->/g, "");
    for (const match of html.matchAll(/\b(?:href|src)="(\/(?!\/)[^"]*)"/g)) {
      checked += 1;
      if (!targetExists(DIST, match[1])) {
        broken.push(`${file.replace(DIST + "/", "")} → ${match[1]}`);
      }
    }
  }
  if (broken.length > 0) {
    console.error(`❌ links:check — ${broken.length} ruta(s) raíz-absoluta(s) sin target en dist/:`);
    for (const b of broken) console.error(`   ${b}`);
    process.exit(1);
  }
  console.log(`✅ links:check — ${checked} URLs raíz-absolutas verificadas contra dist/`);
}

main();
