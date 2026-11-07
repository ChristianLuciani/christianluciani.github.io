import { describe, expect, it } from "vitest";
import { assembleHtml } from "./index.ts";
import { museo } from "../themes/museo/narrative.ts";
import type { NarrativeManifest } from "../themes/types.ts";
import { DEFAULT_ORIGIN } from "../themes/site.ts";

/**
 * METADATA DEL DOCUMENTO (SPEC §8 FASE 5.5 · `docs/CREAR-TEMA.md` §7).
 *
 * El render es el DOCUMENTO: `title`/`description`/`og:image` salen del
 * `NarrativeManifest.meta` del tema (byte a byte iguales a las claves del pack,
 * que es la fuente única) y NO conoce la dirección de deploy. La canónica,
 * `og:url` y las rutas por subpath son del PUBLICADOR
 * (`src/artifact/pages.test.ts`): así el golden del default queda intacto
 * (invariante del epic #125).
 */

describe("head — metadata del manifest", () => {
  const html = assembleHtml();

  it("title/description/og:image salen de narrative.meta", () => {
    expect(html).toContain(`<title>${museo.meta.title}</title>`);
    expect(html).toContain(`content="${museo.meta.description}"`);
    expect(html).toContain(`content="${DEFAULT_ORIGIN}${museo.meta.ogImage}"`);
    expect(html.match(/property="og:image"/g)).toHaveLength(1);
  });

  it("description se escapa como valor de atributo", () => {
    const withQuotes: NarrativeManifest = {
      ...museo,
      meta: { ...museo.meta, description: 'Dice "hola" & <ok>' }
    };
    expect(assembleHtml({ theme: withQuotes })).toContain(
      'content="Dice &quot;hola&quot; &amp; &lt;ok&gt;"'
    );
  });

  it("og:title/twitter:* siguen saliendo del pack del tema", () => {
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:description"');
  });

  it("el documento no declara canónica ni conoce el deploy", () => {
    // Son del publicador: si el render las emitiera, el golden cambiaría con la
    // dirección y `SITE_THEME` no podría publicar dos URLs desde el mismo HTML.
    expect(html).not.toContain('rel="canonical"');
    expect(html).toContain(
      '<meta property="og:url" content="https://christianluciani.github.io/">'
    );
  });
});
