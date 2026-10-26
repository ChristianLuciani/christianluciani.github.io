# Manual de estilo — Logo Triángulo-Espiral (issue #54)

> **Fuente única de verdad:** la geometría vive paramétrica en
> `tools/logo/geometry.mjs` (puerto verificado 1:1 contra el DOM aprobado de
> `proposals/logo-triangulo-espiral/aurea7.html` — gate
> `tools/logo/verify-dom-fidelity.mjs`). Todos los assets se **generan**;
> nunca se dibujan ni editan a mano.
>
> **ADR D1 RATIFICADO (2026-09-25, PR #58): la versión áurea v16 es el logo
> oficial.** La base v10 queda como referencia comparativa.

---

## 1. El símbolo

Espiral de conocimiento acumulativo: un triángulo que nace en el
origen —la supernova— y gira creciendo en generaciones hasta la C final en
plena intensidad (triángulo abierto = evolución en curso). Con
nodos-estrella en cada vértice: el símbolo es una constelación que se
expande.

- **Espiral**: nace en el origen y crece hacia afuera — opacidad y grosor
  crecientes: cada generación acumula más que la anterior. El conocimiento
  se expande.
- **Constelación**: cada nodo-estrella tiene su propio halo — radio
  aleatorizado con semilla fija y color característico heredado del nodo
  (radialGradient con currentColor: caída rápida, translúcida). Nodo y
  estrella se integran como una constelación real. En la animación las
  estrellas preexisten y se disuelven al ser tocadas por la línea; la
  supernova central permanece: es el origen de todo.
- **La C**: las dos últimas líneas del espiral, grosor máximo — la firma.
  Desde 2026-10-22 es una **barra metálica**, no un trazo plano: ámbar cálido
  en su nacimiento (B), oro de marca en el vértice y luz en la punta, con
  bisel transversal que le da volumen (ver §3.1). Todo el acabado vive en la
  familia del oro: el cuarto color suma calidez, no cambia de metal.
  **La animación (`proposals/.../aurea7.html`) ya refleja este acabado**:
  dibuja la C como banda con bisel y la revela con una máscara que traza el
  path central, conservando el timing del trazado. La integración en el
  sitio es #56.
- **Jerarquía** (operador, 2026-09-25): el ojo va primero al origen — la
  supernova gana +2pt de core y las estrellas grandes de las aristas (la
  punta de la C + las bright) bajan ~22% para no robar protagonismo. Es
  tratamiento del render de marca; el spec de la animación (#53) no cambia
  (#55 puede espejarlo).

## 2. Versiones

| Versión | Generaciones | Internos | Giro entre internos | Estado |
|---|---|---|---|---|
| **base** (v10) | 5 | radio × 1.5 por vuelta | 4°/vuelta | referencia comparativa |
| **áurea** (v16) | 7 (6 internas + C) | distancia = C/φ por generación | 3°×φ = 4.854° | **canónica oficial** (ADR D1) |

Hecho geométrico verificado: el triángulo externo (la C) de la versión
áurea es **idéntico (0.0000 px)** al que la fórmula base produciría con 7
generaciones — el ancla de la C no se toca; sólo cambian los triángulos
internos. Respecto de la v10 (5 generaciones) el espiral completo queda
**+6° rotado horario** (2 vueltas más × 3°/vuelta) — es un hecho del
diseño aprobado, no un desvío.

## 3. Paleta

| Token | Hex | Uso |
|---|---|---|
| Teal (marca) | `#00c9c0` | punta del espiral (=`--teal` del sitio) |
| Oro (firma) | `#c9a84c` | tipografía y ancla de marca (=`--gold`); el bisel de la C deriva de acá (§3.1) |
| **Ámbar (cuarto color)** | `#d99a2b` | nacimiento de la C (B) y barrido cálido (`cFinish.tint.amber`) |
| Ámbar de bloom | `#dfa637` | bloom de la C sobre night (`cFinish.bloom`) |
| Oro profundo (wordmark light) | `#8a5a1c` | tipografía del lockup en light (`cFinish.lightWordmark`) |
| Luz de bisel | `#fffbe6` | brillo del borde iluminado de la C (no es color de marca) |
| Azul profundo | `#16324f` | nacimiento del espiral |
| Night | `#050810` | fondo oscuro (=`--night`) |
| Espectro estelar | `#ff8a70` `#ff6f5e` `#ffb49e` `#f6d7c4` `#cfe0ff` | estrellas: rojizos dominantes + blancos cálidos + un azulado |
| Supernova | `#ffb3a0` | núcleo central permanente |

La rampa del espiral interpola `#16324f → #00c9c0` (22 → 0 R, 50 → 201 G,
79 → 192 B) con opacidad `0.10 → 0.72` y grosor `2.2 → 4.2`.

### 3.1 Acabado de la C — cuarto color y volumen

La C se dibuja con `cBand()` (`geometry.mjs`) como una barra de ancho
`cWidth`, con los mismos centros que el trazo anterior. El contorno **no**
es idéntico: el vértice pasa de join redondo a marco de inglete y las puntas
a terminal circular. Encima se aplican dos capas de gradiente:

1. **Bisel transversal** (`cFinish.perp`, por tramo): eje perpendicular a la
   línea — borde superior iluminado `#fffbe6`, centro oro `#ddb04a`, borde
   inferior en sombra `#8f661c` (oro profundo, nunca marrón). Es lo que
   produce el volumen de barra metálica; la luz se asume cenital.
2. **Barrido longitudinal** (`cFinish.tint`): ámbar `#d99a2b` naciendo en B
   (la firma arranca cálida) que se disuelve hacia el vértice, y un velo de
   luz `#fffbe6` en la punta A.

**Terminaciones** (operador, 2026-10-22): los extremos libres —B y la punta
A— terminan en **terminal circular**: un semicírculo de radio `cWidth/2`
fundido al contorno, que se lee como el remate redondo de la barra **contra
el plano**, no como la cara de un tubo (no hay círculo de color sólido
encima). El vértice C conserva la unión **tipo marco de cuadro**: inglete
con las esquinas redondeadas (recorte `cFinish.cornerCut` = 2.4 por lado, unido con quadratic). El contorno es una
sola pieza, sin huecos ni parches; el bisel se pinta en dos regiones
separadas por la **bisectriz del vértice** (los dos brazos están del mismo
lado de la línea de inglete).

Superficies:

- **Night**: bloom cálido ámbar `#dfa637` (nunca oro translúcido: sobre
  blanco vira a verdoso).
- **Light**: sin bloom. Sombra cálida neutra (`feDropShadow #6b5218`, 20%)
  que despega la C del fondo blanco sin halo de color. En esta superficie
  además se omiten el cielo de fondo y los halos de la constelación (se
  leían como polvo/manchas grises sobre blanco); los núcleos de las
  estrellas se conservan.

Todo esto es **tratamiento de render**: `cPathD`, centros, radios y anchos
siguen siendo la fuente de verdad y el gate de fidelidad no cambia.

**Ambiente night aprobado** (no documentado antes — agregado por review
fresco): el HTML usa `--bg-0 #050810` y `--bg-1 #0b1120` (= `--deep` del
sitio) con un gradiente radial `radial-gradient(1100×780 @ 50% 38%,
#0b1120 → #050810 62%)` y un **halo teal** detrás del logo:
`radial-gradient(closest-side, rgba(0,201,192,.07), transparent 72%)`.
Los PNG dark (`*-dark`, og, apple-touch) reproducen ese ambiente — no son
fondo plano. Los tokens del sitio completos: `docs/STYLE_GUIDE.md`.

## 4. Construcción geométrica

Todos los valores viven en `CONFIG` (`tools/logo/geometry.mjs`):

| Parámetro | Valor | Nota |
|---|---|---|
| `center` | (400, 418) | centro del espiral en el lienzo 800×800 |
| `R` | 250 | radio de la punta de la C |
| `baseAngles` | A −90°, B 40°, C 140° | ángulos base del espiral; A arriba |
| `scalePerLoop` | 1.5 | crecimiento radial por vuelta (ancla) |
| `rotPerLoop` | 3° | giro horario por vuelta (ancla) |
| `globalRot` | 1° | rotación global del símbolo |
| `generations` | 7 (áurea) / 5 (base) | vueltas del espiral |
| `phi` | 1.618 | ratio áureo entre triángulos internos |
| `twistGolden` | 3°×φ ≈ 4.854° | giro entre internos (áurea) |
| `extendLast` | 0.01 | la punta se estira 1%: insinúa seguir evolucionando |
| `cWidth` | 10 | ancho de la barra de la C (bloom night: +6 de ancho; blur/opacidad en `cFinish.bloom`) |

Medición del triángulo final (real, no la del comentario del HTML de
origen): lados 1.26/1.72/1.60 R, ángulos 44.6°/72.9°/62.6° — isósceles
aproximado, ápice ~44.6° en A. El comentario de la fuente dice “isósceles
más agudo: ápice ~50°”; en el manual vale la medición.

La C se dibuja como un **contorno único** (`cBand()`): una barra de ancho
`cWidth` con inglete tipo marco en C —esquinas redondeadas, radio
recorte `cFinish.cornerCut`— y terminales circulares en B y A. No hay caps montados:
los dos tramos comparten el corte del marco y el bisel se pinta en dos
regiones separadas por la bisectriz del vértice.

**Verificación** (tests automáticos, `npx vitest run tools/logo/`):
ancla C ≡ fórmula base a 7 generaciones (0.0000 px), ratios internos = φ
exacto por generación, twist = 3°×φ, determinismo, y fidelidad DOM
(`node tools/logo/verify-dom-fidelity.mjs`). El gate de fidelidad compara la
**geometría de referencia** (centros, segmentos, cielo y constelación) contra
el DOM aprobado. Desde #55, el gate verifica además el **contorno de la
banda** (`cBand`: marco y terminales), que la **máscara de revelado** esté
aplicada en el render normal, y que el acabado completo (bisel, barrido y
bloom) coincida con `cFinish`; los assets se generan desde esa misma
geometría. Desde #59 el gate corre en **CI** (`.github/workflows/ci.yml`: Chrome
headless de linux + `npm run logo:verify`), así que el merge queda bloqueado si
el puerto diverge del DOM aprobado.

## 5. Tipografía

| Elemento | Fuente | Tamaño (lienzo 800) | Tracking | Color |
|---|---|---|---|---|
| Nombre (lockup) | `ui-sans-serif, system-ui…` (idém proposal) | 21px | 0.42em = 8.82px | oro `#c9a84c` (light: `cFinish.lightWordmark`) |
| Caption meta | ídem | — | 0.18em | `--ink-dim` |

En MAYÚSCULAS siempre. El sitio usa Playfair Display (display), Fira Code
(mono) y Cormorant Garamond (cuerpo) — el lockup del logo mantiene la sans
del sistema aprobada en la propuesta; cambiarla es decisión de marca, no
técnica.

## 6. Capas del SVG

`logo-{versión}-layers.svg` — 800×800, en este orden z:

1. **`logo-background`** — cielo: 30 estrellas ambient + 46 en brazos de
   galaxia espiral (mismo sentido de giro y crecimiento que el logo);
   semilla fija ⇒ idéntico en cada render.
2. **`logo-constellation`** — constelación de vértices (1 supernova central
   + 21 nodos); congeladas en pico. En night, en los tres vértices de la C
   (B, C, A) se dibuja el halo pero no el núcleo (la barra los cubre y el
   núcleo asomaba en los bordes); en light no se dibujan halos (se leían
   como manchas grises, ver §3.1) y los núcleos de B/C/A se omiten en ambas
   superficies.
3. **`logo-spiral`** — 19 tramos con rampa de color/grosor/opacidad.
4. **`logo-c-triespiral`** — la C con acabado ámbar→oro→luz: bisel
   transversal + barrido longitudinal, contorno con marco redondeado y
   terminales circulares (night: bloom cálido; light: sombra neutra). Ver
   §3.1.

El **lockup** añade `logo-typography` (viewBox 800×940). En la variante
light, además, se omite `logo-background` y los halos de la constelación
(§3.1).

### Variantes de estrellas

| Variante | Qué muestra | Uso |
|---|---|---|
| **full** (layers) | constelación de vértices en pico + cielo + galaxia | hero, og-image, prints, masters |
| **settled** | el mark completo (espiral + C + supernova + cielo) SIN las estrellas de vértices — el estado final de la animación | contextos medianos |
| **favicon** (simplificado) | la C del mark (mismo contorno, terminales y esquinas) **en oro plano**, sin bisel ni bloom, + supernova; recortados al bbox | favicon 16/32, contextos <24px |

## 7. Uso correcto

- **Fondo**: night con el ambiente aprobado (gradiente radial `#0b1120 →
  #050810` + halo teal, ver §3) o transparente. Para **superficies claras**
  usar la variante **light** (`*-light`): mismo símbolo, sin bloom y con
  sombra neutra — la versión night sobre blanco dejaba un halo verdoso
  (observación del operador, 2026-10-22). No usar el bloom night sobre
  blanco. Sobre blanco el oro del bisel tiene contraste bajo por diseño
  (marca gráfica, no texto): validar el contraste sobre el soporte final
  cuando el logo conviva con texto u otros elementos de información.
- **Tamaño mínimo**: 24 px de alto para el mark completo. Los favicons 16/32
  usan la variante **simplificada** (sólo la C + supernova) — no el mark
  completo, que en <24px se vuelve ilegible.
- **Zona de respiro**: ≥ 12% del ancho del símbolo a cada lado.
- **No reemplazar** la tipografía del lockup por otra familia sin decisión
  de marca.
- **No alterar** colores, ángulos ni proporciones — regenerar desde
  `geometry.mjs` si hace falta otra variante.

## 8. Usos incorrectos

- ❌ Rotar, estirar o reflectar el símbolo.
- ❌ Recolorear la C a mano o aplanar su bisel (el oro es la firma; el
  acabado ámbar→oro→luz se genera desde `cFinish`).
- ❌ Dibujar el símbolo a mano: **siempre regenerar** (`node
  tools/logo/generate-logo.mjs`).
- ❌ Editar los SVG/PNG generados — son OUTPUT; la fuente es `geometry.mjs`.
- ❌ Usar el full en <48px (el ruido de la constelación no se lee; usar
  settled).

## 9. ADR-lite D1 — versión canónica [RATIFICADA]

- **Contexto**: PR #53 dejó dos versiones estables (base v10, áurea v16).
  Los sub-issues #55 (pulir animación) y #56 (integración) dependen de la decisión.
- **Decisión**: **áurea v16** como logo oficial canónico.
- **Ratificación**: operador, 2026-09-25 (PR #58, sesión
  `logo-manual-svg-assets-54` — pi 01a0da49).
- **Razones de la propuesta**: ratios φ exactos y verificables por test; el
  ancla C es invariante (0.0000 px vs fórmula base); cielo sutil + galaxia más
  ricos pero discretos; arranque explosivo (stagger 110→235ms) mejor narrativa;
  7 generaciones dan más profundidad de espiral sin tocar la firma.
- **Consecuencias**: los assets `logo-aurea-*` son los oficiales;
  `logo-base-*` se conservan como referencia comparativa; #55 pule la
  animación sobre aurea7.html; #56 integra `logo-aurea-lockup` / favicons
  aurea en el sitio; #57 evalúa la CDN. El tag **v1.0.0** se crea
  **post-merge** sobre el commit de main (bump/tag = operador).
- **Si algún día se revirtiera**: regenerar con `--only-base` y re-etiquetar
  (el pipeline es paramétrico: cambiar el flag, no el código).

## 10. Inventario y regeneración

```
assets/brand/logo/
  logo-{aurea|base}-layers.svg        # master por capas (hero)
  logo-{aurea|base}-settled.svg       # estado final (favicons/print)
  logo-{aurea|base}-lockup.svg        # mark + tipografía (800×940)
  logo-{aurea|base}-*-light.svg       # masters para superficie clara
  logo-{aurea|base}-{512|1024|2048|4096}.png       # transparente
  logo-{aurea|base}-{512|1024|2048|4096}-dark.png  # fondo night
  logo-{aurea|base}-{512|1024|2048|4096}-light.png # fondo blanco
  logo-{aurea|base}-print-{a4|a3}.png             # 300dpi transparente
  logo-{aurea|base}-print-{a4|a3}-dark.png        # 300dpi night
  logo-{aurea|base}-print-{a4|a3}-light.png       # 300dpi blanco
  favicon-{aurea|base}-{16|32}.png
  apple-touch-icon-{aurea|base}.png   # 180, fondo night
  og-image-{aurea|base}.png           # 1200×630 dark + nombre
```

Regenerar todo: `node tools/logo/generate-logo.mjs`
Sólo áurea/base: `--only-aurea` / `--only-base`
Salida alternativa: `LOGO_OUT=<dir>` o `--out <dir>`
Gate de fidelidad: `node tools/logo/verify-dom-fidelity.mjs` — salida **0** limpio
· **1** el puerto difiere · **2** no se pudo medir (Chrome ausente, o artefacto
inexistente, **vacío**, ilegible, un directorio con el nombre del HTML, o un DOM
que no renderizó el SVG), y el resumen nombra la versión; una corrida parcial
(menos versiones de las esperadas) también es 2, nunca 0 — salvo que otra versión
haya medido un drift, que gana (1) y el resumen dice cuál quedó sin medir. Corre
en CI
con Chrome headless de linux; el binario se resuelve `CHROME_PATH` → macOS →
`google-chrome-stable`/`chromium` (`tools/logo/chrome.mjs`), y sin binario el
gate falla como «no se pudo medir», nunca como «diverge»; un `CHROME_PATH`
seteado e inválido falla ruidoso (`CHROME_PATH='…' no sirve`) en vez de caer al
Chrome del sistema — y si es válido gana siempre, aun con una lista de candidatos
que lo omita. Un error interno del gate se reporta como tal, no como problema de
entorno, y un estado mixto (`no se pudo medir` + `error interno`) nombra las dos
causas (`tools/logo/gate.mjs`, `tools/logo/fidelity-verdict.mjs`).
Gate de movimiento: `npm run logo:motion` (ver §11)
Módulo del sitio: `npm run brand:sync` — **obligatorio** después de tocar la
animación (CI verifica que `src/ts/brand/logoAnim.js` no tenga drift)
Tests: `npx vitest run tools/logo/` (geometría + instrumento)

**Nota sobre los print 300dpi**: el PNG está dimensionado para 300dpi
(A4 = 2480×3508 px ≙ 210×297 mm; A3 = 3508×4961 ≙ 297×420 mm) pero Chrome
no embede el metadato pHYs — al importarlo en InDesign/Illustrator setear
300 dpi manualmente.

QA visual de los exports: Chrome headless (`--headless --screenshot
--virtual-time-budget=N --window-size=WxH`), el mismo mecanismo que usó la
sesión de origen (PR #53) — reutilizado aquí para los PNG.
---

## 11. Movimiento (instrumento) — issue #67, herencia de #55/#61

El cronograma de la animación vive paramétrico en `CONFIG.timing` de
`proposals/logo-triangulo-espiral/aurea7.html`. Este apartado documenta el
**instrumento** que lo mide y el estado medido del artefacto; el pulido visual
pendiente (track B) se cerró con la decisión de marca del issue **#67**
(2026-10-25), documentada abajo.

### Hooks que publica el artefacto (no cambian el render)

| Hook | Qué publica | Para qué |
|---|---|---|
| `svg.dataset.schedule` | `delays[]` / `durs[]` — el cronograma declarado, el array del ADR-lite de #55 | perfil del arranque y ventana de trazado, **sin inferirlos** del DOM |
| `svg.dataset.c` | anclajes de la C (vértice y punta) | encuadrar la medición: desde el acabado (#64) la C es una **banda con máscara**, no un `path.seg` |
| `svg.dataset.intent` | `{ tipBloom }` — la **intención de marca** del apagado de la punta | el gate acota el crecimiento a ese tope en vez de prohibirlo: un bloom declarado es diseño, uno no declarado es destello |
| `g.clock` | un grupo vacío cuya animación dura exactamente el cronograma | el fin del cronograma, y con él la entrada del settle |
| agenda `jobs`/`tick` | — | los efectos posteriores (limpiar dash, retirar líneas de calor, entrar al settle) corren sobre el **reloj de animación**, no `setTimeout`: así la pieza se puede congelar fotograma a fotograma |

### Generación del módulo del sitio

`src/ts/brand/logoAnim.js` **se genera** desde el artefacto
(`npm run brand:sync`) y CI verifica que no haya drift
(`git diff --exit-code`). O sea: tocar `proposals/logo-triangulo-espiral/aurea7.html`
obliga a re-correr `npm run brand:sync` y commitear el módulo — los hooks de
medición (`dataset.schedule`, `dataset.c`, `g.clock`) y la agenda viajan al sitio
con el mismo render.

### Cómo se mide

`npm run logo:motion` (o `node tools/logo/verify-motion.mjs`) — carga la página en
una sesión CDP, **congela** el estado con `pause` + `currentTime` (el presupuesto de
tiempo virtual no gobierna las animaciones: medido) y mide:

- **destello** — estructural (opacidad monótona, escala dentro del bloom declarado, curva sin
  overshoot) + medido (la luz propia de la estrella no sube mientras se apaga, y el glow
  fuera del trazo no sube cuando no hay bloom declarado: con bloom declarado sube
  acotado y se reporta como métrica, no como defecto);
- **settle** — sin escalón a ±40 ms y la respiración efectivamente viva;
- **arranque** — piso objetivo (tempo monótono, pico de concurrencia ≥2, primer
  stagger ≤60% del final, extremos == `CONFIG`) + perfil reportado;
- **autochequeos** — la estrella existe antes y no después, píxel brillante en el
  settled, y la deriva del congelado (medida sobre el `currentTime` efectivo de
  cada animación: al pausar, `startTime` queda en `null` y el reloj no sirve).

Salida: **0** limpio · **1** violaciones · **2** no se pudo medir (sin Chrome, sin
hooks, o plan demasiado grueso). La política (umbrales, perfil del arranque,
invariantes, plan de muestreo y veredicto) vive en `tools/logo/motion-analysis.mjs`
y la cubre **`motion-analysis.test.mjs` (35 tests)**; el decoder y la medición de
píxeles, **`png.test.mjs` (16 tests)** — 51 del instrumento, todos en CI
(`npx vitest run tools/logo/png.test.mjs tools/logo/motion-analysis.test.mjs`).
La adquisición (CDP) necesita Chrome y sigue fuera de CI: #59 cableó sólo el
gate de fidelidad (dump-dom), no el de movimiento.

### Decisión de marca y estado medido (#67, 2026-10-25)

El operador decidió, con la medición delante, las dos preguntas que el gate había
dejado abiertas:

1. **El bloom de la punta se queda, sin el rebote.** El crecimiento
   `scale(1) → scale(1.3)` es intención de marca y el artefacto la **declara**
   (`svg.dataset.intent.tipBloom`): el gate lo acota a ese tope y sigue prohibiendo
   el overshoot (`cubic-bezier(.22,1,.36,1)`, antes `.3,1.4,.5,1`). El halo que abre
   el bloom se **reporta** como métrica —no llegaba al umbral ni antes de la
   decisión, así que el veredicto pre-PR no dependía de él— y la exención exige
   declaración **y** crecimiento medido: declarar un bloom inexistente no apaga
   el chequeo.
2. **La respiración se arregló sobre el trazo.** antes animaba `.settle-on .c-glow`
   (el grupo), que el trazado deja fijo en 1 ⇒ medido `0.0000`: nunca respiraba.
   Ahora anima `.settle-on .c-glow path`, arrancando y terminando en el reposo real
   del trazo (`0.28`, no `0.5`), así que el settle no pega escalón. El sitio espeja
   la regla en `src/templates/head_html.ts` (`brandBreathe`, mismo reposo). Ese
   reposo vive en tres copias (los dos keyframes y el `CFINISH` del artefacto) y
   `geometry.test.mjs` las ata a `C_FINISH.bloom.opacity`: cambiarlo sin tocar las
   copias pone rojo el test, no un escalón en producción.

Estado medido con `npm run logo:motion` (2026-10-25): **exit 0**.

```
punta 5351→6031ms (cubic-bezier(0.22, 1, 0.36, 1)) · luz estrella +0.000 · halo +0.67 (bloom declarado: métrica)
settle +0.0027 (máx 0.004) · respiración +0.0064 (mín 0.004)
```

Antes de la decisión el mismo gate daba **exit 1** con 6 violaciones (2 de la punta,
4 de la respiración): esa medición es la evidencia con la que se eligió.

Y el arranque medido: **pico 3 tramos trazando a la vez @940 ms · stagger
110 → 235 ms (monótono) · 5/8/10 tramos aterrizados @1,0/1,5/2,0 s**.

Rojo **por diseño**: es la evidencia de lo que el track B tiene que cerrar, no una
falla del instrumento.
