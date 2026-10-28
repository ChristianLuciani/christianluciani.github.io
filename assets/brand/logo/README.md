# Espejo vendored — no editar

Estos 58 assets son una **copia fallback** del mark canónico que vive en
[`ChristianLuciani/cluciani-brand-kit`](https://github.com/ChristianLuciani/cluciani-brand-kit).

- **Pin:** `v1.0.1` (`5a536e0…`), registrado en `brand-kit.lock.json`.
- **CDN canónica:** `https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@v1.0.1/assets/logo/`.
- **Verificación:** `npm run brand:verify` compara SHA-256 del espejo contra el lock.
- **Regla:** no se editan a mano ni se generan desde este repo; el generador
  canónico y el manual viven en el brand kit. La animación runtime sí vive en
  este repo (`tools/logo/geometry.mjs`, `proposals/…/aurea7.html`).

Los 3 favicons que publica el sitio (`favicon-aurea.svg`,
`favicon-aurea-32.png`, `apple-touch-icon-aurea.png`) salen de este espejo;
con `VITE_BRAND_KIT_BASE_URL` configurada, se sirven desde el tag del brand kit
y degradan a esta copia local.
