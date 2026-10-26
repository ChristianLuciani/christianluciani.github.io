# Plan — Migración de assets a CDN (agnóstica)

Objetivo: servir imágenes (papers, galería, etc.) desde un CDN (Cloudinary, Cloudflare, etc.) cambiando solo configuración, sin acoplar el código al proveedor.

> Decisión de proveedor y pipeline: [`docs/cdn-decision.md`](cdn-decision.md) (#57).
> Este documento sigue siendo el **cómo** agnóstico; aquel decide el **quién sirve qué**.

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

Subir `assets/images/...` y `assets/gallery/...` respetando la misma estructura de paths para que el manifest no cambie.

