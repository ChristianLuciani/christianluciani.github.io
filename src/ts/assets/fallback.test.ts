import { describe, it, expect } from "vitest";
import { installAssetFallback, nextFallbackSrc } from "./fallback";

describe("nextFallbackSrc", () => {
  it("returns the local path when the CDN asset failed", () => {
    expect(
      nextFallbackSrc("https://cdn.example.com/a/x.jpg", "/assets/x.jpg", false)
    ).toBe("/assets/x.jpg");
  });

  it("does nothing when there is no local path (Pages mode)", () => {
    expect(nextFallbackSrc("/assets/x.jpg", null, false)).toBeNull();
    expect(nextFallbackSrc("https://cdn.example.com/a/x.jpg", "", false)).toBeNull();
  });

  it("never loops: a fallback that already ran is final", () => {
    expect(
      nextFallbackSrc("https://cdn.example.com/a/x.jpg", "/assets/x.jpg", true)
    ).toBeNull();
  });

  it("is a no-op when the element already points at the local copy", () => {
    expect(nextFallbackSrc("/assets/x.jpg", "/assets/x.jpg", false)).toBeNull();
  });

  it("does nothing when the src is empty (broken markup, not a CDN fault)", () => {
    expect(nextFallbackSrc("", "/assets/x.jpg", false)).toBeNull();
  });
});

/** Stub mínimo de DOM: el repo no usa jsdom (tests de funciones puras). */
function fakeElement(tagName: string, attrs: Record<string, string>) {
  const store = { ...attrs };
  return {
    tagName: tagName.toUpperCase(),
    getAttribute: (name: string) => (name in store ? store[name] : null),
    setAttribute: (name: string, value: string) => {
      store[name] = value;
    },
    hasAttribute: (name: string) => name in store,
    attrs: store,
  };
}

function fakeDocument(readyState = "complete") {
  const listeners: Array<{ type: string; fn: (event: unknown) => void }> = [];
  const links: unknown[] = [];
  const doc = {
    readyState,
    addEventListener: (type: string, fn: (event: unknown) => void) => {
      listeners.push({ type, fn });
    },
    querySelectorAll: () => links,
  };
  return {
    doc: doc as unknown as Document,
    links,
    fire: (type: string, event: unknown) =>
      listeners.filter((l) => l.type === type).forEach((l) => l.fn(event)),
  };
}

describe("installAssetFallback", () => {
  it("degrada un <img> de la CDN a la copia local, una sola vez", () => {
    const { doc, fire } = fakeDocument();
    installAssetFallback(doc);
    const img = fakeElement("img", {
      src: "https://cdn.test/a/x.jpg",
      "data-local": "/assets/x.jpg",
    });

    fire("error", { target: img });
    expect(img.attrs["src"]).toBe("/assets/x.jpg");
    expect(img.attrs["data-fallback"]).toBe("1");

    // segundo error: no re-escribe (no hay loop de reintentos)
    img.setAttribute("src", "https://cdn.test/a/x.jpg");
    fire("error", { target: img });
    expect(img.attrs["src"]).toBe("https://cdn.test/a/x.jpg");
  });

  it("degrada un favicon (<link rel=icon>) con href", () => {
    const { doc, fire } = fakeDocument();
    installAssetFallback(doc);
    const link = fakeElement("link", {
      href: "https://cdn.test/a/favicon.svg",
      "data-local": "/assets/brand/favicon-aurea.svg",
    });

    fire("error", { target: link });
    expect(link.attrs["href"]).toBe("/assets/brand/favicon-aurea.svg");
  });

  it("ignora elementos sin data-local (modo Pages)", () => {
    const { doc, fire } = fakeDocument();
    installAssetFallback(doc);
    const img = fakeElement("img", { src: "/assets/x.jpg" });

    fire("error", { target: img });
    expect(img.attrs["src"]).toBe("/assets/x.jpg");
    expect(img.attrs["data-fallback"]).toBeUndefined();
  });

  it("sonda los favicons al cargar el DOM y cambia el href si la CDN no responde", () => {
    const { doc, fire, links } = fakeDocument("loading");
    const link = fakeElement("link", {
      href: "https://cdn.test/a/favicon.svg",
      "data-local": "/assets/brand/favicon-aurea.svg",
    });
    links.push(link);

    const probes: Array<{ src: string; onerror: (() => void) | null }> = [];
    const originalImage = (globalThis as { Image?: unknown }).Image;
    (globalThis as { Image?: unknown }).Image = class {
      src = "";
      onerror: (() => void) | null = null;
      constructor() {
        probes.push(this);
      }
    };

    try {
      installAssetFallback(doc);
      fire("DOMContentLoaded", {});
      expect(probes).toHaveLength(1);
      expect(probes[0].src).toBe("https://cdn.test/a/favicon.svg");

      probes[0].onerror?.();
      expect(link.attrs["href"]).toBe("/assets/brand/favicon-aurea.svg");
    } finally {
      (globalThis as { Image?: unknown }).Image = originalImage;
    }
  });
});
