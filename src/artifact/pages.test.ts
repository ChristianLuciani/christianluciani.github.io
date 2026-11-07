import { describe, expect, it } from "vitest";
import { assembleHtml } from "../templates/index.ts";
import { DEFAULT_ORIGIN, type SiteAddress } from "../themes/site.ts";
import {
  SOURCE_ENTRY,
  entryPath,
  injectEntry,
  pageFile,
  publishPage,
  sitemapXml,
  withArtifactBase
} from "./pages.ts";

/**
 * PÁGINAS DEL ARTEFACTO (SPEC §8 FASE 5.5).
 *
 * El render es el documento y no conoce la dirección (su golden queda intacto);
 * `publishPage` es el paso que produce la página de `dist/`: canónica, `og:url`,
 * `og:image` y rutas raíz-absolutas para el subpath. Estas funciones nacen antes
 * que el segundo tema (#134) para que el subpath no se "descubra" al construirlo.
 */

const ROOT: SiteAddress = { origin: DEFAULT_ORIGIN, base: "", path: "" };
const INGENIERIA: SiteAddress = { origin: DEFAULT_ORIGIN, base: "", path: "ingenieria" };
const PREFIXED: SiteAddress = { origin: "https://x.test", base: "/repo", path: "ingenieria" };

/** Fragmento con la forma que emite `assembleHtml` (head + assets + JSON-LD). */
const DOCUMENT = [
  '<meta property="og:url" content="https://christianluciani.github.io/">',
  '<meta property="og:image" content="https://christianluciani.github.io/assets/og-image.png">',
  '<meta name="twitter:image" content="https://christianluciani.github.io/assets/og-image.png">',
  '<link rel="icon" href="/assets/brand/favicon.svg">',
  '<img src="assets/icons/gmail.svg">',
  '<img src="assets/qr-site.svg">',
  '<script type="module" crossorigin src="/assets/main-abc.js"></script>',
  '<a href="https://christianluciani.github.io">site</a>',
  '<script type="application/ld+json">{"@id":"https://christianluciani.github.io"}</script>'
].join("\n");

const MANIFEST = { "src/main.ts": { file: "assets/main-abc123.js", isEntry: true } };

describe("pages — ruta de la página", () => {
  it("la raíz publica index.html y un tema publica <path>/index.html", () => {
    expect(pageFile("")).toBe("index.html");
    expect(pageFile("ingenieria")).toBe("ingenieria/index.html");
    expect(pageFile("/docs/v2/")).toBe("docs/v2/index.html");
  });
});

describe("pages — entry del bundle", () => {
  it("sale del manifest de Vite", () => {
    expect(entryPath(MANIFEST)).toBe("/assets/main-abc123.js");
  });

  it("un manifest sin entry falla nombrando el paso previo", () => {
    expect(() => entryPath({ "src/main.ts": { file: "assets/x.js" } })).toThrow(
      /vite build --manifest/
    );
  });

  it("inyecta el bundle en lugar del módulo fuente", () => {
    const html = `...${SOURCE_ENTRY}...`;
    expect(injectEntry(html, "/assets/main-abc.js")).toContain(
      '<script type="module" crossorigin src="/assets/main-abc.js"></script>'
    );
    expect(injectEntry(html, "/assets/main-abc.js")).not.toContain("/src/main.ts");
  });

  it("si el HTML no trae el módulo fuente, falla en vez de publicar sin JS", () => {
    expect(() => injectEntry("<html></html>", "/assets/main.js")).toThrow(
      /src\/artifact\/pages\.ts/
    );
  });
});

describe("pages — base del artefacto en una URL", () => {
  it("prefija las raíz-absolutas una sola vez", () => {
    expect(withArtifactBase("/assets/x.png", ROOT)).toBe("/assets/x.png");
    expect(withArtifactBase("/assets/x.png", PREFIXED)).toBe("/repo/assets/x.png");
    expect(withArtifactBase("/repo/assets/x.png", PREFIXED)).toBe("/repo/assets/x.png");
  });

  it("una ruta relativa al documento se vuelve raíz-absoluta", () => {
    expect(withArtifactBase("assets/icons/gmail.svg", ROOT)).toBe("/assets/icons/gmail.svg");
    expect(withArtifactBase("assets/icons/gmail.svg", PREFIXED)).toBe(
      "/repo/assets/icons/gmail.svg"
    );
  });

  it("no toca absolutas, data:, anclas ni protocolo-relativas", () => {
    for (const url of [
      "https://cdn.example/x.png",
      "data:image/svg+xml,x",
      "#ancla",
      "//cdn.example/x.png",
      "mailto:a@b.c"
    ]) {
      expect(withArtifactBase(url, PREFIXED), url).toBe(url);
    }
  });
});

describe("pages — publicar", () => {
  it("agrega canonical después de og:url y apunta og:url a la página", () => {
    const { html } = publishPage(DOCUMENT, ROOT);
    expect(html).toContain(
      '<meta property="og:url" content="https://christianluciani.github.io/">\n' +
        '<link rel="canonical" href="https://christianluciani.github.io/">'
    );
  });

  it("si el head no trae og:url, publicar falla en vez de salir sin canónica", () => {
    expect(() => publishPage("<html><head></head></html>", ROOT)).toThrow(/canonical/);
  });

  it("un subpath mueve canónica y og:url, no el resto del documento", () => {
    const { html } = publishPage(DOCUMENT, INGENIERIA);
    expect(html).toContain(
      '<link rel="canonical" href="https://christianluciani.github.io/ingenieria/">'
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://christianluciani.github.io/ingenieria/">'
    );
    expect(html).toContain('<a href="https://christianluciani.github.io">site</a>');
    expect(html).toContain('"@id":"https://christianluciani.github.io"');
  });

  it("origen + prefijo del tema entran en canónica, og:image y assets", () => {
    const { html } = publishPage(DOCUMENT, PREFIXED);
    expect(html).toContain('<link rel="canonical" href="https://x.test/repo/ingenieria/">');
    expect(html).toContain(
      '<meta property="og:image" content="https://x.test/repo/assets/og-image.png">'
    );
    expect(html).toContain('<link rel="icon" href="/repo/assets/brand/favicon.svg">');
    expect(html).toContain('<img src="/repo/assets/qr-site.svg">');
    expect(html).toContain('<script type="module" crossorigin src="/repo/assets/main-abc.js">');
    // Lo que es un hecho del SSOT no se reescribe por tema.
    expect(html).toContain('<a href="https://christianluciani.github.io">site</a>');
    expect(html).toContain('"@id":"https://christianluciani.github.io"');
  });

  it("deja la og:image de la CDN como está", () => {
    const cdn =
      '<meta property="og:url" content="https://christianluciani.github.io/">\n' +
      '<meta property="og:image" content="https://cdn.example/gh/o/r@v1/public/assets/og-image.png">';
    const { html } = publishPage(cdn, PREFIXED);
    expect(html).toContain('content="https://cdn.example/gh/o/r@v1/public/assets/og-image.png"');
  });

  it("el render real no deja rutas relativas al documento", () => {
    // Contrato render ↔ publicador: el render emite `assets/…` (legible en el
    // golden) y el publicador lo vuelve raíz-absoluto; si el render dejara otra
    // relativa, el subpath la resolvería contra su propio directorio.
    const { html } = publishPage(assembleHtml(), ROOT);
    expect(html).not.toMatch(/(?:src|href)="assets\//);
    expect(html).toContain('src="/assets/icons/gmail.svg"');
  });

  it("inlinea los iconos del artefacto y reporta los que no tienen archivo", () => {
    const icons = new Map([["/assets/icons/gmail.svg", "data:image/svg+xml,%3Csvg%2F%3E"]]);
    const { html, missing } = publishPage(DOCUMENT, PREFIXED, icons);
    expect(html).toContain('<img src="data:image/svg+xml,%3Csvg%2F%3E">');
    expect(missing).toEqual([]);

    const absent = publishPage(
      '<meta property="og:url" content="https://christianluciani.github.io/">\n<img src="assets/icons/x.svg">',
      ROOT
    );
    expect(absent.missing).toEqual(["/assets/icons/x.svg"]);
  });
});

describe("pages — sitemap", () => {
  it("lista las URLs publicadas, ordenado y determinista", () => {
    const xml = sitemapXml([ROOT, INGENIERIA]);
    expect(xml).toContain("<loc>https://christianluciani.github.io/</loc>");
    expect(xml).toContain("<loc>https://christianluciani.github.io/ingenieria/</loc>");
    expect(sitemapXml([INGENIERIA, ROOT])).toBe(xml);
    expect(sitemapXml([ROOT, ROOT]).match(/<loc>/g)).toHaveLength(1);
  });

  it("el prefijo de deploy entra en cada loc", () => {
    const xml = sitemapXml([PREFIXED]);
    expect(xml).toContain("<loc>https://x.test/repo/ingenieria/</loc>");
  });
});
