# Espejo vendored — no editar

Estos 89 assets son una **copia fallback** del mark canónico que vive en
[`ChristianLuciani/brand-kit-christianluciani`](https://github.com/ChristianLuciani/brand-kit-christianluciani).

- **Pin:** tag + commit en `brand-kit.lock.json` (fuente única; no se repiten en prosa).
- **CDN canónica:** `cdnBase` del lock + `/assets/logo/` (jsDelivr sirve el tag pineado).
- **Verificación:** `npm run brand:verify` compara SHA-256 del espejo contra el lock.
- **Regla:** no se editan a mano ni se generan desde este repo; el generador
  canónico y el manual viven en el brand kit. La animación runtime sí vive en
  este repo (`tools/logo/geometry.mjs`, `proposals/…/aurea7.html`).

Los tags son **aditivos**: `assets/logo/` no cambia ni un byte entre tags
(verificado blob a blob contra el árbol del productor). El pin vigente —tag y
commit— vive únicamente en `brand-kit.lock.json` y no se repite en prosa.

Los 4 favicons que publica el sitio (`favicon-aurea-teal.svg`,
`favicon-aurea-teal-32.png`, `favicon-aurea-teal-16.png`,
`apple-touch-icon-aurea.png`) salen de este espejo; con
`VITE_BRAND_KIT_BASE_URL` configurada, se sirven desde el tag del brand kit y
degradan a esta copia local. El icono del sitio es el **tile teal** (único que
se lee a 16 px); el transparente (`favicon-aurea.svg`/`-32.png`) queda en el
espejo para superficies controladas y no se declara en el `<head>`.
