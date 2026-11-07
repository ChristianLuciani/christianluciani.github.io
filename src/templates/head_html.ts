import {
  absoluteAssetUrl,
  assetAttrsFor,
} from "../ts/assets/url.ts";
import { ENTITY } from "../data/entity.generated.ts";
import { PRINT_RULE_COLOR } from "./print-tokens.ts";
import { emitSkin } from "../themes/skin.ts";
import { t, ta } from "../content/copy.ts";

/** Origen canónico del sitio (OG necesita URL absoluta, no relativa). */
const SITE_ORIGIN = "https://christianluciani.github.io";

/**
 * Bloques JSON-LD de la entidad (`Person`) + `FAQPage`, derivados del SSOT
 * (#140): los emite el engine (`pasco entity --jsonld`) y acá sólo se
 * serializan. El `@id`, `jobTitle`, `description`, `email` y los `sameAs` NO se
 * escriben a mano: viven en `src/data/entity.generated.ts` y su gate es
 * `npm run sync:check`. Editar hechos = editar `profile-data`.
 */
function jsonLdBlocks(): string {
  return ENTITY.nodes
    .map((node) => `<script type="application/ld+json">\n${JSON.stringify(node, null, 2)}\n</script>\n`)
    .join("");
}

/**
 * GENERADO por herramientas/extract-monolith (one-shot) desde index.html (Fase-1).
 * NO editar a mano el contenido extraído; editar la fuente original y regenerar,
 * o editar directamente si es un cambio intencional de contenido.
 * HEAD: doctype, meta, JSON-LD, fonts, tag del entry module. La piel —manual de
 * estilo y `<style>` global— vive en `src/themes/museo/skin.css` y se emite con
 * `emitSkin()` (#130); este template ya no contiene CSS.
 */

/**
 * Headline del JSON-LD (ScholarlyArticle): la MISMA pieza de presentación que
 * imprime la sala Biblioteca. Sale del pack (`pub.<id>.title`), sin `<em>`: el
 * JSON-LD no admite markup. Una segunda copia acá era el bug de dos fuentes
 * (el comentario del pack afirmaba "una sola vez" y este bloque lo desmentía).
 */
function headline(key: string): string {
  return t(key).replace(/<[^>]*>/g, "");
}

export function headHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${t("meta.title")}</title>
<meta name="description" content="${ta("meta.description")}">
<meta name="author" content="Christian Luciani">
<meta property="og:type" content="profile">
<meta property="og:title" content="${ta("meta.ogTitle")}">
<meta property="og:description" content="${ta("meta.ogDescription")}">
<meta property="og:url" content="https://christianluciani.github.io/">
<meta property="og:image" content="${absoluteAssetUrl("/assets/og-image.png", SITE_ORIGIN)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ta("meta.ogTitle")}">
<meta name="twitter:description" content="${ta("meta.twitterDescription")}">
<meta name="twitter:image" content="${absoluteAssetUrl("/assets/og-image.png", SITE_ORIGIN)}">
<link rel="icon" type="image/svg+xml" ${assetAttrsFor("href", "/assets/brand/favicon-aurea-teal.svg")}>
<link rel="icon" type="image/png" sizes="32x32" ${assetAttrsFor("href", "/assets/brand/favicon-aurea-teal-32.png")}>
<link rel="icon" type="image/png" sizes="16x16" ${assetAttrsFor("href", "/assets/brand/favicon-aurea-teal-16.png")}>
<link rel="apple-touch-icon" sizes="180x180" ${assetAttrsFor("href", "/assets/brand/apple-touch-icon-aurea.png")}>
${jsonLdBlocks()}<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ScholarlyArticle",
      "headline": "${headline("pub.kontablo.title")}",
      "author": { "@type": "Person", "name": "Christian Luciani" },
      "datePublished": "2026",
      "publisher": "Zenodo / SSRN",
      "identifier": "https://doi.org/10.5281/zenodo.20738795",
      "url": "https://doi.org/10.5281/zenodo.20738795"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "${headline("pub.hydrochars.title")}",
      "author": [
        { "@type": "Person", "name": "Landázuri et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2023",
      "publisher": "ResearchGate",
      "identifier": "https://www.researchgate.net/publication/383276828",
      "url": "https://www.researchgate.net/publication/383276828"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "${headline("pub.caffeine.title")}",
      "author": [
        { "@type": "Person", "name": "Trujillo Galarza et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2025",
      "isPartOf": { "@type": "Periodical", "name": "Carbon Trends" },
      "identifier": "https://doi.org/10.1016/j.cartre.2025.100502",
      "url": "https://doi.org/10.1016/j.cartre.2025.100502"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "${headline("pub.dielectric.title")}",
      "author": [
        { "@type": "Person", "name": "Landázuri et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2025",
      "isPartOf": { "@type": "Periodical", "name": "ChemPhysChem" },
      "identifier": "https://doi.org/10.1002/cphc.202400711",
      "url": "https://doi.org/10.1002/cphc.202400711"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "${headline("pub.cellulose.title")}",
      "author": [
        { "@type": "Person", "name": "Zambrano et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2023",
      "isPartOf": { "@type": "Periodical", "name": "Heliyon" },
      "identifier": "https://doi.org/10.1016/j.heliyon.2023.e17258",
      "url": "https://doi.org/10.1016/j.heliyon.2023.e17258"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "${headline("pub.microcrystalline.title")}",
      "author": [
        { "@type": "Person", "name": "Zambrano et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2022",
      "isPartOf": { "@type": "Periodical", "name": "SSRN Electronic Journal" },
      "identifier": "https://doi.org/10.2139/ssrn.4307097",
      "url": "https://doi.org/10.2139/ssrn.4307097"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "${headline("pub.ivory.title")}",
      "author": [
        { "@type": "Person", "name": "Orejuela Escobar et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2022",
      "publisher": "AIChE Annual Meeting",
      "url": "https://aiche.confex.com/aiche/2022/meetingapp.cgi/Paper/649030"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "${headline("pub.neural.title")}",
      "author": [
        { "@type": "Person", "name": "Cabrera et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2006",
      "isPartOf": { "@type": "Periodical", "name": "Condensed Matter Physics" },
      "identifier": "https://doi.org/10.5488/CMP.9.2.373",
      "url": "https://doi.org/10.5488/CMP.9.2.373"
    },
    {
      "@type": "ScholarlyArticle",
      "headline": "${headline("pub.balancing.title")}",
      "author": [
        { "@type": "Person", "name": "Hosaka et al." },
        { "@type": "Person", "name": "Christian Luciani" }
      ],
      "datePublished": "2006",
      "isPartOf": { "@type": "Periodical", "name": "Progress of Theoretical Physics Supplement" },
      "identifier": "https://doi.org/10.1143/PTPS.161.314",
      "url": "https://doi.org/10.1143/PTPS.161.314"
    }
  ]
}
</script>

<!--
  MANUAL DE ESTILO — LABORATORIO (issue #89, opción A)
  Tokens y componentes derivan de proposals/estilo-lab/estilo.css.
  · Paleta: --bg-0/--bg-1 · --ink/--ink-dim/--ink-meta · --line/--line-soft
    --teal/--gold/--ice/--coral. Los nombres viejos (--night, --deep, --surface,
    --teal, --gold, --text, --muted, --border) son ALIAS de los nuevos.
  · Tipografía: stacks del sistema (0 fuentes web). --font-body/--font-display =
    ui-sans-serif; --font-mono = ui-monospace. Sin Playfair, Fira ni Cormorant.
  · Superficie: contenedor 1220px, tarjetas borde 1px --line-soft radio 15px,
    chips radio 99px, grillas 3/2/1, HUD superior sticky.
  · --ink-meta (#75849a, AA 4,79:1 sobre tarjeta) es el color de TODO texto
    chico; --ink-faint (#5b6a7e) sólo decora.
-->

<style>
${emitSkin(PRINT_RULE_COLOR)}</style>
  <script type="module" crossorigin src="/src/main.ts"></script>
</head>`;
}
