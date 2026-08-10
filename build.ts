/**
 * build.ts — ensambla src/templates + SALAS → index.html (SPEC §3.2 / Fase 2).
 *
 * Uso: node build.ts   (luego `vite build` bundlea el index.html generado).
 * El index.html es GENERADO: editar contenido = editar src/ y re-build.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assembleHtml } from "./src/templates/index.ts";

const html = assembleHtml();
const out = resolve(process.cwd(), "index.html");
writeFileSync(out, html, "utf8");
console.log(`✅ index.html generado (${html.length} bytes) → ${out}`);
