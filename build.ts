/**
 * build.ts — render del documento + publicación del artefacto (SPEC §8 FASE
 * 5.5 · ADR-001 D12).
 *
 * Dos salidas distintas, un solo generador:
 *   · modo fuente (sin flags) → `<repo>/index.html`. Es el render COMMITEADO y
 *     el baseline del golden (`build.test.ts` lo compara con `assembleHtml()`);
 *     SIEMPRE es el tema default, así `SITE_THEME` no puede ensuciar el archivo
 *     commiteado ni el golden (invariante del epic #125).
 *   · modo artefacto (`--dist`) → `dist/<path>/index.html` por tema +
 *     `sitemap.xml`. Aplica la dirección del tema (canónica, og, subpath) y el
 *     entry hasheado que dejó `vite build --manifest`.
 *
 * Uso:
 *   tsx build.ts                              # render fuente (tema default)
 *   tsx build.ts --dist                       # todos los temas del registro
 *   SITE_THEME=<id> tsx build.ts --dist       # sólo ese tema (artefacto propio)
 *   tsx build.ts --dist [--out dist] [--manifest dist/.vite/manifest.json]
 *
 * `SITE_ORIGIN`/`SITE_BASE` overridean la dirección declarada por cada tema.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { assembleHtml } from "./src/templates/index.ts";
import { DEFAULT_THEME, THEMES, artifactBase, buildThemes } from "./src/themes/index.ts";
import { resolveThemeAddress, type SiteAddress } from "./src/themes/site.ts";
import type { NarrativeManifest } from "./src/themes/types.ts";
import {
  entryPath,
  injectEntry,
  pageFile,
  publishPage,
  sitemapXml
} from "./src/artifact/pages.ts";

interface Options {
  readonly dist: boolean;
  readonly out: string;
  readonly manifest: string;
}

function parseArgs(argv: readonly string[]): Options {
  const options = { dist: false, out: "dist", manifest: "dist/.vite/manifest.json" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dist") options.dist = true;
    else if (arg === "--out" || arg === "--manifest") {
      const value = argv[i + 1];
      if (!value) throw new Error(`build: ${arg} requiere un valor`);
      if (arg === "--out") options.out = value;
      else options.manifest = value;
      i += 1;
    } else {
      throw new Error(`build: argumento desconocido "${arg}"`);
    }
  }
  return options;
}

/**
 * Iconos de contacto → `data:` URI (0 requests, `docs/cdn-decision.md`). La
 * fuente es `assets/icons/`; el render los pide relativos y el publicador los
 * vuelve raíz-absolutos antes de inlinearlos.
 */
function iconDataUris(): Map<string, string> {
  const dir = resolve(process.cwd(), "assets/icons");
  const icons = new Map<string, string>();
  for (const file of readdirSync(dir)) {
    const svg = readFileSync(resolve(dir, file), "utf8");
    icons.set(`/assets/icons/${file}`, `data:image/svg+xml,${encodeURIComponent(svg)}`);
  }
  return icons;
}

/** Renderiza y publica un tema en su `dist/<path>/index.html`. */
function publishTheme(
  theme: NarrativeManifest,
  address: SiteAddress,
  entry: string,
  icons: ReadonlyMap<string, string>,
  outDir: string
): void {
  const published = publishPage(injectEntry(assembleHtml({ theme }), entry), address, icons);
  if (published.missing.length > 0) {
    throw new Error(`build: icono sin archivo en assets/icons: ${published.missing.join(", ")}`);
  }
  const file = resolve(outDir, pageFile(theme.path));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, published.html, "utf8");
  console.log(`✅ ${file} (${published.html.length} bytes) · tema: ${theme.id}`);
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  // Valida `SITE_THEME` SIEMPRE (un typo no puede pasar en silencio ni en el
  // render fuente, que no lo usa). En modo artefacto decide qué temas se
  // publican; sin selector, todos.
  const themes = buildThemes();

  if (!options.dist) {
    // Render fuente: SIEMPRE el tema default. El archivo commiteado y su golden
    // no dependen de `SITE_THEME` ni de la dirección de deploy.
    const theme = THEMES[DEFAULT_THEME];
    const html = assembleHtml({ theme });
    const out = resolve(process.cwd(), "index.html");
    writeFileSync(out, html, "utf8");
    console.log(`✅ index.html generado (${html.length} bytes) → ${out} · tema: ${theme.id}`);
    return;
  }

  const outDir = resolve(process.cwd(), options.out);
  const manifestPath = resolve(process.cwd(), options.manifest);
  if (!existsSync(manifestPath)) {
    throw new Error(
      `build: falta ${manifestPath}; corré \`vite build --manifest\` antes de \`build.ts --dist\``
    );
  }
  // Valida que los temas del build compartan prefijo ANTES de escribir nada.
  artifactBase();
  const addresses = themes.map((theme) => resolveThemeAddress(theme));
  const entry = entryPath(
    JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
      string,
      { file: string; isEntry?: boolean }
    >
  );

  const icons = iconDataUris();
  themes.forEach((theme, index) => publishTheme(theme, addresses[index], entry, icons, outDir));

  const sitemap = resolve(outDir, "sitemap.xml");
  writeFileSync(sitemap, sitemapXml(addresses), "utf8");
  console.log(`✅ ${sitemap} · ${addresses.length} URL(s) · entry: ${entry}`);

  // El manifest es insumo del build, no parte del artefacto servido.
  const viteDir = resolve(outDir, ".vite");
  if (existsSync(viteDir)) rmSync(viteDir, { recursive: true, force: true });
}

main();
