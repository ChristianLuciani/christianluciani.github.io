# `proposals/estilo-lab/` — prototipo A/B del issue #89

El sitio principal (hero + navegación + Sala 01) con el lenguaje visual del
[Laboratorio temporal](../logo-timing/), para que el operador decida **con la
comparación a la vista**. No es productivo: no está en el deploy, no toca `main`,
no toca `vite.config.ts`.

- `index.html` + `estilo.css` — el prototipo navegable (HTML+CSS estático, sin JS,
  sin fuentes web).
- `comparar.html` — la comparación lado a lado (desktop 1440×900 / móvil 390×844),
  con capturas del sitio actual y del prototipo.
- `NOTA.md` — legibilidad, contraste/AA, performance, esfuerzo de migración, riesgos
  y recomendación con el set de tokens.
- `capturas/` — PNG de evidencia + `mediciones.json` (peso, requests, fuentes,
  timings, y una sonda de DOM por captura).
- `capturar.mjs` — regenera todo lo anterior.
- `contraste.mjs` — regenera los ratios WCAG citados en la NOTA.

## Verlo

El prototipo es autocontenido, así que alcanza un servidor estático:

```bash
python3 -m http.server 8080 --directory proposals/estilo-lab
# http://127.0.0.1:8080/          → prototipo
# http://127.0.0.1:8080/comparar.html → comparación
```

Si además se quiere el sitio actual al lado, hace falta el build y un servidor con dos
montajes; `capturar.mjs` ya lo hace (ver abajo) y publica las capturas.

## Regenerar la evidencia

```bash
npm run build                 # dist/ — el sitio actual tal como se publica
node proposals/estilo-lab/capturar.mjs
node proposals/estilo-lab/contraste.mjs
```

`capturar.mjs` levanta un servidor propio (`/` → `dist/`, `/lab/` → esta carpeta,
`/laboratorio/` → `proposals/logo-timing/`), abre Chrome headless por CDP y escribe:

| archivo | qué es |
|---|---|
| `capturas/actual-hero-{desktop,mobile}.png` | portada actual **tal como se publica hoy** (canvas 300×150) — bloque secundario |
| `capturas/lab-hero-{desktop,mobile}.png` | portada del prototipo |
| `capturas/actual-sala01-{desktop,mobile}.png` | Sala 01 actual tal como se publica hoy — bloque secundario |
| `capturas/lab-sala01-{desktop,mobile}.png` | Sala 01 del prototipo |
| `capturas/actual-*-canvasfull-{desktop,mobile}.png` | actual con el bug de canvas corregido **solo en el navegador de captura** — es el par principal del A/B |
| `capturas/comparar-{desktop,mobile}.png` | la página de comparación |
| `capturas/mediciones.json` | red (bytes por tipo, fuentes), timings, nodos y sonda de DOM |

Decisiones del script que importan si se vuelve a correr:

- Emula `prefers-reduced-motion` **solo en el sitio actual**, para saltar la intro de
  ~16 s sin esperarla; el prototipo no la tiene.
- `Network.setCacheDisabled` en todas las corridas: cada viewport se mide en frío.
- `Network.setBlockedURLs(['*audio*'])`: el audio ambiente se descarga bajo demanda y no
  es determinista; se mide aparte (`mediciones.json > audioAmbiente`).
- **`capturas/` tiene 14 PNG**: 12 son los que muestra `comparar.html` y 2 fotografían la
  propia página de comparación (`comparar-desktop.png`, `comparar-mobile.png`).
- `--no-sandbox` es obligatorio en este host: el sandbox de Chrome no arranca bajo el
  sandbox de archivos de la sesión (crashpad no puede escribir en `~/Library`).
- Requiere `npm run build` antes: si falta `dist/index.html`, el script falla explícito.
