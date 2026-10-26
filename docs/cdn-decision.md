# ADR-lite — CDN para los assets del sitio (jsDelivr vs Cloudflare)

**Estado:** propuesto · se ratifica con el merge de este PR (decisión del operador, #57)
**Fecha:** 2026-10-25 · **Autor:** sesión `dsh/sprint/57`
**Alcance declarado:** `Cubre: servir assets estáticos del sitio (favicons, OG, thumbs de papers, futuros bundles) · No cubre: hosting del HTML/JS/CSS, audio de salas (se queda en Pages por ToS), DNS del dominio, analítica, ni los PNG print del repo que el sitio no sirve · as_of: 2026-10-25`

## Contexto

El sitio se publica en GitHub Pages (Actions → `dist/`, `base: "/"`), repo público,
tag `v1.0.0` ya publicado (requisito de #54). Lo que el sitio **realmente pide** es chico;
lo que pesa en el repo es material que el sitio no sirve:

| Qué | Peso | ¿Lo pide el sitio? |
|---|---|---|
| `assets/brand/logo/` (58 archivos: renders 512→4096, print A3/A4, OG, favicons) | **23 MB** | Sólo 3 favicons (`src/templates/head_html.ts:29-31`) |
| `public/audio/` (11 MP3 de salas) | **8.1 MB** | Sí, bajo demanda |
| `assets/images/papers/` + `public/assets/` (thumbs) | 492 KB | Sí, 4 en HTML + manifest |
| `og-image.png` | 116 KB | Sí (crawlers) |
| Repo tracked completo | 33 MB | — |

Dos hechos medidos el 2026-10-25 (`curl -sSI`, origen real):

- **GitHub Pages no deja fijar caché ni purgar.** `/` y `/assets/og-image.png` responden
  `cache-control: max-age=600`, `via: 1.1 varnish`, `server: GitHub.com`; servido desde
  Bogotá (`cache-bog-…`) para esta red. El único cache-busting es cambiar el path.
  GitHub documenta además 100 GB/mes de bandwidth *soft* y 1 GB de sitio.
- **jsDelivr ya sirve este repo desde el tag `v1.0.0`**: `200`, `image/png`,
  `cache-control: public, max-age=31536000, s-maxage=31536000, immutable`,
  `access-control-allow-origin: *`, `server: cloudflare`, y el edge respondió
  `cf-ray: …-GYE` (**Quito**). Con `@main` en cambio: `s-maxage=43200` (12 h) —
  el tag es la unidad inmutable, la rama no.

La capa de assets ya es agnóstica y **no hay que reescribirla**:
`src/ts/assets/manifest.ts` (claves lógicas → rutas), `src/ts/assets/url.ts`
(`assetUrl()` aplica `VITE_ASSET_BASE_URL`), `docs/CDN_MIGRATION.md` (migración por fases).
Límite conocido: `assetUrl()` sólo resuelve lo que pasa por TS; las 10 referencias a assets
del HTML generado (9 locales + 1 externa) viven en `src/templates/head_html.ts` y
`sala_html.ts` (HTML generado por `build.ts`).

## Criterios

1. **Inmutabilidad por versión** — misma URL ⇒ mismos bytes, para siempre.
2. **Cache larga + busteo por path** — `immutable` en assets versionados, sin revalidar cada 10 min.
3. **Latencia LatAm** (audiencia principal: Ecuador, Andes, Cono Sur).
4. **Costo y límites a $0 real** — sitio personal, sin tarjeta ni sorpresas de egress.
5. **Integración con el deploy actual** (Actions → Pages, tag semver `vX.Y.Z`).
6. **Reversibilidad** — volver atrás = cambiar una variable, no reescribir el código.

## Comparativa

| Dimensión | jsDelivr (`/gh/…@tag/…`) | Cloudflare (Pages / R2 + CDN) |
|---|---|---|
| Origen del contenido | Sirve **directo del repo/tag** de GitHub; cero deploy, cero credenciales | Pages: sube el build desde CI (o Git integration). R2: bucket + upload desde CI (token) |
| Inmutabilidad | Tag/SHA ⇒ copia **permanente en S3** de jsDelivr, inmutable de hecho | Pages: deploy atómico por hash, prod mutable; R2: objeto mutable en el path (necesita path versionado) |
| Cache servida | Tag: `immutable, max-age=31536000` **[medido]** | Pages: edge 1 semana, browser `max-age=0, must-revalidate`; R2+CDN: TTL configurable |
| Purga / invalidación | API de purga con acceso por email, rate-limited; **no toca tags exactos** | Instant Purge en Free (5 req/min bulk); Pages = “Purge Everything” de zona |
| Límites duros | **>20 MB por archivo** no soportado (GitHub); HTML se sirve como `text/plain`; ≤10 000 archivos activos recomendado (100 000 soft) | Pages: 25 MiB/archivo, 20 000 archivos, 500 builds/mes; R2: 10 GB-mes gratis |
| Operador / sostenibilidad | Volentio JSD Ltd, **financiado por sponsors** (Cloudflare, Fastly, Bunny, GCore, IBM, DO); sin contrato | Cloudflare, Inc.; producto comercial con plan Free |
| Costo a nuestra escala | $0, sin cuenta; sin límite de bandwidth declarado | $0 (Pages Free; R2 free tier: 10 GB, egress gratis) |
| LatAm | Multi-CDN (Cloudflare, Fastly, Bunny, GCore) con balanceo por RUM; **sin cifra publicada de PoPs** [?] | 348 ciudades, **Quito y Guayaquil listados** [OFICIAL]; medido: `cf-ray …-GYE` |
| Integración con el deploy | Trivial: el tag `v1.0.0` ya existe; URL = repo + tag + path | Proyecto nuevo + dominio (Pages) o bucket público con **custom domain** (r2.dev es no-producción) |
| Disponibilidad | **Sin SLA**; los ToS excluyen garantía de disponibilidad | Sin SLA en Free; red con reclamo de <50 ms para 95% de usuarios |
| Política de uso | ToS §6 prohíbe *image hosting* y “archivos en grandes cantidades”: **zona gris para media** | Hosting estático de propósito general; sin política por tipo de archivo |

Fuentes y fecha en §Evidencia.

## Decisión

**Adoptar jsDelivr pinneado a tags semver como CDN de los assets que el sitio pide,
manteniendo GitHub Pages como origen del HTML/JS/CSS y como fallback.** Cloudflare
(Pages o R2 + custom domain) queda como **escalón con disparador explícito**, no como
primera opción.

Por qué así:

- **Gana el criterio 1–2 sin trabajo**: el tag `v1.0.0` ya existe (#54) y hoy responde
  `immutable` + CORS `*`. Pages no puede dar eso sin tocar headers ni purgar.
- **Gana el criterio 3 en Ecuador con evidencia propia**: jsDelivr resolvió a `GYE`
  (Quito) y Pages a Bogotá, en la misma medición. Es un solo sample, no un benchmark:
  sirve como indicio, no como cifra.
- **Gana el criterio 5**: cero credenciales y cero pasos de CI; el mismo tag que ya
  tagea el logo.
- **No viola el criterio 4**: sin cuenta ni cuota; lo que se sirve son favicons, OG y
  4–10 thumbs — no “grandes cantidades”. El audio (8.1 MB, media) **se queda en Pages**
  justamente para no forzar la lectura del ToS a nuestro favor.
- **Cloudflare no se descarta, se difiere**: es el único que resuelve *purga* y
  *archivos >20 MB* (R2), y el único con PoPs ecuatorianos documentados por el proveedor.

**Alternativas consideradas**

| Alternativa | Por qué no (hoy) |
|---|---|
| Cloudflare Pages como hosting completo | Misma función que Pages actual, migración de dominio y CI; no arregla el caching por asset sin trabajo extra |
| Cloudflare R2 + custom domain | Correcto como escalón: agrega bucket, token de CI y un dominio. Se activa con disparador (§Pipeline) |
| Cloudinary / imgix | Overkill y con cuota; el repo ya es público y versionado |
| `raw.githack` / `raw.githubusercontent` | Sin caché ni garantía; sólo previews. Fue el atajo de #54, no producción |
| No hacer nada | Deja `max-age=600` en todo y el 100 GB/mes *soft* de Pages como único techo |

**Reversibilidad:** alta. Todo asset se resuelve por una base (`VITE_ASSET_BASE_URL`) o por
un prefijo en templates; volver a Pages locales es cambiar un valor y rebuild.
**Si el operador no responde:** default = **no migrar** (parkear); el sitio sigue como hoy.
Nada de esta decisión es irreversible (no hay DNS, ni borrado, ni reescritura de tags).

## Pipeline propuesto — quién sirve qué

| Superficie | Sirve | Motivo |
|---|---|---|
| **GitHub Pages** (actual) | `index.html`, bundles JS/CSS, `sitemap`/`robots`, y **todo asset como fallback** | Es el deploy atómico del sitio; el HTML cambia seguido y no debe depender de un tag |
| **jsDelivr `@vX.Y.Z`** | los que el sitio referencia de `assets/brand/` (3 favicons + OG), `assets/images/papers/**` y futuros bundles versionados | Inmutables, cache 1 año, CORS, borde en Quito; cambian por release, no por commit |
| **Cloudflare R2 + custom domain** *(disparador)* | media que supere 20 MB/archivo, o si llega una queja de uso de jsDelivr, o si el bandwidth de Pages supera ~100 GB/mes | Único camino para >25 MiB y purga real sin tocar tags |
| **raw.githack** | nada en producción | Previews de PR |

**Mecanismo (una sola palanca).** Extender lo que ya existe en vez de inventar otra capa:

1. `VITE_ASSET_BASE_URL` ya alimenta `assetUrl()` (`src/ts/assets/url.ts`).
2. Las 10 referencias de `src/templates/head_html.ts` y `sala_html.ts` deben pasar por esa
   base en `build.ts` (hoy el HTML las escribe absolutas `/assets/…`).
3. Un bump de assets = nuevo tag + cambiar la base (`…/gh/ChristianLuciani/christianluciani.github.io@v1.1.0`).
4. El fallback es el path local ya commiteado: si la CDN falla, `onerror`/`srcset` o el
   propio Pages siguen sirviendo (`docs/CDN_MIGRATION.md`, “Fase 3”).

**Orden de adopción:** (a) favicons + OG (4 archivos, cambio mínimo, verificable en el HTML
generado); (b) thumbs de papers vía manifest; (c) bundles de Vite si algún día pesan.
El audio no entra: es media y su lugar es Pages hasta que dispare R2.
Cada paso es reversible por separado y no requiere tocar el otro.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| ToS de jsDelivr §6 (image hosting / grandes cantidades) | Baja aquí, media si el sitio crece a galería pesada | No alojar media pesada en jsDelivr; el audio se queda en Pages hasta que haya disparador; revisar si el volumen crece |
| Sin SLA, operador único | Caída = assets sin servir | Fallback local en Pages + `assetUrl()` que degrada a path relativo |
| Tag malo es permanente en esa URL | Badge/OG roto para siempre | Taggear sólo después de verificar el build (ya lo hace #54); corregir = `vX.Y.Z+1` |
| Un archivo publicado en un tag no se puede retirar de esa URL | Fuga de un asset (dato personal en una imagen) queda servida | Revisar el diff de assets antes de taggear; retirar el archivo del repo no alcanza: hace falta tag nuevo y no referenciar el viejo |
| `@branch` con 12 h de caché | Preview viejo | Nunca usar `@main` en producción; sólo tags |
| R2/Pages sin banda declarada | Costo futuro | R2 egress gratis; disparador medible (bandwidth de Pages) |

## Evidencia

| # | Claim | Tier | Fuente | Fecha |
|---|---|---|---|---|
| 1 | jsDelivr: gratis, sin límite de bandwidth, sirve GitHub tag/commit/branch, copia permanente en S3, branch 12 h, alias 7 d, >20 MB no soportado, purga por API restringida | `[OFICIAL]` | <https://raw.githubusercontent.com/jsdelivr/jsdelivr/master/README.md> | 2026-10-25 |
| 2 | jsDelivr multi-CDN (Cloudflare, Fastly, Bunny, GCore) y balanceo por RUM; sin cifra de PoPs publicada | `[OFICIAL]` + `[?]` (número) | <https://www.jsdelivr.com/network> | 2026-10-25 |
| 3 | jsDelivr sin garantía de disponibilidad; política de uso §6 (prohíbe image hosting y archivos en grandes cantidades) | `[OFICIAL]` | <https://www.jsdelivr.com/terms/terms-of-use> | 2026-10-25 |
| 4 | Headers reales de este repo: tag ⇒ `immutable, max-age=31536000`, CORS `*`, `cf-ray …-GYE`; `@main` ⇒ `s-maxage=43200` | `[BENCHMARK]` | `curl -sSI https://cdn.jsdelivr.net/gh/ChristianLuciani/christianluciani.github.io@v1.0.0/assets/brand/logo/favicon-aurea-32.png` | 2026-10-25 |
| 5 | Pages Free: 500 builds/mes, 20 000 archivos, 25 MiB/archivo, >25 MiB ⇒ R2 | `[OFICIAL]` | <https://developers.cloudflare.com/pages/platform/limits/> | 2026-10-25 |
| 6 | Pages browser cache `max-age=0, must-revalidate`; Purge Everything por zona, 5 req/min bulk en Free | `[OFICIAL]` | <https://developers.cloudflare.com/pages/configuration/serving-pages/> · <https://developers.cloudflare.com/cache/how-to/purge-cache/> | 2026-10-25 |
| 7 | R2: egress gratis, free tier 10 GB-mes + 1 M Class A + 10 M Class B; r2.dev no es producción, custom domain sí | `[OFICIAL]` | <https://developers.cloudflare.com/r2/pricing/> · <https://developers.cloudflare.com/r2/buckets/public-buckets/> | 2026-10-25 |
| 8 | Cloudflare: 348 ciudades, Quito y Guayaquil listados | `[OFICIAL]` | <https://www.cloudflare.com/network/> | 2026-10-25 |
| 9 | GitHub Pages: sitio ≤1 GB, 100 GB/mes soft, 429 por rate limit; recomienda CDN de terceros si se excede | `[OFICIAL]` | <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits> | 2026-10-25 |
| 10 | Pages entrega `cache-control: max-age=600` sin purga; servido desde Bogotá en esta red | `[BENCHMARK]` (no documentado por GitHub) | `curl -sSI https://christianluciani.github.io/assets/og-image.png` | 2026-10-25 |

## Consecuencias

- **Positivas:** assets con caché de un año, CORS y borde en Quito sin cuenta ni CI;
  el tag `v1.0.0` se vuelve útil fuera del repo; el peso muerto (23 MB de renders) deja
  de ser el argumento para migrar el sitio entero.
- **Negativas:** los assets pasan a depender de un tercero sin SLA y con política de uso
  interpretable; un bump de assets exige tag nuevo (por diseño).
- **Deuda declarada:** `assetUrl()` no cubre las referencias HTML (10 en `src/templates/`);
  hasta que lo haga, la palanca es un `replace` de base en `build.ts`. Seguimiento como
  issue aparte, no en este PR: este issue entrega la decisión, no la migración.
- **Revisión:** si el bandwidth *soft* de Pages se acerca a 100 GB/mes, o aparece un archivo
  >20 MB, se activa el disparador de R2 (§Pipeline) y se revisa este ADR.

## Qué NO cubre

No implementa la migración (ni `build.ts`, ni `assetUrl()`, ni templates); no decide el
dominio propio; no mide latencia con usuarios reales (RUM) — el dato de Quito vs Bogotá es
un sample de una sesión; no evalúa Cloudinary/imgix en profundidad; no cubre los PNG print
de `assets/brand/logo/` que el sitio no sirve (su lugar natural es el release de GitHub,
no una CDN).
