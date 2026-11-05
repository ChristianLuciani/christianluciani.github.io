/**
 * GOLDEN — regenera `tests/golden/museo.html` desde `assembleHtml()`.
 *
 * Se corre SÓLO en un PR cuyo propósito es cambiar el render (rediseño, copy,
 * estructura) y el body del PR lo declara. En un PR de refactor el golden NO se
 * toca: si el test falla, el refactor cambió el render y hay que corregirlo.
 *
 * Fija el entorno sin CDN antes de importar los templates: las rutas de assets
 * se resuelven al importar, así que borrar las variables después no alcanza.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = resolve(ROOT, "tests/golden/museo.html");

delete process.env.VITE_ASSET_BASE_URL;
delete process.env.VITE_BRAND_KIT_BASE_URL;

const { assembleHtml } = await import("../../src/templates/index.ts");
const { sectionsOf } = await import("./sections.ts");

const html = assembleHtml();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, "utf8");

const sections = sectionsOf(html);
console.log(`✅ golden regenerado: ${html.length} bytes · ${sections.length} secciones`);
console.log(`   ${sections.map((s) => s.name).join(" · ")}`);
console.log("   Declará el cambio de render en el body del PR.");
