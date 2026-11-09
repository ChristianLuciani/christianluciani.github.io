#!/usr/bin/env node
/**
 * check-artifact-links — gate sobre el artefacto: TODA URL raíz-absoluta que
 * cualquier página de dist/ referencia en href/src (anchors incluidos) debe
 * existir dentro de dist/. Base-aware: con --base /demo (o SITE_BASE) se
 * pela el prefijo antes de resolver, así el gate también cubre el build bajo
 * SITE_BASE (#145, F3 del review del pase 6, F2 del pase 7).
 *
 * Uso: npm run build && npm run links:check
 *      node tools/check-artifact-links.mjs --dist dist-base --base /demo
 * Exit 0 OK · 1 hay rutas rotas · 2 falta dist/.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

function parseArgs(argv) {
  const out = { dist: resolve(process.cwd(), "dist"), base: process.env.SITE_BASE ?? "" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--dist") out.dist = resolve(process.cwd(), argv[++i]);
    else if (argv[i] === "--base") out.base = argv[++i];
    else throw new Error(`argumento desconocido: ${argv[i]}`);
  }
  out.base = out.base.replace(/\/+$/, "");
  return out;
}

const { dist: DIST, base: BASE } = parseArgs(process.argv.slice(2));

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
  // Bajo SITE_BASE las URLs llevan el prefijo: se pela antes de resolver.
  let clean = urlPath.split(/[?#]/)[0];
  if (BASE && (clean === BASE || clean.startsWith(`${BASE}/`))) clean = clean.slice(BASE.length) || "/";
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
