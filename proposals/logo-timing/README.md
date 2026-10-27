# Laboratorio temporal del logo

Experimento visual para decidir **el criterio de tiempo base** de las animaciones
del sitio. No toca la página: son tres archivos independientes, con la geometría
real del logo principal (21 conexiones, `CONFIG_AUREA`), para mirar el mismo
recorrido bajo tres leyes de tiempo distintas.

## Abrir

```bash
open proposals/logo-timing/criterio-1-intervalo.html
open proposals/logo-timing/criterio-2-velocidad.html
open proposals/logo-timing/criterio-3-aceleracion.html
```

Funcionan directo desde `file://` (sin servidor). Cada página enlaza a las otras
dos. Para congelar un instante y compararlo, agregá `#t=<segundos>` a la URL:

```text
…/criterio-2-velocidad.html#t=2.4
```

Controles: `espacio` pausa, `R` reinicia, `←`/`→` mueven ±0,5 s, clic o
arrastre sobre la línea de tiempo para scrubear. La velocidad de reproducción
(`1×`, `0,5×`, `0,25×`) ayuda a inspeccionar los tramos cortos del criterio 2.

## La referencia

`T_ref = 0,70 s` sobre la **última conexión**, el último tramo de la C:
`L_ref = 430,69 px` (unidades del viewBox 800×800). Ese tramo tarda exactamente
0,70 s en los tres criterios. Las conexiones se encadenan: cada una arranca
cuando la anterior llega. Antes de la primera hay `0,70 s` de constelación
(entrada), incluidos en el total de la línea de tiempo pero no en el total de
conexiones.

## Los tres criterios

| | 01 · Intervalo | 02 · Velocidad | 03 · Aceleración |
|---|---|---|---|
| Ley | `tᵢ = 0,70 s` | `v = L_ref/T_ref = 615,27 px/s` | `a = 2·L_ref/T_ref² = 1.757,92 px/s²` |
| Duración por link | `0,700 s` (todas) | `Lᵢ/v` → `0,017–0,700 s` | `√(2Lᵢ/a)` → `0,110–0,700 s` |
| Rango temporal | 1× | 40,6× | 6,4× |
| Total conexiones | **14,70 s** | **4,35 s** | **7,20 s** |
| Total con entrada | 15,40 s | 5,05 s | 7,90 s |
| Dentro del link | velocidad constante | velocidad constante | `s = ½at²` (arranca lento) |
| Qué se ve | compás regular; el trazo cambia de velocidad | trazo uniforme; los links cortos desaparecen | cada link arranca lento y llega rápido |

Los totales no son comparables en “mejor/peor”: son consecuencias de fijar la
misma referencia. El criterio 2 termina antes porque la referencia es el tramo
más largo y todos los demás se recorren a esa velocidad.

### 01 · Intervalo constante

El tiempo manda. Todos los links duran lo mismo, así que la velocidad del trazo
es `Lᵢ/0,70 s`: 15 px/s en el tramo más corto y 615 px/s en el más largo. En el
gráfico distancia–tiempo se ve como una curva quebrada con pasos temporales
iguales.

### 02 · Velocidad constante

La velocidad manda. El trazo siempre avanza a 615 px/s; los nodos cercanos se
conectan casi instantáneamente (17 ms) y los lejanos tardan hasta 700 ms. En el
gráfico, la curva es una **recta**. Es el criterio más literal si la animación
se lee como “una línea que viaja”.

### 03 · Aceleración constante

Cada link parte del reposo y acelera a 1.757,92 px/s². El tiempo crece con
`√L`, así que el rango se comprime a 6,4× y cada llegada tiene un final rápido.
En el gráfico, la curva es una sucesión de arcos con pendiente cero en cada
nodo (cada link reinicia la velocidad). Es la opción “crecimiento”, no
“recorrido”.

> Nota de alcance: el criterio 3 se implementó **por link** (reinicio en cada
> nodo), que es el análogo de los otros dos. Una aceleración global sobre todo el
> recorrido daría otra curva; no está en este experimento.

> Sobre la triada externa: sus tres links son los 19–21 (longitudes 316,8 /
> 316,2 / 430,7 px). Ahí los criterios 1 y 2 se parecen porque las distancias son
> parecidas (1,36×). El laboratorio muestra las 21 conexiones justamente porque
> la variación real del logo es 10,6–430,7 px (40,6×): es donde las leyes se
> separan y donde se decide el ritmo de la página.

## Cómo decidir

- Si querés que el ojo siga **un trazo que viaja**, el criterio 2 es el único
  coherente: la velocidad del frente es constante.
- Si querés que el logo se lea como **compás** (cada nodo, un pulso), el
  criterio 1 da intervalos iguales, pero el trazo interno se arrastra y el
  último tramo vuela: 40,6× de diferencia.
- Si querés una sensación de **crecimiento/aceleración**, el criterio 3 reparte
  mejor el tiempo (6,4×) y evita el arranque brusco, a costa de 21 reinicios.
- La animación actual del sitio (duraciones 260–640 ms + stagger 110–235 ms) es
  una cuarta regla implícita, más cerca del criterio 1 con easing que de los
  otros dos. Elegir 01 sería el cambio más pequeño; elegir 02 cambia el
  carácter de la pieza.

El gráfico y la tabla por conexión están en cada página para verificar el
razonamiento, no solo mirar el resultado.

## Archivos

| Archivo | Rol |
|---|---|
| `criterio-1-intervalo.html` | página enfocada del criterio 1 |
| `criterio-2-velocidad.html` | página enfocada del criterio 2 |
| `criterio-3-aceleracion.html` | página enfocada del criterio 3 |
| `lab.css` | estilos compartidos |
| `lab.js` | motor de render y reloj (vanilla, sin build) |
| `geometry.data.js` | **generado**: geometría, constelación y cronogramas |

## Regenerar los datos

```bash
node tools/logo/timing-lab.mjs   # o: npm run logo:timing
```

El generador importa `tools/logo/geometry.mjs`, calcula los tres cronogramas y
falla si la referencia no da 0,70 s, si la cadena no es contigua o si alguna
duración es ≤ 0. La página no recalcula nada: consume el dato horneado.
