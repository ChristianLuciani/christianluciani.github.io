/**
 * GOLDEN — regenera el baseline de CADA tema registrado (`tests/golden/<id>.html`)
 * desde `assembleHtml({ theme })`.
 *
 * Se corre SÓLO en un PR que cambia el render a propósito (rediseño, copy,
 * estructura) o un sync de datos (`Golden-Cambio: render|datos` en el commit).
 * En un PR de refactor el golden NO se toca: si el test falla, el refactor
 * cambió el render y hay que corregirlo.
 *
 * `museo` es el tema default y su baseline es el del `index.html` commiteado;
 * un tema nuevo agrega su propio `tests/golden/<id>.html` (gate de #133: sin
 * baseline el tema no tiene gate de render). Como los baselines nuevos son
 * artefactos nuevos —no un cambio del render del default—, la guarda de
 * trailers de CI (`golden:policy`) sigue mirando el baseline del default.
 *
 * Fija el entorno sin CDN antes de importar los templates: las rutas de assets
 * se resuelven al importar, así que borrar las variables después no alcanza.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { baselinePathFor } from "./paths.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

delete process.env.VITE_ASSET_BASE_URL;
delete process.env.VITE_BRAND_KIT_BASE_URL;

const { assembleHtml } = await import("../../src/templates/index.ts");
const { sectionsOf } = await import("./sections.ts");
const { THEMES, themeIds } = await import("../../src/themes/index.ts");

for (const id of themeIds()) {
  const html = assembleHtml({ theme: THEMES[id] });
  // Validar ANTES de escribir: si un marcador se rompió, el árbol queda como
  // estaba en vez de reescribir el baseline y fallar después.
  const sections = sectionsOf(html);
  const out = resolve(ROOT, baselinePathFor(id));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html, "utf8");
  const bytes = Buffer.byteLength(html, "utf8");
  console.log(
    `✅ golden ${id}: ${bytes} bytes (${html.length} chars) · ${sections.length} secciones`
  );
  console.log(`   ${baselinePathFor(id)} · ${sections.map((s) => s.name).join(" · ")}`);
}
console.log("   Declará el cambio: trailer `Golden-Cambio: render` (o `datos`) en un commit del PR.");
