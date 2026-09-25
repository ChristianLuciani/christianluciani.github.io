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

Espiral de conocimiento acumulativo: un triángulo isósceles que gira y
decrece hacia el centro en generaciones, con nodos-estrella en cada vértice,
una **supernova** permanente en el origen y la **"C" de Christian** como
cierre en plena intensidad (triángulo abierto = evolución en curso).

- **Espiral**: opacidad y grosor crecientes hacia afuera — el conocimiento
  se acumula.
- **Constelación**: estrellas que preexisten y se disuelven al ser tocadas
  por la línea (en la animación); la supernova central permanece: es el
  origen.
- **La C**: las dos últimas líneas del espiral, en oro, grosor máximo — la
  firma.

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
| Oro (firma) | `#c9a84c` | la C y la tipografía (=`--gold`) |
| Azul profundo | `#16324f` | nacimiento del espiral |
| Night | `#050810` | fondo oscuro (=`--night`) |
| Espectro estelar | `#ff8a70` `#ff6f5e` `#ffb49e` `#f6d7c4` `#cfe0ff` | estrellas: rojizos dominantes + blancos cálidos + un azulado |
| Supernova | `#ffb3a0` | núcleo central permanente |

La rampa del espiral interpola `#16324f → #00c9c0` (22 → 0 R, 50 → 201 G,
79 → 192 B) con opacidad `0.10 → 0.72` y grosor `2.2 → 4.2`.

## 4. Construcción geométrica

Todos los valores viven en `CONFIG` (`tools/logo/geometry.mjs`):

| Parámetro | Valor | Nota |
|---|---|---|
| `center` | (400, 418) | centro del espiral en el lienzo 800×800 |
| `R` | 250 | radio de la punta de la C |
| `baseAngles` | A −90°, B 40°, C 140° | isósceles de ápice ~50°; A arriba |
| `scalePerLoop` | 1.5 | crecimiento radial por vuelta (ancla) |
| `rotPerLoop` | 3° | giro horario por vuelta (ancla) |
| `globalRot` | 1° | rotación global del símbolo |
| `generations` | 7 (áurea) / 5 (base) | vueltas del espiral |
| `phi` | 1.618 | ratio áureo entre triángulos internos |
| `twistGolden` | 3°×φ ≈ 4.854° | giro entre internos (áurea) |
| `extendLast` | 0.01 | la punta se estira 1%: insinúa seguir evolucionando |
| `cWidth` | 10 | grosor de la C (glow = +6, blur 8, op .5) |

La C se dibuja como **un solo path** (`B→C→punta`) con `stroke-linejoin:
round`: el vértice en C es un join redondeado real, no dos caps montados.

**Verificación** (tests automáticos, `npx vitest run tools/logo/`):
ancla C ≡ fórmula base a 7 generaciones (0.0000 px), ratios internos = φ
exacto por generación, twist = 3°×φ, determinismo, y fidelidad DOM
(`node tools/logo/verify-dom-fidelity.mjs`).

## 5. Tipografía

| Elemento | Fuente | Tamaño (lienzo 800) | Tracking | Color |
|---|---|---|---|---|
| Nombre (lockup) | `ui-sans-serif, system-ui…` (idém proposal) | 21px | 0.42em = 8.82px | oro `#c9a84c` |
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
2. **`logo-constellation`** — 22 estrellas de vértices (1 supernova central
   + 21 nodos); congeladas en pico (fotograma de máxima intensidad).
3. **`logo-spiral`** — 19 tramos con rampa de color/grosor/opacidad.
4. **`logo-c-triespiral`** — la C en oro: glow difuminado + trazo firme.

El **lockup** añade `logo-typography` (viewBox 800×940).

### Variantes de estrellas

| Variante | Qué muestra | Uso |
|---|---|---|
| **full** (layers) | constelación de vértices en pico + cielo + galaxia | hero, og-image, prints, masters |
| **settled** | estado final de la animación: sólo supernova + cielo | favicons, apple-touch, contextos pequeños |

## 7. Uso correcto

- **Fondo**: night `#050810` o transparente sobre superficies oscuras ≥
  `#050810`. Sobre fondos claros NO está diseñado (la rampa azul/teal y el
  oro se lavan): si es imprescindible, usar la variante print con la C y el
  espiral intactos y validar contraste.
- **Tamaño mínimo**: 24 px de alto (favicon 16 usa la variante settled).
- **Zona de respiro**: ≥ 12% del ancho del símbolo a cada lado.
- **No reemplazar** la tipografía del lockup por otra familia sin decisión
  de marca.
- **No alterar** colores, ángulos ni proporciones — regenerar desde
  `geometry.mjs` si hace falta otra variante.

## 8. Usos incorrectos

- ❌ Rotar, estirar o reflectar el símbolo.
- ❌ Recolorear la C (el oro es la firma) o aplanar el glow.
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
  logo-{aurea|base}-{512|1024|2048|4096}.png       # transparente
  logo-{aurea|base}-{512|1024|2048|4096}-dark.png  # fondo night
  logo-{aurea|base}-print-{a4|a3}.png             # 300dpi transparente
  logo-{aurea|base}-print-{a4|a3}-dark.png        # 300dpi night
  favicon-{aurea|base}-{16|32}.png
  apple-touch-icon-{aurea|base}.png   # 180, fondo night
  og-image-{aurea|base}.png           # 1200×630 dark + nombre
```

Regenerar todo: `node tools/logo/generate-logo.mjs`
Sólo áurea/base: `--only-aurea` / `--only-base`
Salida alternativa: `LOGO_OUT=<dir>` o `--out <dir>`
Gate de fidelidad: `node tools/logo/verify-dom-fidelity.mjs`
Tests: `npx vitest run tools/logo/geometry.test.mjs`

QA visual de los exports: Chrome headless (`--headless --screenshot
--virtual-time-budget=N --window-size=WxH`), el mismo mecanismo que usó la
sesión de origen (PR #53) — reutilizado aquí para los PNG.