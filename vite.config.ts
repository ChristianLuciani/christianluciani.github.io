import { copyFileSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { PRINT_LOGO_PATH } from "./src/templates/print-tokens.ts";
import { artifactBase } from "./src/themes/index.ts";

const ROOT = fileURLToPath(new URL(".", import.meta.url));

/* Base del artefacto (SPEC §8 FASE 5.5): la declara cada tema en su manifest y
 * `SITE_BASE` la overridea; `artifactBase()` exige que los temas del build
 * compartan el prefijo. Vite la usa para el `base` del bundle y
 * `import.meta.env.BASE_URL`, que es lo que resuelve los recursos del runtime
 * (`src/ts/app/runtime-assets.ts`). `""` ⇒ la raíz del dominio, el caso de Pages. */
const ASSET_BASE = artifactBase();

/* Copia vendored de los assets de marca que el sitio SIRVE, pineada en
 * brand-kit.lock.json (cluciani-brand-kit@tag).
 *   · 4 favicons: el tile teal —único que se lee a 16 px— en SVG + 32 + 16; el
 *     transparente (`favicon-aurea.svg`/`-32.png`) queda para superficies
 *     controladas y no se publica como icono del sitio.
 *   · logo de impresión (#122): el print-CV lo referencia con `assetAttrsFor`,
 *     así que el espejo local tiene que existir en `dist/assets/brand/` para el
 *     fallback sin CDN.
 * Vite no publica assets absolutos de la raíz (sólo public/), así que este
 * plugin los copia en cada build; el espejo se verifica con brand:verify. */
const BRAND_SERVED_FILES = [
  "favicon-aurea-teal.svg",
  "favicon-aurea-teal-32.png",
  "favicon-aurea-teal-16.png",
  "apple-touch-icon-aurea.png",
  // ruta servida declarada en `print-tokens.ts`: acá se deriva el basename
  PRINT_LOGO_PATH.split("/").pop()!,
];

/* El laboratorio temporal vive en proposals/ (fuente única, fuera del build)
 * y se publica en /laboratorio/ copiándolo en closeBundle. Las páginas usan
 * rutas relativas, así que el mismo folder sirve para /laboratorio/ o para un
 * subdominio cuando exista el DNS. */
const copyTimingLab = (): Plugin => ({
  name: "copy-timing-lab",
  closeBundle() {
    const dest = resolve(ROOT, "dist/laboratorio");
    rmSync(dest, { recursive: true, force: true });
    cpSync(resolve(ROOT, "proposals/logo-timing"), dest, { recursive: true });
  },
});

const copyBrandAssets = (): Plugin => ({
  name: "copy-brand-assets",
  closeBundle() {
    for (const file of BRAND_SERVED_FILES) {
      const dest = resolve(ROOT, "dist/assets/brand", file);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(resolve(ROOT, "assets/brand/logo", file), dest);
    }
  },
});

export default defineConfig({
  base: `${ASSET_BASE}/`,
  plugins: [copyBrandAssets(), copyTimingLab()],
  build: {
    sourcemap: true,
    // El HTML no es entry de Vite: lo escribe `build.ts` (modo `--dist`) con la
    // ruta del bundle inyectada. Vite sólo produce el JS + el manifest; así
    // ninguna URL del render la reescribe el bundler (las genera `site.ts`).
    manifest: true,
    rollupOptions: { input: resolve(ROOT, "src/main.ts") }
  },
  test: {
    globals: true,
    // Tests cover pure functions only (no DOM/canvas), so the lighter
    // node environment is sufficient and avoids the jsdom ESM load failure.
    environment: "node",
    // Los worktrees W3 viven dentro del repo (.worktrees/) y son copias del
    // mismo código en otra rama: si entran al discovery, la suite local corre
    // el test de cada worktree contra el árbol del checkout y falla por drift
    // entre ramas (no por un defecto del código).
    exclude: ["**/node_modules/**", "**/dist/**", ".worktrees/**"]
  }
});
