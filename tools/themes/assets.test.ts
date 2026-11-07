import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { museo } from "../../src/themes/museo/narrative.ts";
import {
  DEFAULT_ORIGIN,
  pageUrl,
  servedAssetPath,
  type SiteAddress
} from "../../src/themes/site.ts";
import { AUDIO_TRACKS } from "../../src/ts/app/runtime-assets.ts";
import { assetRefs, checkThemeAssets, resolveAssetUrl } from "./assets.ts";

/**
 * SMOKE DE ASSETS (SPEC §8 FASE 5.5 · ADR-001 I6).
 *
 * El gate tiene que morder: un asset faltante, una URL relativa al documento, un
 * sitemap que no coincide con las páginas publicadas y —F1 del pase fresco de
 * #153— un recurso del RUNTIME ausente o un bundle compilado con otra base. El
 * artefacto multi-tema se simula en un directorio temporal: el registro tiene un
 * solo tema hasta #134.
 */

const ROOT: SiteAddress = { origin: DEFAULT_ORIGIN, base: "", path: "" };
const INGENIERIA: SiteAddress = { origin: DEFAULT_ORIGIN, base: "", path: "ingenieria" };
const PREFIXED: SiteAddress = {
  origin: DEFAULT_ORIGIN,
  base: "/repo",
  path: "ingenieria"
};

const THEMES = [
  { ...museo, path: "" },
  { ...museo, id: "ingenieria", path: "ingenieria" }
];

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function writeArtifact(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "themes-assets-"));
  dirs.push(dir);
  for (const [path, content] of Object.entries(files)) {
    const file = join(dir, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content, "utf8");
  }
  return dir;
}

/** Página publicada con la forma que produce `publishPage`. */
function page(address: SiteAddress): string {
  const asset = (path: string) => servedAssetPath(path, address);
  return `<!DOCTYPE html><html><head>
<link rel="canonical" href="${pageUrl(address)}">
<link rel="icon" href="${asset("/assets/brand/favicon.svg")}">
<meta property="og:image" content="${address.origin}${asset("/assets/og.png")}">
<meta name="description" content="texto, no una URL">
</head><body>
<img src="${asset("/assets/icons/gmail.svg")}">
<img src="data:image/svg+xml,%3Csvg%2F%3E">
<a href="https://example.com">externo</a>
<script type="module" crossorigin src="${asset("/assets/main.js")}"></script>
</body></html>`;
}

function sitemap(addresses: SiteAddress[]): string {
  return `<urlset>${addresses.map((address) => `<loc>${pageUrl(address)}</loc>`).join("")}</urlset>`;
}

function artifact(
  options: { addresses?: SiteAddress[]; overrides?: Record<string, string> } = {}
): string {
  const addresses = options.addresses ?? [ROOT, INGENIERIA];
  const files: Record<string, string> = {
    "assets/brand/favicon.svg": "<svg/>",
    "assets/icons/gmail.svg": "<svg/>",
    "assets/og.png": "png",
    "assets/main.js": "console.log(1)",
    "robots.txt": "User-agent: *\nAllow: /\n",
    "sitemap.xml": sitemap(addresses),
    "laboratorio/index.html": "<!DOCTYPE html>"
  };
  for (const address of addresses) {
    const file = address.path ? `${address.path}/index.html` : "index.html";
    files[file] = page(address);
  }
  for (const track of Object.values(AUDIO_TRACKS)) files[track] = "mp3";
  return writeArtifact({ ...files, ...options.overrides });
}

describe("themes/assets — referencias", () => {
  it("lee src/href/data-local/meta content y descarta texto y <a href>", () => {
    const refs = assetRefs(page(ROOT)).map((ref) => ref.url);
    expect(refs).toContain("/assets/icons/gmail.svg");
    expect(refs).toContain("/assets/main.js");
    expect(refs).toContain("https://christianluciani.github.io/assets/og.png");
    expect(refs).toContain("https://christianluciani.github.io/");
    expect(refs).not.toContain("https://example.com");
    expect(refs).not.toContain("texto, no una URL");
  });

  it("no cuenta un asset documentado dentro de un comentario HTML", () => {
    const html = '<!-- añade <img src="ruta/foto.jpg"> --><img src="/assets/x.png">';
    expect(assetRefs(html).map((ref) => ref.url)).toEqual(["/assets/x.png"]);
  });
});

describe("themes/assets — resolución", () => {
  it("raíz-absoluto y absoluto del sitio resuelven a una ruta del artefacto", () => {
    expect(resolveAssetUrl("/assets/x.png", ROOT)).toEqual({ kind: "local", path: "assets/x.png" });
    expect(resolveAssetUrl(`${DEFAULT_ORIGIN}/assets/x.png`, ROOT)).toEqual({
      kind: "local",
      path: "assets/x.png"
    });
  });

  it("un origen externo, data: o mailto: no se verifica", () => {
    for (const url of [
      "https://cdn.example/x.png",
      "//cdn.example/x.png",
      "data:image/svg+xml,x",
      "mailto:a@b.c"
    ]) {
      expect(resolveAssetUrl(url, ROOT), url).toEqual({ kind: "external" });
    }
  });

  it("una URL relativa al documento es un error de contrato (rompe en subpath)", () => {
    const resolved = resolveAssetUrl("assets/qr.svg", ROOT);
    expect(resolved.kind).toBe("invalid");
    if (resolved.kind === "invalid") expect(resolved.reason).toContain("relativa");
  });

  it("con prefijo de deploy, el asset tiene que estar dentro del prefijo", () => {
    expect(resolveAssetUrl("/repo/assets/x.png", PREFIXED)).toEqual({
      kind: "local",
      path: "assets/x.png"
    });
    expect(resolveAssetUrl("/assets/x.png", PREFIXED).kind).toBe("invalid");
  });

  it("ignora query y hash", () => {
    expect(resolveAssetUrl("/assets/x.png?v=1#f", ROOT)).toEqual({
      kind: "local",
      path: "assets/x.png"
    });
  });
});

describe("themes/assets — gate del artefacto", () => {
  it("un artefacto completo pasa", () => {
    const report = checkThemeAssets({ distDir: artifact(), themes: THEMES });
    expect(report.errors).toEqual([]);
    expect(report.missing).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.pages.map((check) => check.page)).toEqual(["index.html", "ingenieria/index.html"]);
  });

  it("un asset referenciado que no está en dist falla con página y URL", () => {
    const dir = artifact();
    rmSync(join(dir, "assets/icons/gmail.svg"));
    const broken = checkThemeAssets({ distDir: dir, themes: THEMES });
    expect(broken.ok).toBe(false);
    expect(broken.missing.map((issue) => issue.url)).toContain("/assets/icons/gmail.svg");
    expect(broken.missing[0].page).toMatch(/index\.html$/);
  });

  it("una página publicada que falta es un error estructural", () => {
    const dir = artifact();
    rmSync(join(dir, "ingenieria/index.html"));
    const report = checkThemeAssets({ distDir: dir, themes: THEMES });
    expect(report.ok).toBe(false);
    expect(report.errors.join("\n")).toContain("ingenieria/index.html");
  });

  it("el sitemap tiene que listar exactamente las páginas publicadas", () => {
    const missing = checkThemeAssets({
      distDir: artifact({ overrides: { "sitemap.xml": sitemap([ROOT]) } }),
      themes: THEMES
    });
    expect(missing.errors.join("\n")).toContain("/ingenieria/");

    const extra = checkThemeAssets({
      distDir: artifact({ overrides: { "sitemap.xml": sitemap([ROOT, INGENIERIA, { ...ROOT, path: "viejo" }]) } }),
      themes: THEMES
    });
    expect(extra.errors.join("\n")).toContain("/viejo/");
  });

  it("sin robots.txt el deploy no trae la política IA", () => {
    const dir = artifact();
    rmSync(join(dir, "robots.txt"));
    expect(checkThemeAssets({ distDir: dir, themes: THEMES }).errors.join("\n")).toContain(
      "robots.txt"
    );
  });
});

/**
 * F1 del pase fresco de #153: el smoke no puede mirar sólo el HTML. El runtime
 * (audio y laboratorio) pide sus archivos por URL y el bundle compila la base;
 * sin estas dos verificaciones, `SITE_BASE` roto pasaba verde.
 */
describe("themes/assets — recursos del runtime", () => {
  it("un audio o el laboratorio ausentes son un error", () => {
    const dir = artifact();
    rmSync(join(dir, "audio/whale-song.mp3"));
    rmSync(join(dir, "laboratorio"), { recursive: true });
    const errors = checkThemeAssets({ distDir: dir, themes: THEMES }).errors.join("\n");
    expect(errors).toContain("audio/whale-song.mp3");
    expect(errors).toContain("laboratorio/index.html");
  });

  it("con base, el bundle tiene que compilarla (BASE_URL del runtime)", () => {
    const themes = [{ ...museo, path: "", site: { origin: DEFAULT_ORIGIN, base: "/repo" } }];
    const address: SiteAddress = { origin: DEFAULT_ORIGIN, base: "/repo", path: "" };

    const good = artifact({
      addresses: [address],
      overrides: { "assets/main.js": 'const d="/repo/audio/"' }
    });
    expect(checkThemeAssets({ distDir: good, env: {}, themes }).ok).toBe(true);

    const stale = artifact({
      addresses: [address],
      overrides: { "assets/main.js": 'const d="/audio/"' }
    });
    const report = checkThemeAssets({ distDir: stale, env: {}, themes });
    expect(report.errors.join("\n")).toContain("no compila la base /repo");
  });
});
