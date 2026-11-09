/**
 * build-clients — CLI fino sobre src/clients/publish.ts: genera las páginas
 * `/clients/<slug>/` desde el registro de clientes (#145 §1). Un slug = un
 * archivo de config; acá no hay ningún slug hardcodeado.
 *
 *   · modo fuente (sin flags) → `clients/<slug>/index.html` + `clients/index.html`
 *     en la raíz del repo (commiteados; el test de drift los compara con el
 *     render, igual que index.html vs assembleHtml()).
 *   · modo artefacto (`--dist`) → `dist/clients/<slug>/index.html` con el entry
 *     del bundle del lab inyectado desde el manifest de Vite.
 *
 * Uso:
 *   tsx tools/build-clients.ts                 # fuente
 *   tsx tools/build-clients.ts --check         # falla si hay drift en la fuente
 *   tsx tools/build-clients.ts --dist [--out dist] [--manifest dist/.vite/manifest.json]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { clientSourceFiles, labEntryPath, publishClientPages } from "../src/clients/publish.ts";
import { validateClients } from "../src/content/clients/index.ts";
import { artifactBase } from "../src/themes/index.ts";

interface Options {
  dist: boolean;
  check: boolean;
  out: string;
  manifest: string;
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = { dist: false, check: false, out: "dist", manifest: "dist/.vite/manifest.json" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dist") options.dist = true;
    else if (arg === "--check") options.check = true;
    else if (arg === "--out" || arg === "--manifest") {
      const value = argv[i + 1];
      if (!value) throw new Error(`build-clients: ${arg} requiere un valor`);
      if (arg === "--out") options.out = value;
      else options.manifest = value;
      i += 1;
    } else {
      throw new Error(`build-clients: argumento desconocido "${arg}"`);
    }
  }
  return options;
}

function writeAll(root: string, files: Record<string, string>): string[] {
  const written: string[] = [];
  for (const [relative, html] of Object.entries(files)) {
    const file = resolve(root, relative);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html, "utf8");
    written.push(relative);
  }
  return written;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  validateClients();
  if (!options.dist) {
    const files = clientSourceFiles();
    if (options.check) {
      const drifted = Object.entries(files).filter(
        ([relative, html]) =>
          !existsSync(resolve(process.cwd(), relative)) ||
          readFileSync(resolve(process.cwd(), relative), "utf8") !== html
      );
      if (drifted.length > 0) {
        console.error(
          `build-clients: drift en ${drifted.map(([f]) => f).join(", ")} — corré \`npm run build:clients\``
        );
        process.exit(1);
      }
      console.log("✅ clients/ sin drift");
      return;
    }
    for (const file of writeAll(process.cwd(), files)) console.log(`✅ ${file}`);
    return;
  }
  const manifestPath = resolve(process.cwd(), options.manifest);
  if (!existsSync(manifestPath)) {
    throw new Error(`build-clients: falta ${manifestPath}; corré \`vite build --manifest\` antes`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
    string,
    { file: string; isEntry?: boolean }
  >;
  const labEntry = labEntryPath(manifest);
  const base = artifactBase();
  const files = publishClientPages(clientSourceFiles(), labEntry, base);
  for (const file of writeAll(resolve(process.cwd(), options.out), files)) {
    console.log(`✅ ${options.out}/${file}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
