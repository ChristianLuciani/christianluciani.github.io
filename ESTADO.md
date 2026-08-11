# ESTADO — christianluciani.github.io (CV de Christian Luciani)

> Archivo de re-entrada rápida. Actualizar al final de cada sesión.
> Última actualización: 2026-08-10 (audio pulido: icono plano, sin salto inicial, 0.7s de negro en el intro)

## Desplegado en
https://christianluciani.github.io/  (raíz · base "/")

---

## ✅ Fix de sesión — audio pulido (rama `aionui/pi/audio-pulido`)

- **Botón plano tipo silueta**: el emoji 🔊/🔇 se reemplazó por dos SVG inline (altavoz + ondas /
  altavoz + X), trazo `currentColor` estilo silueta; el botón ya no tiene fondo/borde (plano,
  color `--muted`, hover teal). El toggle ahora cambia la clase `.muted` (icono off visible).
- **Sin salto inicial en el audio**: el crossfade anterior arrancaba con la cola de la canción a
  todo volumen. El MP3 se re-encodó con `afade` (fade-in 2.5s al inicio + fade-out 2.5s al final):
  arranque suave y loop con respiro, sin clic.
- **0.7s de negro antes del texto** del intro (`START_DELAY`): el loader (negro + fractal) queda
  700ms antes de la primera frase — parsimonia en la entrada. Verificado en browser: el `.in` de
  la frase aparece exactamente 0.7s después del `load`.
- 43 tests + tsc limpio; sin excepciones en consola.

---

## ✅ Fix de sesión — audio (rama `aionui/pi/audio-boton`)

- **Fade in** al iniciar/reanudar el sonido (2.5s, rampa lineal testeada `fadeSteps`) y fade out
  rápido (450ms) al apagar.
- **Volumen base más bajo**: 0.06 → **0.04**.
- **Loop sin costura**: el MP3 se re-encodó con ffmpeg aplicando un **crossfade fin→inicio**
  (2.5s, `acrossfade`): el bucle ya no tiene clic/eco en el punto de corte (misma duración 37.94s).
- **Botón arriba para apagar el audio**: `#btn-sound` (fijo arriba a la derecha, junto a
  `btn-lang`), 🔊/🔇 con `aria-pressed`. Apaga con fade out + pause; reanuda con fade in. Oculta
  en @media print.
- Verificado en browser (CDP): botón visible top-right, toggle 🔊→🔇→🔊 con kPause al apagar,
  audio reproduciendo el archivo crossfade; 43 tests + tsc limpio.

---

## ✅ Fix de sesión — intro + audio (rama `aionui/pi/intro-audio`)

- **Foco de lectura más lento (~2×)**: intervalo por palabra `clamp(300, 700, 3600/n)` ms (antes
  120–320ms) y el tiempo visible de cada frase se ajusta para que la lectura guiada complete antes
  del fade-out (`phraseDisplay`).
- **Nombre centrado en el lugar de la frase**: el `.hero-name` aparece CENTRADO en el recuadro de
  la última frase (X e Y) y luego vuela a su posición del hero.
- **Sonido ambiente de ballenas** (volumen 0.06, loop): `public/audio/whale-song.mp3` (38s, 112kbps)
  — fuente Wikimedia Commons "Humpbackwhale2.ogg" (CC0, Spyrogumas), convertido con ffmpeg. Se
  intenta reproducir al cargar y se asegura con el PRIMER gesto del usuario (autoplay policy):
  módulo `src/ts/app/ambient.ts` → `initAmbientSound()`.
- Verificado en browser: foco ~600ms/palabra (frase 6 palabras), nombre centrado en la frase y
  aterrizado en el hero, audio reproduciendo (CDP Media: kPlay→kPlaying, duración 37.9s) y la ruta
  del gesto disparando el play; sin excepciones. 39 tests + tsc limpio.

---

## ✅ Fix de sesión — intro (rama `aionui/pi/intro-lectura`)

- **Lectura guiada**: cada frase se renderiza con una palabra por `<span class="p-word">` y un
  foco que avanza palabra a palabra (`.p-word--focus`: opacidad plena + teal; el resto al 32%).
  Intervalo adaptativo según longitud de la frase (120–320ms). Espaciado por margin (uniforme en
  flex e inline).
- **Nombre como continuación**: el `.hero-name` aparece (fade in) en el MISMO lugar donde terminó
  la última frase (sin corte ni vacío) y vuela a su posición natural del hero; al aterrizar vuelve
  a flow y el loader se oculta. Un solo objeto (sin `.intro-name`).
- Bug de spans corregido: al quitar espacios del texto no debían tocarse los tags (`<span class`
  → `<spanclass` rompía el markup); ahora se elimina solo el espacio entre spans.
- Verificado en browser: foco avanza (¿Pueden → … → persona?), frase 3 en 2 líneas con 4 palabras,
  nombre revelado en el lugar de la frase (511,531) y aterrizado en el hero (115,347); 1280×720 y
  reduced-motion sin regresión; sin excepciones. 39 tests + tsc limpio.

---

## ✅ Fix de sesión — intro (rama `aionui/pi/intro-uno`)

- **El nombre es UN SOLO objeto**: se eliminó el `.intro-name` del loader (y su CSS). El propio
  `.hero-name` (elemento del hero-content) aparece centrado sobre el loader (fade in) y vuela a
  su posición natural vía transform; al aterrizar vuelve a flow y el loader se oculta. El
  elemento nunca se mueve en el DOM — no hay nombre duplicado.
- **`<br>` eliminado** entre Christian y Luciani (hero-name): los spans `hero-first/hero-last`
  ya son `display:block`, así que el `<br>` era redundante y además generaba una línea vacía
  (altura del nombre 306px → 194px).
- **Bug de animación resuelto**: `fadeUp` con `fill-mode: both` pisaba los estilos inline
  (transform/opacity) del vuelo para siempre; se desactiva (`animation: none`) al empezar el
  vuelo y `opacity:1` queda inline tras el aterrizaje (la base CSS es opacity:0).
- Verificado en browser: trayectoria animada del transform (centro 519,434 → natural 115,347 en
  1440×900), aterrizaje en flow, sin `.intro-name` duplicado, sin `<br>`, sin excepciones;
  1440×900 y 1280×720. 39 tests + tsc limpio.

---

## ✅ Fixes de sesión — intro (rama `aionui/pi/intro-movimiento`)

- **Frase 3 en dos líneas**: `.intro-phrase` es `display:flex`, así que un `<br>` suelto se
  convertía en un flex item vacío (nunca cortaba). Fix: la frase se envuelve en un `<span>`
  (un solo flex item → el `<br>` funciona adentro): `"<span>Una<br><em>Instancia Humana</em>.</span>"`
  en `src/cv/intro.ts`. Verificado: altura 108px (2 líneas) vs ~50px (1 línea).
- **Nombre: un solo movimiento (no dos objetos)**: al terminar las frases, el nombre del intro
  ahora VUELA a la posición del `.hero-name` (rect exacto vía transform translate+scale, z-index
  por encima del loader) y al aterrizar se retira, se oculta el loader y el hero queda revelado
  en la MISMA posición → continuidad visual sin salto. Aterrizaje verificado pixel-perfect en
  browser (rect del intro converge al rect del hero: 115,291 403×306 en 1440×900).
- Sin regresión en reduced-motion (loader oculto por el minimize del fractal) ni en 1280×720.

---

## ✅ Fixes de sesión — intro (rama `aionui/pi/intro-fractal-fixes`)

- **Superposición fractal ↔ texto del intro**: el fractal subió de `top:calc(50vh - 200px)` a
  `50vh - 250px` y el bloque de texto de `margin-top:190px` a `270px` (el margen flex rinde ~la
  mitad al centrar). Media query `@media (max-height: 600px)` restaura los valores originales en
  pantallas bajas. Verificado en browser: sin solapamiento con gap 30–36px en 1440×900, 1280×720
  y 700×500; el nombre final queda visible sin cortarse.
- **Frase 3 del intro** → `"Una<br><em>Instancia Humana</em>."` (dos líneas, antes una sola).
- Ambos fixes = editar `src/` + `npm run build` (flujo parametrizado Fase 2): los cambios de CSS
  viven en `src/templates/head_html.ts` y la frase en `src/cv/intro.ts`.

---

## ✅ Fase 2 del refactor — modularización (rama `aionui/pi/modularizacion`)

**SPEC:** `docs/REFACTOR_PLAN.md` §3.2/§4. `index.html` es **100% generado** por `build.ts`.

- `npm run build` = `node build.ts && vite build`; `npm run build:html` regenera solo el HTML.
- Templates en `src/templates/` (head, print-cv, cover, hero, plano, salas + ensamble `index.ts`);
  nav-dots, celdas del plano (grilla 3×2) y headers de sala se generan desde `SALAS`.
- **Cero scripts inline**: los 4 bloques `<script>` → módulos TS bundleados por Vite
  (`src/ts/app/ui.ts`, `canvasWatch.ts`, 7 ilusiones, `src/ts/graph/grafo.ts`, `src/cv/i18n.ts`,
  `src/cv/intro.ts`). El `dist/index.html` solo tiene ld+json + el bundle.
- i18n importa SALAS directo (ya no usa `window.__CV_I18N__`); `mountSalas()` con drift-guard
  i18n-aware (no pisa traducciones EN).
- Test de build (`src/cv/build.test.ts`): el index.html commiteado debe ser byte a byte el
  output de `assembleHtml()` → editar contenido = editar `src/` + rebuild (contrato enforced).
- Verificado en browser headless: ES/EN + persistencia, nav, plano, intro completa, grafo,
  canvases, sin errores de consola. 39 tests.

---

## ✅ Fase 1 del refactor — parametrización de salas (`aionui/pi/salas-parametrizacion`, mergeada)

- Fuente de verdad = `src/cv/salas.ts` (`SALAS`); nav, numeración, `ROOM_EN[]` y claves de sala
  del `MAP` se derivan desde ahí (runtime vía `mountSalas()` + build vía templates).
- Tests: `salas.test.ts`, `parity.test.ts`, `inline-scripts.test.ts`.
- Fix preexistente: comentario HTML anidado del bloque galería.

---

## ✅ Completado
- Fractal Koch animado (3 copos anidados, rotación diferencial) → minimiza como logo
- Foto de perfil circular (enero 2023) con fallback automático
- Botón descarga CV + versión imprimible A4 (@media print)
- Logo Drahma desde repo público DRAHMAN-ORG
- Galería con placeholders en 3 sub-secciones (Drahma, Lab STEM, Ciencia pública)
- WhatsApp, LinkedIn, ResearchGate, X, Instagram
- Thumbnails reales de papers (figuras de portada) en Sala 05 Biblioteca
- Enlaces a ilusiones ópticas (michaelbach.de) en cada `.illusion-frame`
- i18n ES/EN (toggle + diccionario `MAP`) para el sitio; print-CV/imprimible actualmente solo en ES
- Necker BG full-width en Sala 01
- Sala 02 Proyectos: Kontablo, ZENTROPY, Esteléctica, CLAPPS.AI, NOOS, Drahma (showcase integrado, ya no es sala aparte)
- Manual de estilo embebido en comentario HTML
- Estructura modular: docs/CONTRIBUTING.md, docs/STYLE_GUIDE.md, build.sh, ESTADO.md

---

## 🔜 Backlog — ordenado por prioridad sugerida

### P1 — Fotos de galería (impacto alto, esfuerzo bajo)
Añadir imágenes reales a `assets/gallery/` y descomentar los `<img>` en cada `.gallery-slot`.
- Drahma en campo amazónico (3 slots)
- Lab STEM USFQ — impresora 3D, cortadora láser, materiales (4 slots)
- Casa Abierta USFQ / difractómetro de rayos X (2 slots)
**Acción:** sesión fotográfica o rescate de archivo. Sin código nuevo.

### P4 — Fractales en TypeScript con leyenda matemática
Generar los fractales del lado del cliente en TypeScript compilado.
Cada canvas muestra en el margen la ecuación generadora estilo `\mathcal{}` de LaTeX,
renderizada con MathJax o KaTeX (CDN, ~30KB gzip).

Fractales candidatos con sus ecuaciones:
- Koch snowflake: regla de subdivisión `f(z) = z/3, z/3 + e^{iπ/3}/3, ...`
- Mandelbrot: `z_{n+1} = z_n² + c`, colorear por velocidad de escape
- Julia sets: igual que Mandelbrot con c fijo, z variable
- Sierpinski: IFS (Iterated Function System) — 3 contracciones afines
- Barnsley fern: IFS con 4 transformaciones afines
- L-System Koch: `F → F+F--F+F` con ángulo 60°

Arquitectura sugerida:
```
src/ts/
  fractals/
    koch.ts       ← Koch snowflake + L-system
    mandelbrot.ts ← Mandelbrot + Julia
    ifs.ts        ← Sierpinski, Barnsley
    renderer.ts   ← Canvas renderer compartido
    equations.ts  ← Strings LaTeX por fractal
  index.ts        ← Entry point, carga por sala
```
Build: `tsc` o `esbuild` → `src/js/fractals.bundle.js` → importado en index.html.
**Prerrequisito:** decidir si mantener single-file o separar JS. Abrir issue.

### P5 — Galería 3D con parallax en scroll / mouse
Sala de galería con planos a diferentes profundidades (eje Z).
- `z = 0`: plano principal (fotos grandes, primer plano)
- `z > 0`: planos de fondo (fotos más pequeñas, desplazadas con el mouse)
- Interacción: `mousemove` → `translateZ` leve en cada plano (efecto magnético)
- `hold scroll` o `Alt + scroll` → acercar el plano z>0 hacia z=0

Implementación: CSS `perspective` + `transform: translateZ()` por capa.
JS: escuchar `mousemove` y mapear posición a `rotateX/Y` en el contenedor.
Canvas de fondo por plano con textura sutil.
**Esfuerzo:** M-L. Abrir issue dedicado.

### P6 — Multilingüe ES / EN / FR
**Estado:** ES/EN implementado con toggle (`#btn-lang`) y diccionario `MAP` al final del `index.html`.
**Pendiente:** FR.
**Criterio:** vale la pena a medias. Los navegadores traducen bien el texto plano,
pero NO traducen: metadatos OG/Twitter, PDF descargable, labels de canvas,
tooltips de ilusiones, ni el CV imprimible.

Al añadir texto ES en `index.html` → <strong>actualizar también su traducción EN en `MAP`</strong>.

**Esfuerzo:** M. Francés requiere revisión nativa.

---

## 💡 Ideas futuras (sin fecha)

- SVGs de alta calidad para ilusiones (prompts en docs/STYLE_GUIDE.md)
- Variante CV para ERP/Zoho consulting
- Variante CV académica con publicaciones expandidas
- Página dedicada a ilusiones ópticas (dominio propio o subdominio)
- Revisión de repos GitHub y actualización de Sala 02 Proyectos con info real

---

## Notas técnicas

- Single HTML file · sin build step obligatorio para editar contenido
- Deploy: GitHub Actions compila `dist/` (Vite, base "/") y publica en la raíz; push a `main` → ~1 min
- Fractal: 3 copos Koch anidados rotando a velocidades distintas
  (`fractalAngle`, `-fractalAngle*1.3`, `fractalAngle*2`)
- Foto: URL Google Photos con onerror fallback →
  si expira, colocar `assets/images/christian-luciani.jpg`
- Ramas: `aionui/pi/[tema]` (aioncore), `claude/[tema]` (Claude), `cursor/[tema]` (Cursor)
- i18n: texto ES en el HTML + diccionario EN en `MAP` (final del archivo). Rojo y verde: al editar ES, editar EN.
- 2026-07-24: Añadida contribución OSS pi-acp (svkozak/pi-acp#76) — implementación session/delete para protocolo ACP — en sección Open Source de Sala 07 Competencias
- 2026-08-10: Sitio alineado a la raíz (`christianluciani.github.io/`); lista de publicaciones unificada entre JSON-LD, Sala 05 Biblioteca y print-CV; numeración de salas y nivel de inglés consistentes
- 2026-08-10: Drahma integrado como showcase dentro de Sala 02 Proyectos (ya no es sala aparte); renumera salas 03–07
- 2026-08-10: Nombre "Christian Luciani" (sin Toledo); animación intro (frase → nombre) tras el fractal; QR en el CV imprimible
- 2026-08-10: Limpieza de artefactos: eliminados `assets/index-OWey81UA.js` (+ `.map`) del árbol; el entry pasa a apuntar a `/src/main.ts`
- 2026-08-10: Sala Contacto renombrada a «Conectar» (SALA 07); se añade `docs/REFACTOR_PLAN.md` (parametrización + modularización, plan para próxima ventana)
- 2026-08-10: Fix crítico: faltaba `</script>` tras el bloque i18n (rompía el parseo); se corrige y se revalidan los scripts embebidos
- 2026-08-10: Se añade Sala «La Constelación» (mapa de conexiones interactivo en canvas, fondos según publicado/no-publicado); se mueve a penúltima posición como recapitulación
- 2026-08-10: Galería/Evidencia oculta (`display:none`) hasta llenar el contenido
- 2026-08-10: El nombre «Christian Luciani» persiste como firma debajo del fractal minimizado (esquina SI) tras la intro
