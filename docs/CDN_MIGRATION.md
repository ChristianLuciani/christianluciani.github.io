# Plan — Migración de assets a CDN (agnóstica)

Objetivo: servir imágenes (papers, galería, etc.) desde un CDN (Cloudinary, Cloudflare, etc.) cambiando solo configuración, sin acoplar el código al proveedor.

> Decisión de proveedor y pipeline: [`docs/cdn-decision.md`](cdn-decision.md) (#57).
> Este documento sigue siendo el **cómo** agnóstico; aquel decide el **quién sirve qué**.
> **Implementado en #84.** Fases 1 y 3 corren hoy (`assetAttrs()` en los templates +
> `cdnRepoPath()`); la Fase 2 —hidratación client-side por `data-asset-key`— sigue siendo
> un plan: no hay ningún `data-asset-key` en el HTML generado.

## Capa existente (TypeScript)

- `src/ts/assets/manifest.ts`: claves lógicas → rutas relativas.
- `src/ts/assets/url.ts`: `assetUrl(...)` aplica `VITE_ASSET_BASE_URL` si existe; si no, devuelve ruta relativa local.

## Activación por configuración

Define `VITE_ASSET_BASE_URL` en el entorno:

```bash
# ejemplo Cloudflare / cualquier CDN con prefijo estable
VITE_ASSET_BASE_URL=https://tu-cdn.example.com
```

o en Cloudinary (según convención de prefijo/path que adoptes):

```bash
VITE_ASSET_BASE_URL=https://res.cloudinary.com/tu-cloud/image/upload
```

## Migración gradual recomendada

### Fase 1 — mantener HTML tal cual

Dejar `<img src="assets/...">` sin cambios para no romper nada.

### Fase 2 — introducir claves en HTML

Cambiar gradualmente a:

```html
<img class="pub-thumb" data-asset-key="papers:trujillo2025" alt="..." />
```

Luego, en un módulo de hidratación:

- seleccionar `[data-asset-key]`
- resolver con `assetUrl(key, "papers")`
- asignar `img.src`
- opcional: fallback a la ruta local si la CDN falla.

### Fase 3 — mover el contenido de `assets/` a CDN

El contenido **no se sube a mano**: jsDelivr sirve el repo por tag, así que "subir" es
tagear. La ruta del repo no siempre es la ruta servida — el mapa vive en
`cdnRepoPath()` (`src/ts/assets/url.ts`):

| Ruta servida | Ruta en el repo (la que usa jsDelivr) |
|---|---|
| `/assets/brand/<file>` | `assets/brand/logo/<file>` (los copia `vite.config.ts`) |
| `/assets/og-image.png` | `public/assets/og-image.png` (Vite publica `public/` en la raíz) |
| `/assets/<name>.jpg` (4 thumbs) | `public/assets/<name>.jpg` (Vite las copia tal cual; sin hash de Vite) |

## Activación (estado actual, #84)

```bash
# 1. tag anotado sobre el commit que YA contiene los assets (no sobre un main atrasado)
git fetch origin && git tag -a v1.1.2 origin/main -m "assets CDN" && git push origin v1.1.2

# 2. la base entra por variable de repo; el deploy la pasa a Vite
gh variable set CDN_BASE_URL \
  --body "https://cdn.jsdelivr.net/gh/ChristianLuciani/christianluciani.github.io@v1.1.2"
```

Estado: **activo desde 2026-10-26 con `v1.1.1`**. `v1.0.0` sirve otro favicon y `v1.1.0` se
retiró (se creó sobre un `main` local atrasado: 404 en las 4 thumbs).

Sin `CDN_BASE_URL`, `VITE_ASSET_BASE_URL` queda vacía y el sitio se sirve desde Pages
como siempre: **no hay estado intermedio roto**. Para volver atrás, borrá la variable.

- **Build:** `build.ts` genera las rutas con la base; sin base emite las rutas de Pages y
  ningún `data-local`.
- **Runtime:** `installAssetFallback()` (`src/ts/assets/fallback.ts`) devuelve el asset a
  su copia local si la CDN falla (thumbs e favicons; el OG no tiene fallback: lo consume
  un crawler).
- **Gate:** CI construye en los dos modos y falla si el mapa fuente→servida se rompe.
- **Rollback:** quitar la variable (no requiere revertir el PR).

