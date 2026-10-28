# Nota de evaluación — #89 · sitio principal con el lenguaje del laboratorio

Cubre: hero, navegación y Sala 01 del sitio, traducidos al lenguaje del Laboratorio
temporal, y la comparación contra el sitio actual (build de este commit).
No cubre: las otras 8 salas, i18n completa, impresión del CV, ni ninguna decisión
de adopción (la toma el operador).
as_of: 2026-10-27 · rama `dsh/sprint/89` · todo el material vive en `proposals/estilo-lab/`.

**Cero cambios productivos**: `main` intacta, `vite.config.ts` sin tocar, `index.html`
generado igual que antes (`npm run build` no produce diff), nada publicado.

---

## 1. Qué se comparó y cómo se reprodujo

| Pieza | Dónde |
|---|---|
| Prototipo navegable | `proposals/estilo-lab/index.html` + `estilo.css` (HTML+CSS estático, 0 JS) |
| Comparación lado a lado | `proposals/estilo-lab/comparar.html` (desktop 1440×900 / móvil 390×844) |
| Capturas | `proposals/estilo-lab/capturas/*.png` |
| Mediciones crudas | `proposals/estilo-lab/capturas/mediciones.json` |
| Regeneración | `node proposals/estilo-lab/capturar.mjs` (Chrome headless por CDP, server estático propio) |
| Contraste | `node proposals/estilo-lab/contraste.mjs` |

Método, para que el número sea discutible:

- El sitio actual se sirve desde `dist/` (build real de este commit, `npm run build`),
  no desde un archivo abierto a mano.
- `prefers-reduced-motion: reduce` se emula en el navegador de captura para saltar la
  intro de ~16 s y fotografiar el estado asentado. No cambia HTML, CSS ni assets.
- Caché del browser **deshabilitado** en todas las corridas: cada viewport se mide en frío.
- Un solo Chrome, un solo perfil, viewport emulado por CDP (`deviceScaleFactor: 1`).
- Cada captura deja una sonda de DOM en `mediciones.json > verificacion` (elemento
  visible, tamaño, color, fuentes cargadas, `overflowX`, canvas): el PNG no es la
  única evidencia de qué se estaba viendo.

## 2. El delta real no es el color

La paleta ya es la misma: el sitio usa `--night #050810`, `--deep #0b1120`,
`--teal #00c9c0`, `--gold #c9a84c` (`src/templates/head_html.ts:247+`,
`docs/STYLE_GUIDE.md`); el laboratorio usa exactamente esos cuatro valores
(`proposals/logo-timing/index.css:root`).

Lo que cambia, y es lo que el prototipo pone a la vista:

| Eje | Sitio actual | Laboratorio |
|---|---|---|
| Tipografía | Playfair Display (display) + Cormorant Garamond (cuerpo) + Fira Code (labels), 3 familias desde Google Fonts | `ui-sans-serif` (todo) + `ui-monospace` (labels), sistema, 0 fuentes web |
| Superficie | salas de 100vh, tarjetas full-width con filete izquierdo, casi sin chrome | contenedor 1220 px, HUD, bordes finos, radios 15 px, tarjetas en grilla, chips de estado |
| Ritmo | scroll cinematográfico, entradas escalonadas, canvas de ilusión por sala | lectura continua, densidad alta, métricas tabulares |
| Navegación | columna de 9 dots a la derecha, label en hover | barra superior con número + label siempre visibles (en móvil colapsa a marca + CTA) |
| Voz | museográfica: "Sala 01 · La Exposición" en serif itálica | técnica: eyebrow mono, número mono, título sans |

El prototipo conserva la *voz* del museo (nombres de sala, numeración, "Luciani" en
teal) y cambia la *superficie*: eso es exactamente lo que la comparación permite juzgar.

## 3. Legibilidad

- Cuerpo: sitio 18 px / 1.7 en serif; prototipo 16 px / 1.55–1.62 en sans. Con la
  misma altura de línea aparente, la sans gana en pantallas chicas y pierde algo de
  "aire" museográfico.
- Labels: **los dos** usan mono muy chico — sitio 0.55–0.68 rem (8.8–10.9 px),
  prototipo 9–10.5 px. Ninguno es generoso; el prototipo al menos los agrupa y les da
  contraste AA (ver §4).
- Densidad: en Sala 01 el prototipo muestra las 3 piezas y el detalle de Kontablo en
  una pantalla y media; el sitio necesita ~2.5 pantallas para lo mismo. Es el cambio
  más visible a favor del laboratorio.
- El hero del prototipo pierde el golpe de 7.5 rem en Playfair: el nombre en sans a
  104 px es correcto pero no es la misma entrada. Se puede conservar (ver §8).

## 4. Contraste / AA

Salida de `node proposals/estilo-lab/contraste.mjs` (WCAG 2.1, AA normal = 4.5,
AA texto grande = 3.0):

| texto | sobre `--bg-0` | sobre tarjeta del prototipo | sobre tarjeta del sitio |
|---|---|---|---|
| `--ink` #e7edf6 | 17.01 AA | 15.47 AA | 15.07 AA |
| `--ink-dim` #8b9bb0 | 7.07 AA | 6.43 AA | 6.26 AA |
| `--ink-faint` #5b6a7e | 3.63 **solo grande** | 3.30 **solo grande** | 3.22 **solo grande** |
| `--ink-meta` #75849a (ajuste) | 5.76 AA | 4.79 AA | — |
| `--text` del sitio #d6dde8 | 14.65 AA | — | 12.98 AA |
| `--muted` del sitio #6b7a8d | 4.57 AA (al límite) | — | 4.05 **solo grande** |
| `--teal` #00c9c0 | 9.65 AA | 8.77 AA | 8.55 AA |
| `--gold` #c9a84c | 8.76 AA | 7.97 AA | 7.76 AA |
| `--ice` #7ad7ff | 12.39 AA | 11.27 AA | 10.97 AA |
| `--coral` #ff8a70 | 8.70 AA | 7.91 AA | 7.71 AA |

Dos hallazgos, ambos resueltos o declarados en el prototipo:

1. **`--ink-faint` del laboratorio falla AA para texto normal** (3.30–3.63:1) y el
   laboratorio lo usa en labels de 9–10.5 px. El prototipo introduce
   `--ink-meta: #75849a` (4.79:1 sobre tarjeta, 5.76 sobre `--bg-0`) y lo usa en todo
   texto chico; `--ink-faint` queda solo para decoración. **Si se adopta el lenguaje
   del laboratorio, este token viaja corregido o no viaja.**
2. `--muted` del sitio (#6b7a8d) está en 4.57 sobre `--night` y cae a 4.05 sobre la
   tarjeta `--surface` — el mismo problema, un paso menos grave. Es texto de metadata
   (taglines, subtítulos de sala).

## 5. Performance

Medido en frío, una corrida por viewport, local (localhost, sin latencia de red):

| Métrica | Sitio actual | Prototipo | Delta |
|---|---|---|---|
| Peso desktop | **642,4 KB** / 32 requests | **26,4 KB** / 3 requests | −96 %, 10× menos requests |
| Peso móvil | 638,7 KB / 31 requests | 25,2 KB / 2 requests | −96 % |
| JS | 84,6 KB (29,3 KB gzip) | 0 | — |
| Fuentes web | **158,1 KB en 5 woff2** (el CSS declara 52 `@font-face`) | 0 | −158 KB |
| Imágenes | 277,5 KB (incluye 135,3 KB de la foto circular, servida desde `lh3.googleusercontent.com`) | 0 | — |
| Documento HTML | 133,9 KB (CSS inline + JSON-LD + SVG) | 9,8 KB | 14× |
| Nodos DOM | 835 | 147 | 5,7× |
| DCL / load (local) | 496 ms / 843 ms | 73 ms / 81 ms | — |

Lectura honesta de la tabla: el prototipo **no tiene** las features del sitio (9 salas,
i18n, sonido, canvas de ilusión, grafo de conexiones, CV imprimible). La comparación
de bytes vale como **cota del costo del lenguaje visual**, no como "el sitio podría
pesar 26 KB". El ahorro realista al adoptar el lenguaje es el de las fuentes
(−158 KB, la mitad del ahorro de bytes) más el CSS que deja de ser inline.

## 6. Esfuerzo de migración (estimación [INF], no medida)

- `src/templates/head_html.ts` (969 líneas) es el 90 % del trabajo: hoy el CSS del
  sitio vive inline en un solo `<style>`; habría que partirlo en capas
  (tokens / base / componentes / salas) y reescribir tipografía y componentes.
- `src/templates/sala_html.ts` (729 líneas) tiene **59 atributos `style="…"`** inline
  que sobrevivirían al cambio de hoja y romperían la consistencia: hay que barrerlos.
- Navegación: dos caminos — el markup de `src/templates/cover_html.ts` y los dots que
  regenera `src/cv/render.ts` (`.nav-dot`, 151 líneas). El HUD reemplaza a los dos.
- i18n: `src/cv/i18n.ts` (157 líneas) tiene que aprender los labels del HUD (hoy son
  `data-label` de los dots).
- `src/templates/print_cv_html.ts` (133 líneas) queda afuera: la impresión tiene su
  propia hoja y no debe heredar el rediseño.
- Alcance observado: hero + nav + Sala 01 tomó esta sesión. Estimar las 8 salas
  restantes en 2–3 sesiones más i18n y una pasada de accesibilidad. Tamaño **M–L**,
  no un cambio de CSS de una tarde.

## 7. Riesgos

1. **Identidad**: el museo es Playfair itálica + 100vh + ilusiones. El laboratorio es
   denso y funcional. Adoptarlo entero convierte el sitio en un dashboard elegante;
   eso puede ser exactamente lo que no se quiere.
2. **Regresión de accesibilidad** si los tokens del laboratorio viajan tal cual
   (`--ink-faint` falla AA) y si la densidad empuja el texto a 9 px.
3. **Comparación confundida por un bug existente**: los canvas de fondo del sitio se
   pintan a 300×150 (ver §9). El sitio actual está visualmente degradado hoy; sin
   corregirlo, cualquier comparación favorece al laboratorio por la razón equivocada.
4. **Deploy**: mientras el prototipo viva en `proposals/estilo-lab/` no se publica
   (Vite copia solo `proposals/logo-timing/` → `/laboratorio/`). Agregarlo al deploy
   sí es un cambio productivo y requiere OK.
5. **Impresión**: 59 inline styles + hoja de impresión propia; un rediseño mal acotado
   contamina el PDF del CV.
6. **Fuentes**: sacar Playfair ahorra 158 KB pero es la voz del sitio; si se conserva
   conviene self-hostear un subset (una familia, 2–3 woff2) en vez de 3 familias + 52
   caras declaradas.

## 8. Recomendación: **híbrido**

Ni "adoptar el laboratorio" ni "mantener". El A/B muestra que el valor del
laboratorio está en la **superficie de información** (nav, tarjetas, metadata,
densidad, contraste) y el valor del sitio está en la **voz** (serif, sala, entrada
cinematográfica). El híbrido toma lo primero y conserva lo segundo en dos lugares
exactos: el nombre del hero y los títulos de sala.

### Set de tokens que se llevaría

Colores — **no cambia ninguno** (ya son los mismos):

```
--bg-0 #050810   --bg-1 #0b1120
--ink #e7edf6    --ink-dim #8b9bb0   --ink-meta #75849a   ← token nuevo (AA)
--line rgba(140,170,200,.14)         --line-soft rgba(140,170,200,.08)
--teal #00c9c0   --gold #c9a84c      --ice #7ad7ff   --coral #ff8a70
```

- `--ink-faint #5b6a7e` **no viaja como color de texto** (3.30:1); queda para
  decoración. Se reemplaza por `--ink-meta` en labels y metadata.
- `--muted` del sitio (#6b7a8d) se retira como color de texto: lo reemplaza
  `--ink-dim` (#8b9bb0, 6.43:1) o `--ink-meta` si se quiere conservar la jerarquía.

Tipografía:

```
--sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif   → cuerpo y UI
--mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace → labels
--display: 'Playfair Display', serif  → SOLO hero-name y títulos de sala (conservar)
```

`Cormorant Garamond` y `Fira Code` se van (cuerpo → sans, labels → mono del sistema).

Forma:

```
radio tarjeta 15px · radio chip 99px · borde 1px --line-soft
grilla de tarjetas: 3 col desktop / 2 tablet / 1 móvil, gap 12px
banda de métricas: grid 3, dt mono 9px --ink-meta, dd mono 17–22px --ink
contenedor: 1220px · nav: HUD superior sticky (número + label)
```

Lo que **no** se lleva: los 100vh por sala ni el scroll cinematográfico se tocan; las
ilusiones de canvas se quedan (y se arreglan, §9); la entrada del hero conserva su
animación.

### Lo que decide el operador (3 opciones y su costo)

- **A · Adoptar el lenguaje del laboratorio completo** — dashboard coherente, −158 KB
  de fuentes, pero se pierde la entrada museográfica. Costo M–L (§6).
- **B · Híbrido (recomendado)** — HUD + tarjetas + tokens AA en la superficie; Playfair
  en hero y títulos de sala. Costo M; el riesgo de identidad queda acotado a 2 elementos.
- **C · Mantener** — cero costo; el sitio sigue con 158 KB de fuentes, 835 nodos y el
  problema de contraste de `--muted` en tarjetas. Válido si la entrada museográfica
  pesa más que la densidad.

## 9. Hallazgos laterales (reportados, **no** corregidos: fuera de alcance)

1. **Los canvas de fondo se pintan en 300×150 px, no a pantalla completa.** `#hero-canvas`
   y `.room-canvas` son elementos reemplazados con `position:absolute; inset:0` y
   `width:auto`: toman su tamaño intrínseco (300×150) en la esquina superior izquierda
   de la sala. Verificado en runtime sobre el build de este commit y sobre el sitio
   publicado (mismo CSS): `{w:300,h:150,cssW:300,cssH:150}` para `#hero-canvas`,
   `c-proyectos`, `c-bastidor`, `c-comp`, `c-exp`, `c-fisica`, `c-necker`; los canvas con
   tamaño fijo (`c-stairs-ill` 496×338, `c-penrose`, `c-graph`, `c-necker-ill`) están bien.
   Arreglo de una línea (`#hero-canvas,.room-canvas{width:100%;height:100%}`), **no
   aplicado** acá. Las capturas `actual-*-canvasfull-*.png` muestran el sitio con ese
   arreglo inyectado solo en el navegador de captura, para que el A/B no compare contra
   una portada degradada.
2. **158 KB de fuentes para 52 `@font-face` declaradas y 5 woff2 usados.** Tres familias
   donde el sitio usa display+cuerpo+mono; Cormorant y Fira Code son candidatas obvias a
   retirar incluso sin rediseño.
3. **La portada arrastra una imagen externa de 135 KB** desde `lh3.googleusercontent.com`
   (foto circular): un tercer origen en el critical path de la portada.

## 10. Qué NO se midió

- Lighthouse/CLS/INP reales (no hay `puppeteer`/`lighthouse` en `package.json` y el issue
  prohíbe instalar dependencias para esto). DCL/load son de `PerformanceNavigationTiming`
  en local, sin throttling: **no** son una promesa de performance en red.
- Legibilidad con personas: no hay test con usuarios.
- Las 8 salas restantes, i18n y la impresión del CV: fuera del alcance acordado.
- El deploy real del prototipo: no se tocó `vite.config.ts` (prohibido por el issue).
