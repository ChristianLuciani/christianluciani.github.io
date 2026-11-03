# Espejo vendored — no editar

Estos 89 assets son una **copia fallback** del mark canónico que vive en
[`ChristianLuciani/cluciani-brand-kit`](https://github.com/ChristianLuciani/cluciani-brand-kit).

- **Pin:** `v1.2.0` (`3e14224…`), registrado en `brand-kit.lock.json`.
- **CDN canónica:** `https://cdn.jsdelivr.net/gh/ChristianLuciani/cluciani-brand-kit@v1.2.0/assets/logo/`.
- **Verificación:** `npm run brand:verify` compara SHA-256 del espejo contra el lock.
- **Regla:** no se editan a mano ni se generan desde este repo; el generador
  canónico y el manual viven en el brand kit. La animación runtime sí vive en
  este repo (`tools/logo/geometry.mjs`, `proposals/…/aurea7.html`).

El tag `v1.2.0` es **aditivo** sobre `v1.1.0`: los 66 assets anteriores conservan
su contenido byte a byte y se suman los 23 del set **settled** (lockups
`logo-*-lockup-settled*`, exports `logo-aurea-settled-*` y
`og-image-aurea-settled.png`), que el sitio publica todavía no.

Los 4 favicons que publica el sitio (`favicon-aurea-teal.svg`,
`favicon-aurea-teal-32.png`, `favicon-aurea-teal-16.png`,
`apple-touch-icon-aurea.png`) salen de este espejo; con
`VITE_BRAND_KIT_BASE_URL` configurada, se sirven desde el tag del brand kit y
degradan a esta copia local. El icono del sitio es el **tile teal** (único que
se lee a 16 px); el transparente (`favicon-aurea.svg`/`-32.png`) queda en el
espejo para superficies controladas y no se declara en el `<head>`.
