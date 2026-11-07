/**
 * build.ts — ensambla src/templates + la narrativa del tema → index.html
 * (SPEC §3.2/§5.4 · Fase 2/5.3).
 *
 * Uso: [SITE_THEME=<id>] node build.ts   (luego `vite build` bundlea el index.html).
 * El index.html es GENERADO: editar contenido = editar src/ y re-build.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assembleHtml } from "./src/templates/index.ts";
import { resolveTheme } from "./src/themes/index.ts";

// Selector único de build (ADR-001 §2). Se resuelve ANTES de ensamblar: un id
// inválido falla listando los temas válidos y no escribe un index.html con el
// tema default (publicaría la raíz con la narrativa equivocada).
const theme = resolveTheme(process.env.SITE_THEME);
const html = assembleHtml({ theme });
const out = resolve(process.cwd(), "index.html");
writeFileSync(out, html, "utf8");
console.log(`✅ index.html generado (${html.length} bytes) → ${out} · tema: ${theme.id}`);
