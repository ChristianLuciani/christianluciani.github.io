import { describe, it, expect } from "vitest";
import {
  absoluteAssetUrl,
  assetAttrs,
  assetAttrsFor,
  assetUrl,
  brandKitRepoPath,
  cdnAssetUrl,
  cdnRepoPath,
  normalizeBase,
} from "./url";

describe("assetUrl", () => {
  it("returns relative path when VITE_ASSET_BASE_URL is not set", () => {
    expect(assetUrl("assets/images/papers/foo.svg")).toBe(
      "assets/images/papers/foo.svg"
    );
  });

  it("resolves a paper key via manifest when kind is papers", () => {
    const url = assetUrl("trujillo2025", "papers");
    expect(url).toContain("assets/images/papers/");
    expect(url).toContain("trujillo2025_thumb.svg");
  });
});

describe("normalizeBase", () => {
  it("returns empty for undefined, null, blank", () => {
    expect(normalizeBase(undefined)).toBe("");
    expect(normalizeBase(null)).toBe("");
    expect(normalizeBase("   ")).toBe("");
  });

  it("strips trailing slashes and keeps the origin + path", () => {
    expect(normalizeBase("https://cdn.example.com/gh/u/r@v1.0.0///")).toBe(
      "https://cdn.example.com/gh/u/r@v1.0.0"
    );
  });

  it("refuses a non-http base instead of emitting a broken URL", () => {
    expect(() => normalizeBase("cdn.example.com")).toThrow(/http\(s\)/);
    expect(() => normalizeBase("javascript:alert(1)")).toThrow(/http\(s\)/);
  });
});

describe("cdnRepoPath — familias servidas", () => {
  it("maps the QR and the images tree to public/", () => {
    expect(cdnRepoPath("/assets/qr-site.svg")).toBe("public/assets/qr-site.svg");
    expect(cdnRepoPath("/assets/images/papers/x.svg")).toBe(
      "public/assets/images/papers/x.svg"
    );
  });

  it("maps audio to public/audio", () => {
    expect(cdnRepoPath("/audio/room-s001.mp3")).toBe(
      "public/audio/room-s001.mp3"
    );
  });

  it("leaves repo-root files alone (they are not under public/)", () => {
    expect(cdnRepoPath("/robots.txt")).toBe("robots.txt");
  });
});

describe("assetUrl con base explícita (regresión #85 F5)", () => {
  it("resuelve una clave de papers por la CDN con el mapa de repo", () => {
    expect(
      assetUrl("trujillo2025", "papers", "https://cdn.test/gh/o/r@v1")
    ).toBe("https://cdn.test/gh/o/r@v1/public/assets/images/papers/trujillo2025_thumb.svg");
  });

  it("sin base devuelve la ruta servida relativa, como antes", () => {
    expect(assetUrl("assets/images/papers/foo.svg", undefined, "")).toBe(
      "assets/images/papers/foo.svg"
    );
  });
});

describe("cdnAssetUrl", () => {
  it("joins the base and the served path without double slashes", () => {
    // /assets/** se sirve desde public/assets/ (Vite publica public/ en la raíz)
    expect(cdnAssetUrl("/assets/x.jpg", "https://cdn.example.com/base")).toBe(
      "https://cdn.example.com/base/public/assets/x.jpg"
    );
    expect(cdnAssetUrl("assets/x.jpg", "https://cdn.example.com/base")).toBe(
      "https://cdn.example.com/base/public/assets/x.jpg"
    );
  });

  it("falls back to the root-absolute Pages path when there is no base", () => {
    expect(cdnAssetUrl("/assets/x.jpg", "")).toBe("/assets/x.jpg");
  });
});

describe("assetAttrs", () => {
  it("emits src + data-local when the CDN is active", () => {
    const attrs = assetAttrs("/assets/x.jpg", "https://cdn.example.com/b");
    expect(attrs).toBe(
      'src="https://cdn.example.com/b/public/assets/x.jpg" data-local="/assets/x.jpg"'
    );
  });

  it("emits only src (no fallback surface) when serving from Pages", () => {
    const attrs = assetAttrs("/assets/x.jpg", "");
    expect(attrs).toBe('src="/assets/x.jpg"');
    expect(attrs).not.toContain("data-local");
  });
});

describe("absoluteAssetUrl", () => {
  it("uses the CDN when active", () => {
    expect(
      absoluteAssetUrl("/assets/og.png", "https://site.test", "https://cdn.test/b")
    ).toBe("https://cdn.test/b/public/assets/og.png");
  });

  it("uses the site origin otherwise (crawler needs an absolute URL)", () => {
    expect(absoluteAssetUrl("/assets/og.png", "https://site.test/", "")).toBe(
      "https://site.test/assets/og.png"
    );
  });
});

describe("cdnRepoPath", () => {
  it("maps the published favicons back to their repo home", () => {
    expect(cdnRepoPath("/assets/brand/favicon-aurea.svg")).toBe(
      "assets/brand/logo/favicon-aurea.svg"
    );
    expect(cdnRepoPath("/assets/brand/apple-touch-icon-aurea.png")).toBe(
      "assets/brand/logo/apple-touch-icon-aurea.png"
    );
  });

  it("maps the OG to public/ (Vite publica public/ en la raíz)", () => {
    expect(cdnRepoPath("/assets/og-image.png")).toBe("public/assets/og-image.png");
  });

  it("maps the whole /assets/images/** tree to public/", () => {
    expect(cdnRepoPath("/assets/images/papers/trujillo2025_thumb.svg")).toBe(
      "public/assets/images/papers/trujillo2025_thumb.svg"
    );
  });

  it("maps the 4 thumbs to public/ (servidas sin hash, copiadas tal cual)", () => {
    expect(cdnRepoPath("/assets/kontablo2026_thumb-7y4PiTON.jpg")).toBe(
      "public/assets/kontablo2026_thumb-7y4PiTON.jpg"
    );
    expect(cdnRepoPath("/assets/hosaka2006_thumb-KMqoFzTp.jpg")).toBe(
      "public/assets/hosaka2006_thumb-KMqoFzTp.jpg"
    );
  });
});

describe("brand kit — marca separada del runtime", () => {
  it("mapea /assets/brand/** a assets/logo/** del brand kit", () => {
    expect(brandKitRepoPath("/assets/brand/favicon-aurea.svg")).toBe(
      "assets/logo/favicon-aurea.svg"
    );
    expect(brandKitRepoPath("/assets/og-image.png")).toBe(null);
  });

  it("usa la base del brand kit para la marca, no la del sitio", () => {
    expect(
      cdnAssetUrl(
        "/assets/brand/favicon-aurea.svg",
        "https://site.test@v1",
        "https://brand.test@v1"
      )
    ).toBe("https://brand.test@v1/assets/logo/favicon-aurea.svg");
  });

  it("sin base de brand kit cae a la copia local, no al CDN del sitio", () => {
    expect(
      cdnAssetUrl("/assets/brand/favicon-aurea.svg", "https://site.test@v1", "")
    ).toBe("/assets/brand/favicon-aurea.svg");
  });

  it("emite data-local para el fallback de marca", () => {
    expect(
      assetAttrsFor("href", "/assets/brand/favicon-aurea.svg", "", "https://brand.test@v1")
    ).toBe(
      'href="https://brand.test@v1/assets/logo/favicon-aurea.svg" data-local="/assets/brand/favicon-aurea.svg"'
    );
  });

  it("nombra la variable correcta en el error de base inválida", () => {
    expect(() => normalizeBase("brand.test", "VITE_BRAND_KIT_BASE_URL")).toThrow(
      /VITE_BRAND_KIT_BASE_URL/
    );
  });
});
