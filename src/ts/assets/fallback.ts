/**
 * Fallback de assets: si la CDN configurada en `VITE_ASSET_BASE_URL` no
 * responde, el asset vuelve a la copia que sirve GitHub Pages.
 *
 * ADR `docs/cdn-decision.md`: el fallback es parte de la decisión, no un
 * extra. Sin esto, "degradar a local" sería una afirmación sin código.
 *
 * El build emite `data-local` sólo cuando la URL del `src` apunta a la CDN
 * (ver `assetAttrs` en ./url.ts), así que en modo Pages este módulo es un
 * no-op.
 */

/**
 * Próximo `src` ante un error de carga: la ruta local, o null si no hay nada
 * que hacer. Un asset que falla dos veces no se reintenta en loop.
 */
export function nextFallbackSrc(
  currentSrc: string,
  localPath: string | null | undefined,
  alreadyUsed: boolean
): string | null {
  if (!localPath) return null;
  if (alreadyUsed) return null;
  if (!currentSrc) return null;
  if (currentSrc.endsWith(localPath)) return null;
  return localPath;
}

type FallbackTarget = {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
};

function applyFallback(el: FallbackTarget, attr: "src" | "href"): void {
  const local = el.getAttribute("data-local");
  const current = el.getAttribute(attr) ?? "";
  const next = nextFallbackSrc(
    current,
    local,
    el.getAttribute("data-fallback") === "1"
  );
  if (!next) return;
  el.setAttribute("data-fallback", "1");
  el.setAttribute(attr, next);
}

/**
 * Instala el fallback: captura errores de carga de `<img>` / `<link>` con
 * `data-local` y, para favicons (cuyo error no siempre burbujea), los prueba
 * con un `Image()` y cambia el `href` si la CDN no responde.
 */
export function installAssetFallback(doc: Document = document): void {
  doc.addEventListener(
    "error",
    (event) => {
      const target = event.target as Element | null;
      if (!target || !target.hasAttribute?.("data-local")) return;
      const tag = target.tagName?.toLowerCase();
      if (tag === "img") applyFallback(target as unknown as FallbackTarget, "src");
      else if (tag === "link") applyFallback(target as unknown as FallbackTarget, "href");
    },
    true
  );

  const probeFavicons = () => {
    const links = doc.querySelectorAll<HTMLLinkElement>(
      'link[rel~="icon"][data-local], link[rel="apple-touch-icon"][data-local]'
    );
    links.forEach((link) => {
      const probe = new Image();
      probe.onerror = () => applyFallback(link, "href");
      // getAttribute y no .href: el atributo es la URL de la CDN tal como se
      // emitió; .href dependería del document base del test/runtime.
      probe.src = link.getAttribute("href") ?? link.href;
    });
  };

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", probeFavicons, { once: true });
  } else {
    probeFavicons();
  }
}
