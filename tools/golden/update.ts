/**
 * GOLDEN — regenera `tests/golden/museo.html` desde `assembleHtml()`.
 *
 * Se corre SÓLO en un PR que cambia el render a propósito (rediseño, copy,
 * estructura) o el snapshot del perfil (`Datos: cambia`), y el body lo declara.
 * En un PR de refactor el golden NO se toca: si el test falla, el refactor
 * cambió el render y hay que corregirlo.
 *
 * Fija el entorno sin CDN antes de importar los templates: las rutas de assets
 * se resuelven al importar, así que borrar las variables después no alcanza.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { baselineFile } from "./paths.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = baselineFile(ROOT);

delete process.env.VITE_ASSET_BASE_URL;
delete process.env.VITE_BRAND_KIT_BASE_URL;

const { assembleHtml } = await import("../../src/templates/index.ts");
const { sectionsOf } = await import("./sections.ts");

const html = assembleHtml();
// Validar ANTES de escribir: si un marcador se rompió, el árbol queda como
// estaba en vez de reescribir el baseline y fallar después.
const sections = sectionsOf(html);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, "utf8");
const bytes = Buffer.byteLength(html, "utf8");
console.log(`✅ golden regenerado: ${bytes} bytes (${html.length} chars) · ${sections.length} secciones`);
console.log(`   ${sections.map((s) => s.name).join(" · ")}`);
console.log("   Declará el cambio: trailer `Golden-Cambio: render` (o `datos`) en un commit del PR.");
