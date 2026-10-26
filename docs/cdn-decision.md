# ADR-lite — CDN para los assets del sitio (jsDelivr vs Cloudflare)

**Estado:** ratificado (#81, merge `d8b703b`, 2026-10-26) · implementación: #84
**Fecha:** 2026-10-25 · **Autor:** sesión `dsh/sprint/57`
**Alcance declarado:** `Cubre: servir los assets que el HTML/TS publicados referencian (favicons, OG, thumbs de papers) desde una CDN versionada · No cubre: hosting del sitio (HTML/JS/CSS y bundles), audio de salas (se queda en Pages), iconos y QR (tamaño irrelevante), DNS, analítica, los PNG print que el sitio no sirve, ni el hotlink externo, resuelto en #84 con copia propia · as_of: 2026-10-26`

## Contexto

El sitio se publica en GitHub Pages (Actions → `dist/`, `base: "/"`); el repo es público y
tiene el tag `v1.0.0` (#54). El HTML generado (`index.html`, ensamblado por `build.ts`)
referencia **19 rutas locales, 0 externas** desde #84 (los 10 iconos se inlinean como data
URI en el build, así que no se descargan):

| Qué referencia el HTML | Peso en repo | Dónde vive / qué publica el build |
|---|---|---|
| 3 favicons (`/assets/brand/…`) | parte de 23 MB | fuente `assets/brand/logo/` (58 renders); `vite.config.ts` copia 3 a `/assets/brand/` |
| 4 thumbs de papers | 92 KB | `public/assets/`; se publican tal cual (`/assets/<name>.jpg`, sin hash de Vite desde #84) |
| 10 iconos | 8.5 KB | fuente única `assets/icons/`; el build los inlinea como data URI (0 requests) desde #84 |
| QR (`assets/qr-site.svg`) | 37 KB | `public/assets/qr-site.svg` |
| OG (`https://christianluciani.github.io/assets/og-image.png`, 2 meta) | 113 KB | `public/assets/og-image.png` |
| audio de salas (11 MP3, desde TS) | 8.1 MB | `public/audio/` |
| logo DRAHMAN (era la única externa) | 10.8 KB | propia, derivada a 88×88 desde #84 (`docs/brand/drahman-logo.md`) |

El repo cargaba duplicados y material que el sitio no sirve: `public/assets/`
(271 KB: 10 iconos, 14 thumbs, OG y QR) tenía sus copias en `assets/images/papers/`
(148 KB, md5 idéntico en los thumbs muestreados), `assets/icons/` (9 archivos, sin
`patreon.svg`) y `assets/og-image.png` (md5 idéntico). **#84 los eliminó** (~290 KB):
quedó un solo hogar por familia. Los ~23 MB de renders print siguen en el repo y no se
publican: sólo 3 favicons se copian al `dist/`.

Dos hechos **medidos** el 2026-10-25 (`curl -sSI`, contra los orígenes reales):

- **GitHub Pages no deja fijar caché ni purgar.** `/` y `/assets/og-image.png` responden
  `cache-control: max-age=600`, `via: 1.1 varnish`, `server: GitHub.com`, servidos desde
  Bogotá (`cache-bog-…`) para esta red. Un query string no cambia el objeto: el único
  cache-busting es cambiar el path. GitHub documenta 100 GB/mes *soft* y 1 GB de sitio, y
  **no expone el consumo de banda de Pages al operador** (ni UI ni API).
- **jsDelivr ya sirve este repo desde el tag `v1.0.0`**: `200`, `image/png`,
  `cache-control: public, max-age=31536000, s-maxage=31536000, immutable`,
  `access-control-allow-origin: *`, `server: cloudflare`, y el edge respondió
  `cf-ray: …-GYE` (**Guayaquil**). Con `@main`: `s-maxage=43200` (12 h) — el tag es la
  unidad inmutable, la rama no.
  *Ojo con la ruta:* la URL de evidencia es el archivo **fuente** del tag
  (`assets/brand/logo/favicon-aurea-32.png`); el sitio sirve la copia plana
  `/assets/brand/favicon-aurea-32.png` que arma `vite.config.ts`.

La capa de assets era agnóstica pero **incompleta** antes de #84: `assetUrl()` leía
`VITE_ASSET_BASE_URL` sin consumidores de producción, sin fallback, y el HTML generado no
pasaba por él. Hoy `head_html.ts` y `sala_html.ts` resuelven las 8 rutas migradas con
`assetAttrs()`/`absoluteAssetUrl()`, el fallback vive en `src/ts/assets/fallback.ts`, y las
restantes (iconos, QR) siguen escritas en `print_cv_html.ts` y en el propio template.
`docs/CDN_MIGRATION.md` describe la migración agnóstica por fases.

## Criterios

1. **Inmutabilidad por versión** — misma URL ⇒ mismos bytes, para siempre.
2. **Cache larga + busteo por path** — `immutable` en assets versionados, sin revalidar cada 10 min.
3. **Latencia LatAm** (audiencia principal: Ecuador, Andes, Cono Sur).
4. **Costo y límites a $0 real** — sitio personal, sin tarjeta ni sorpresas de egress.
5. **Integración con el deploy actual** (Actions → Pages, tag semver `vX.Y.Z`).
6. **Reversibilidad** — volver atrás = cambiar una base y rebuild, no reescribir el código.

## Comparativa

| Dimensión | jsDelivr (`/gh/…@tag/…`) | Cloudflare (Pages / R2 + CDN) |
|---|---|---|
| Origen del contenido | Sirve **directo del repo/tag** de GitHub; cero deploy, cero credenciales | Pages: sube el build desde CI (o Git integration). R2: bucket + upload desde CI (token) |
| Inmutabilidad | Tag/SHA ⇒ copia **permanente en S3** de jsDelivr, inmutable de hecho | Pages: deploy atómico por hash, prod mutable; R2: objeto mutable en el path (necesita path versionado) |
| Cache servida | Tag: `immutable, max-age=31536000` **[medido]** | Pages: edge 1 semana, browser `max-age=0, must-revalidate`; R2+CDN: TTL configurable |
| Purga / invalidación | API de purga con acceso por email, rate-limited; **no toca tags exactos** | Instant Purge en Free (5 req/min bulk); Pages = “Purge Everything” de zona |
| Límites duros | **>20 MB por archivo** no soportado (GitHub); HTML se sirve como `text/plain`; ≤10 000 archivos activos recomendado (100 000 soft, ToS §5) | Pages: 25 MiB/archivo, 20 000 archivos, 500 builds/mes; R2: 10 GB-mes gratis |
| Operador / sostenibilidad | Volentio JSD Ltd (preámbulo de los ToS), **financiado por sponsors** (Cloudflare, Fastly, Bunny, GCore, IBM, DO); sin contrato | Cloudflare, Inc.; producto comercial con plan Free |
| Costo a nuestra escala | $0, sin cuenta; sin límite de bandwidth declarado | $0 (Pages Free; R2 free tier: 10 GB, egress gratis) |
| LatAm | Multi-CDN (Cloudflare, Fastly, Bunny, GCore) con balanceo por RUM; **sin cifra publicada de PoPs** [?] | 348 ciudades, **Quito (UIO) y Guayaquil (GYE) listados** [OFICIAL]; medido: el borde que atendió fue GYE |
| Integración con el deploy | Baja: la URL se arma con repo + tag + path; el tag hay que crearlo (el actual no sirve el favicon vigente) | Proyecto nuevo + dominio (Pages) o bucket público con **custom domain** (r2.dev es no-producción) |
| Disponibilidad | **Sin SLA**; los ToS §11 excluyen toda garantía | Sin SLA en Free; red con reclamo de <50 ms para 95% de usuarios |
| Política de uso | ToS §6 prohíbe *image hosting* y “archivos en grandes cantidades”: **zona gris para media** | Hosting estático de propósito general; sin política por tipo de archivo |

Fuentes y fecha en §Evidencia.

## Decisión

**Adoptar jsDelivr pinneado a tags semver para los assets que el HTML publica y que
cambian por release (favicons, OG, thumbs de papers), manteniendo GitHub Pages como
origen del sitio y de todo lo demás.** Cloudflare (Pages o R2 + custom domain) queda como
**escalón con disparador explícito**, no como primera opción.

Por qué así:

- **Gana los criterios 1–2 con un tag nuevo**: hoy el tag `v1.0.0` responde `immutable` +
  CORS `*`, pero su favicon (696 B) no es el vigente (709 B) — adoptar exige taggear
  `v1.0.x`/`v1.1.0`, que de todos modos es el flujo de release de #54. Pages no puede dar
  `immutable` sin tocar headers ni purgar.
- **Gana el criterio 3 en Ecuador con evidencia propia**: jsDelivr atendió por Guayaquil
  (GYE) y Pages por Bogotá en la misma sesión. Es un sample, no un benchmark: sirve como
  indicio, no como cifra.
- **Gana el criterio 5**: cero credenciales y cero pasos de CI; el tag es el mismo que ya
  tagea el logo.
- **No viola el criterio 4**: sin cuenta ni cuota; lo que se sirve son 3 favicons + 1 OG +
  4 thumbs — no “grandes cantidades”. El audio (8.1 MB, media) y los iconos/QR **se quedan
  en Pages**, justamente para no forzar la lectura del ToS a nuestro favor.
- **Cloudflare no se descarta, se difiere**: es el único que resuelve *purga* y
  *archivos >20 MB* (R2), y el único con PoPs ecuatorianos documentados por el proveedor
  (UIO y GYE).

**Alternativas consideradas**

| Alternativa | Por qué no (hoy) |
|---|---|
| Cloudflare Pages como hosting completo | Misma función que Pages actual; migración de dominio y CI sin arreglar el caching por asset |
| Cloudflare R2 + custom domain | Correcto como escalón: agrega bucket, token de CI y un dominio. Se activa con disparador (§Pipeline) |
| Cloudinary / imgix | Overkill y con cuota; el repo ya es público y versionado |
| `raw.githack` / `raw.githubusercontent` | Sin caché ni garantía; sólo previews. El hotlink actual de DRAHMAN es deuda declarada, no una decisión de CDN |
| No hacer nada | Deja `max-age=600` en todo y el 100 GB/mes *soft* de Pages como único techo |

**Reversibilidad:** alta. La base vive en una variable (`VITE_ASSET_BASE_URL`, hoy sin
consumidores de producción) o en un prefijo de templates; volver a Pages es cambiar un valor
y rebuild. **Si el operador no responde:** default = **no migrar** (parkear); el sitio sigue
como hoy. Nada de esta decisión es irreversible (no hay DNS, ni borrado, ni reescritura de tags).

## Pipeline propuesto — quién sirve qué

| Superficie | Sirve | Motivo |
|---|---|---|
| **GitHub Pages** (actual) | `index.html`, JS/CSS y sus bundles, iconos (10), QR, audio (11 MP3), y **todo asset como fallback** | Deploy atómico del sitio; los bundles ya llevan hash de Vite y no necesitan tag |
| **jsDelivr `@vX.Y.Z`** | 3 favicons, OG y las 4 thumbs del HTML | Inmutables, cache 1 año, CORS, borde en GYE; cambian por release, no por commit |
| **Cloudflare R2 + custom domain** *(disparador)* | media que supere 20 MB/archivo, o si llega una queja de uso de jsDelivr, o si un archivo/cambio necesita purga real | Único camino para >25 MiB y purga sin tocar tags |
| **`raw.githubusercontent` (DRAHMAN)** | el logo del showcase: era un hotlink de 2.37 MB con 5 min de caché; **#84 lo reemplazó por un derivado propio** | Mientras duró fue deuda ajena a esta decisión, no una opción de CDN |

**Disparadores observables** (no hay dashboard de banda de Pages): aviso de GitHub
(429 o email de soporte), sitio publicado cerca de 1 GB, un archivo >20 MB, o una queja por
el uso de jsDelivr.

**Mecanismo (una sola palanca).** Extender lo que ya existe:

1. `VITE_ASSET_BASE_URL` ya alimenta `assetUrl()` (`src/ts/assets/url.ts`) — pero **hoy no
   lo consume nada de producción**: la migración tiene que cablearlo.
2. Las 19 rutas locales del HTML generado están en `src/templates/head_html.ts`,
   `sala_html.ts` y `print_cv_html.ts`; las que se migran son **8** (3 favicons + OG en 2
   meta + 4 thumbs). Iconos, QR y audio no se migran. Fuente en el repo → URL publicada:

   | Asset | Fuente (la ruta que usa jsDelivr) | URL que sirve Pages |
   |---|---|---|
   | 3 favicons | `assets/brand/logo/favicon-aurea{,-32}.svg/png`, `apple-touch-icon-aurea.png` | `/assets/brand/<mismo nombre>` |
   | OG | `public/assets/og-image.png` | `/assets/og-image.png` |
   | 4 thumbs | `public/assets/<name>.jpg` | `/assets/<name>.jpg` |
3. Un bump de assets = tag nuevo + cambiar la base
   (`…/gh/ChristianLuciani/christianluciani.github.io@v1.1.0`).
4. **Fallback real, a implementar en la migración** (no existe hoy): `assetUrl()` sólo
   concatena `BASE` + path, sin rama de error; para degradar hace falta hidratación con
   `onerror` o un `srcset` a la copia local. Mientras no exista, el `src` de Pages es el
   que manda y la CDN es una mejora, no una dependencia.

**Orden de adopción:** (a) tag con los favicons/OG vigentes y esos 4 archivos servidos por
jsDelivr, verificando el HTML generado; (b) las 4 thumbs. Los bundles no entran (Pages).
Cada paso es reversible por separado.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| ToS de jsDelivr §6 (image hosting / grandes cantidades) | Baja aquí, media si el sitio crece a galería pesada | Servir sólo 8 archivos de marca/papers; audio y media quedan en Pages; revisar si el volumen crece |
| Sin SLA, operador único | Caída = esos 8 assets no cargan | Mientras no exista el fallback (hoy no existe), el `src` canónico sigue siendo Pages y la CDN no es la única ruta; la migración implementa el fallback antes de retirar la copia local |
| Tag malo es permanente en esa URL | Badge/OG roto para siempre | Taggear después de verificar el build (flujo de #54); corregir = `vX.Y.Z+1` |
| Un archivo publicado en un tag no se puede retirar de esa URL | Fuga de un asset (dato personal en una imagen) queda servida | Revisar el diff de assets antes de taggear; retirar el archivo del repo no alcanza: hace falta tag nuevo y dejar de referenciar el viejo |
| `@branch` con 12 h de caché | Preview viejo | Nunca usar `@main` en producción; sólo tags |
| El tag `v1.0.0` no sirve el favicon vigente | Regresión visual silenciosa si se adopta sin tag nuevo | Paso (a) incluye tag nuevo; verificar `content-length` contra HEAD |

## Evidencia

| # | Claim | Tier | Fuente | Fecha |
|---|---|---|---|---|
| 1 | jsDelivr: gratis, sin límite de bandwidth, sirve GitHub tag/commit/branch, copia permanente en S3, branch 12 h, alias 7 d, >20 MB no soportado, HTML `text/plain`, purga por API restringida | `[OFICIAL]` | <https://raw.githubusercontent.com/jsdelivr/jsdelivr/master/README.md> | 2026-10-25 |
| 2 | jsDelivr multi-CDN (Cloudflare, Fastly, Bunny, GCore) con balanceo por RUM; sin cifra publicada de PoPs | `[OFICIAL]` + `[?]` (número) | <https://www.jsdelivr.com/network> | 2026-10-25 |
| 3 | jsDelivr: sin garantía (§11 “No warranties”; operador Volentio JSD Ltd en el preámbulo; §5 límites blandos de archivos; §6 prohíbe image hosting y “grandes cantidades”) | `[OFICIAL]` | <https://www.jsdelivr.com/terms/terms-of-use> · <https://www.jsdelivr.com/sponsors> | 2026-10-25 |
| 4 | Headers de este repo en el tag: `immutable, max-age=31536000`, CORS `*`, `cf-ray …-GYE`; `@main` ⇒ `s-maxage=43200`; el colo que nos atendió es GYE = Guayaquil (IATA) | `[BENCHMARK]` | `curl -sSI …@v1.0.0/assets/brand/logo/favicon-aurea-32.png` · `curl -s https://www.cloudflare.com/cdn-cgi/trace` ⇒ `colo=GYE loc=EC` | 2026-10-25 |
| 5 | Pages Free: 500 builds/mes, 20 000 archivos, 25 MiB/archivo, >25 MiB ⇒ R2 | `[OFICIAL]` | <https://developers.cloudflare.com/pages/platform/limits/> | 2026-10-25 |
| 6 | Pages browser cache `max-age=0, must-revalidate`; Purge Everything por zona, 5 req/min bulk en Free | `[OFICIAL]` | <https://developers.cloudflare.com/pages/configuration/serving-pages/> · <https://developers.cloudflare.com/cache/how-to/purge-cache/> | 2026-10-25 |
| 7 | R2: egress gratis, free tier 10 GB-mes + 1 M Class A + 10 M Class B; r2.dev no es producción, custom domain sí | `[OFICIAL]` | <https://developers.cloudflare.com/r2/pricing/> · <https://developers.cloudflare.com/r2/buckets/public-buckets/> | 2026-10-25 |
| 8 | Cloudflare: 348 ciudades; Quito (UIO) y Guayaquil (GYE) listados | `[OFICIAL]` | <https://www.cloudflare.com/network/> | 2026-10-25 |
| 9 | GitHub Pages: sitio ≤1 GB, 100 GB/mes *soft*, 429 por rate limit, recomienda CDN de terceros si se excede; **no publica el consumo de banda** | `[OFICIAL]` | <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits> | 2026-10-25 |
| 10 | Pages entrega `cache-control: max-age=600` sin purga, y un query string no lo bustea; servido desde Bogotá en esta red | `[BENCHMARK]` (no documentado por GitHub) | `curl -sSI https://christianluciani.github.io/assets/og-image.png` y comparación con `?v=99` | 2026-10-25 |
| 11 | Inventario y duplicados del repo (23 MB/58 renders, 8.1 MB/11 MP3, 344 KB/26 en `public/assets`, 108 KB/4 thumbs hasheadas, copias con md5 idéntico) | `[BENCHMARK]` | `du -sk`, `find`, `md5` en el worktree `dsh/sprint/57` | 2026-10-25 |

## Consecuencias

- **Positivas:** 8 assets con caché de un año, CORS y borde en GYE sin cuenta ni CI; el tag
  pasa a ser útil fuera del repo; el peso muerto (23 MB de renders y ~300 KB de duplicados)
  deja de ser el argumento para migrar el sitio entero.
- **Negativas:** esos assets dependen de un tercero sin SLA y con política de uso
  interpretable; un bump exige tag nuevo (por diseño).
- **Deuda declarada:** las rutas del HTML siguen escritas en tres templates (no hay
  capa de componentes que centralice), y la activación depende de un tag nuevo + una
  variable de repo (§Implementación). El resto —base cableada, fallback, dedupe— entró
  en #84.
- **Revisión:** si aparece un aviso de GitHub por banda, el sitio se acerca a 1 GB o surge un
  archivo >20 MB, se activa el disparador de R2 (§Pipeline) y se revisa este ADR.

## Implementación (#84)

Lo que la decisión no fijaba y la implementación resolvió, sin cambiar la decisión:

| Pieza | Dónde | Qué hace |
|---|---|---|
| Base | `src/ts/assets/url.ts` (`ASSET_BASE`) | `VITE_ASSET_BASE_URL` (Vite) o `process.env` (build). Vacía ⇒ Pages. Valida `http(s)`: una base relativa rompe el build en vez de emitir URLs rotas |
| Ruta fuente→servida | `cdnRepoPath()` | jsDelivr sirve el **repo**, no el sitio. Mapa exhaustivo por familia: `/assets/brand/**` ⇒ `assets/brand/logo/**`; **todo** `/assets/**` ⇒ `public/assets/**` (OG, thumbs, QR, imágenes); `/audio/**` ⇒ `public/audio/**`; el resto, tal cual. Sin este mapa, 5 de las 8 rutas daban 404 |
| Fallback | `src/ts/assets/fallback.ts` | `error` en captura sobre `img`/`link[data-local]`, y sonda `Image()` para favicons; un solo intento, sin loop |
| Gate | `.github/workflows/ci.yml` | Construye en **los dos modos** y verifica las 8 rutas, el mapa y la ausencia de `data-local` en modo Pages |
| Hotlink DRAHMAN | `public/assets/images/drahman-logo.png` + `docs/brand/drahman-logo.md` | Derivado a 88×88 (10.8 KB) con procedencia y comando; el original pesaba 2.37 MB con `max-age=300` |
| Activación | `deploy.yml` + variable `CDN_BASE_URL` | Sin variable, el deploy es el de siempre. Con variable, las 8 rutas salen por la CDN |

**Favicons y OG no tienen fallback de runtime**: `og:image` lo consume un crawler (no
ejecuta JS) y `link[rel=icon]` es best-effort (la sonda lo intenta). Los 4 thumbs y las
3 favicons sí degradan a la copia de Pages.

**Activación real (2026-10-26):** tag anotado **`v1.1.1`** sobre el merge de #85 y
`CDN_BASE_URL` apuntando a `…@v1.1.1`; deploy verificado con los 8 assets en `200` y bytes
idénticos. Para un bump: tag nuevo sobre el merge que trae los assets + repuntar la variable.

**Dos trampas que ya mordieron:**
- `v1.0.0` sirve un favicon distinto al vigente (696 B vs 709 B): el tag debe ser nuevo.
- El tag tiene que colgar del **commit que ya contiene los assets**. `v1.1.0` se creó sobre un
  `main` local atrasado (anterior a esta migración) y daba 404 en las 4 thumbs; se retiró y se
  publicó `v1.1.1` en su lugar en vez de reescribir el ref publicado.

## Qué NO cubre

No implementa la migración (ni `build.ts`, ni `assetUrl()`, ni templates); no decide el
dominio propio; no mide latencia con usuarios reales (RUM) — el dato GYE vs Bogotá es un
sample de una sesión; no evalúa Cloudinary/imgix en profundidad; no resuelve el hotlink de
DRAHMAN; no cubre los PNG print de `assets/brand/logo/` que el sitio no sirve (su lugar es
el release de GitHub, no una CDN).
