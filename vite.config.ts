import { copyFileSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

/* Los 4 favicons del sitio son la copia vendored del brand kit canónico
 * (cluciani-brand-kit@tag, pinneada en brand-kit.lock.json). El icono es el
 * tile teal —único que se lee a 16 px— en SVG + 32 + 16; el transparente
 * (`favicon-aurea.svg`/`-32.png`) queda para superficies controladas y no se
 * publica como icono del sitio. Vite no publica assets absolutos de la raíz
 * (sólo public/), así que este plugin los copia a dist/assets/brand/ en cada
 * build; el espejo se verifica con brand:verify. */
const FAVICON_FILES = [
  "favicon-aurea-teal.svg",
  "favicon-aurea-teal-32.png",
  "favicon-aurea-teal-16.png",
  "apple-touch-icon-aurea.png",
];

/* El laboratorio temporal vive en proposals/ (fuente única, fuera del build)
 * y se publica en /laboratorio/ copiándolo en closeBundle. Las páginas usan
 * rutas relativas, así que el mismo folder sirve para /laboratorio/ o para un
 * subdominio cuando exista el DNS. */
const copyTimingLab = (): Plugin => ({
  name: "copy-timing-lab",
  closeBundle() {
    const root = fileURLToPath(new URL(".", import.meta.url));
    const dest = resolve(root, "dist/laboratorio");
    rmSync(dest, { recursive: true, force: true });
    cpSync(resolve(root, "proposals/logo-timing"), dest, { recursive: true });
  },
});

const copyBrandFavicon = (): Plugin => ({
  name: "copy-brand-favicon",
  closeBundle() {
    const root = fileURLToPath(new URL(".", import.meta.url));
    for (const file of FAVICON_FILES) {
      const dest = resolve(root, "dist/assets/brand", file);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(resolve(root, "assets/brand/logo", file), dest);
    }
  },
});

export default defineConfig({
  base: "/",
  plugins: [copyBrandFavicon(), copyTimingLab()],
  build: {
    sourcemap: true
  },
  test: {
    globals: true,
    // Tests cover pure functions only (no DOM/canvas), so the lighter
    // node environment is sufficient and avoids the jsdom ESM load failure.
    environment: "node"
  }
});
