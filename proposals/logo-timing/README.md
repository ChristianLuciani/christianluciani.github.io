# Laboratorio temporal del logo

Experimento visual para decidir **dos cosas independientes** de la animación:

1. la **ley de conexión** entre nodos (intervalo, velocidad o aceleración);
2. el **tempo base** de la página (`REF 0,70 s` o `REF 0,30 s`).

Son seis páginas independientes (3 leyes × 2 tempos) más una portada, con la
geometría real del logo principal (21 conexiones, `CONFIG_AUREA`). El build las
publica en `/laboratorio/` y también se abren directo desde `file://`, sin
servidor. Cada una enlaza a sus dos hermanas de ley y a su equivalente en el
otro tempo; la portada indexa las seis.

## Abrir

Ruta publicada (activa al mergear y desplegar): <https://christianluciani.github.io/laboratorio/>. La portada
(`index.html`) permite entrar a las seis; el mark minimizado del sitio abre esa
misma ruta.

```bash
# portada del laboratorio
open proposals/logo-timing/index.html

# familia base · REF 0,70 s
open proposals/logo-timing/criterio-1-intervalo.html
open proposals/logo-timing/criterio-2-velocidad.html
open proposals/logo-timing/criterio-3-aceleracion.html

# familia rápida · REF 0,30 s
open proposals/logo-timing/criterio-1-intervalo-rapida.html
open proposals/logo-timing/criterio-2-velocidad-rapida.html
open proposals/logo-timing/criterio-3-aceleracion-rapida.html
```

Cada página tiene un selector `REF 0,70 s / 0,30 s` para saltar a la misma ley
en el otro tempo. Para congelar un instante: `#t=<segundos>` en la URL.

Controles: `espacio` pausa, `R` reinicia, `←`/`→` mueven ±0,5 s, clic o
arrastre sobre la línea de tiempo para pausar y scrubear. La velocidad de
reproducción (`1×`, `0,5×`, `0,25×`) ayuda a inspeccionar los tramos cortos.

## La referencia

`T_ref` se mide sobre la **última conexión**, el último tramo de la C:
`L_ref = 430,69 px` (unidades del viewBox 800×800). Ese tramo tarda exactamente
`T_ref` en cada familia: **0,70 s** o **0,30 s**.

Las conexiones se encadenan: cada una arranca cuando la anterior llega. Antes de
la primera hay una entrada de constelación de `T_ref` (0,70 s / 0,30 s),
incluida en el total de la línea de tiempo pero no en el total de conexiones.
La entrada escala con la familia; no es parte del criterio.

## Familia base · REF 0,70 s

| | 01 · intervalo | 02 · velocidad | 03 · aceleración |
|---|---|---|---|
| Ley | `tᵢ = 0,70 s` | `v = 615,27 px/s` | `a = 1.757,92 px/s²` |
| Duración por link | `0,700 s` | `0,017–0,700 s` | `0,110–0,700 s` |
| Rango temporal | 1× | 40,6× | 6,4× |
| Total conexiones | **14,70 s** | **4,35 s** | **7,20 s** |
| Total con entrada | 15,40 s | 5,05 s | 7,90 s |

## Familia rápida · REF 0,30 s

| | 01 · intervalo | 02 · velocidad | 03 · aceleración |
|---|---|---|---|
| Ley | `tᵢ = 0,30 s` | `v = 1.435,63 px/s` | `a = 9.570,89 px/s²` |
| Duración por link | `0,300 s` | `0,007–0,300 s` | `0,047–0,300 s` |
| Rango temporal | 1× | 40,6× | 6,4× |
| Total conexiones | **6,30 s** | **1,86 s** | **3,08 s** |
| Total con entrada | 6,60 s | 2,16 s | 3,38 s |

Bajar la referencia a 0,30 s multiplica todos los tiempos por
`0,30/0,70 = 0,4286`, pero **no cambia las leyes ni sus rangos**: el criterio 2
sigue teniendo 40,6× entre el link más corto y el más largo, y el 3 sigue
comprimiendo a 6,4×. Elegir tempo y elegir ley son decisiones separadas.

### Qué mirar

- **01 · intervalo:** el tiempo manda. Todos los links duran lo mismo, así que
  la velocidad del trazo es `Lᵢ/T_ref`: en la familia 0,70 va de 15 a 615 px/s;
  en la 0,30, de 35 a 1.436 px/s. El gráfico distancia–tiempo es una curva
  quebrada con pasos temporales iguales.
- **02 · velocidad:** la velocidad manda. El trazo avanza siempre a la misma
  velocidad; los links cortos se unen en 17 ms (0,70) o 7 ms (0,30) y el de
  referencia se toma todo el `T_ref`. En el gráfico, una **recta**.
- **03 · aceleración:** cada link parte del reposo y acelera a la misma `a`.
  El tiempo crece con `√L`; el rango se comprime a 6,4×. En el gráfico, arcos
  con pendiente cero en cada nodo (cada link reinicia la velocidad).

> Nota de alcance: el criterio 3 se implementó **por link** (reinicio en cada
> nodo), que es el análogo de los otros dos. Una aceleración global sobre todo el
> recorrido daría otra curva; no está en este experimento.

> Sobre la triada externa: sus tres links son los 19–21 (longitudes 316,8 /
> 316,2 / 430,7 px). Ahí los criterios 1 y 2 se parecen porque las distancias son
> parecidas (1,36×). El laboratorio muestra las 21 conexiones justamente porque
> la variación real del logo es 10,6–430,7 px (40,6×): es donde las leyes se
> separan.

## Alcance visual

La geometría es la real (`CONFIG_AUREA`), pero el acabado es de laboratorio: la C
se dibuja como trazo grueso (sin la banda con bisel del logo), los nodos no se
disuelven (quedan visibles para poder leer el recorrido) y el cielo es sutil y
estático. Esto es un banco de tiempos, no una propuesta de acabado.

## Cómo decidir

Primero la **ley**:

- Si querés que el ojo siga **un trazo que viaja**, el criterio 2 es el único
  coherente: la velocidad del frente es constante.
- Si querés que el logo se lea como **compás** (cada nodo, un pulso), el
  criterio 1 da intervalos iguales, pero el trazo interno se arrastra y el
  último tramo vuela: 40,6× de diferencia.
- Si querés una sensación de **crecimiento/aceleración**, el criterio 3 reparte
  mejor el tiempo (6,4×) y evita el arranque brusco, a costa de 21 reinicios.

Después el **tempo**:

- **0,70 s** lee como una pieza contemplativa; el recorrido completo (14,70 s en
  el criterio 1) pide paciencia.
- **0,30 s** lee como una pieza enérgica; el criterio 1 completo baja a 6,30 s.
  En el criterio 2 los links internos ya son de 7 ms: a 1× son un destello; usá
  0,25× para verlos.
- La animación actual del sitio (duraciones 260–640 ms + stagger 110–235 ms) es
  una cuarta regla implícita, más cerca del criterio 1 con easing que de los
  otros dos.

Una variante híbrida razonable es **02 con un piso de duración (~120 ms)** para
que los links internos no sean imperceptibles, o **01 con un techo** para los
tramos cortos. El laboratorio muestra las leyes puras para poder decidir.

## Nombre

**Espirángulo** es el nombre de trabajo (espiral + triángulo). Funciona como
portmanteau, es pronunciable en español y describe la geometría sin ser genérico.

Alternativas si no se ratifica: *Espiral áurea* (descriptivo, pero compite con el
concepto matemático), *La C áurea* (pone el foco en la firma, no en el espiral),
*Triángulo espiral* (literal, sin carácter de marca).

Pendiente de formalizar: (1) ratificar el nombre; (2) decidir su alcance (¿solo
el laboratorio o también el sitio, el `alt` y el favicon?); (3) verificar
colisión de uso/marca antes de publicarlo como nombre oficial. Hasta entonces,
la portada lo marca como **nombre de trabajo**.

## Publicación

El build copia esta carpeta a `dist/laboratorio/` con el plugin
`copyTimingLab` de `vite.config.ts`; el mark minimizado del sitio abre
`/laboratorio/` (en desarrollo, `/proposals/logo-timing/`).

Un subdominio real (`laboratorio.christianluciani.com`) no lo puede servir
GitHub Pages por sí solo: requiere un dominio propio, un registro DNS `CNAME`
hacia el host de Pages y un sitio Pages separado con su `CNAME`. Hoy el repo no
tiene dominio propio; por eso la ruta publicada es `/laboratorio/`. Cuando
exista dominio/DNS, se cambia la constante `LAB_URL` de `src/main.ts` y el
`CNAME` del sitio del laboratorio.

## Archivos

| Archivo | Rol |
|---|---|
| `index.html` | portada del laboratorio (sugerencia + seis propuestas) |
| `index.css` | estilos de la portada |
| `criterio-1-intervalo.html` | ley 01, REF 0,70 s |
| `criterio-2-velocidad.html` | ley 02, REF 0,70 s |
| `criterio-3-aceleracion.html` | ley 03, REF 0,70 s |
| `criterio-1-intervalo-rapida.html` | ley 01, REF 0,30 s |
| `criterio-2-velocidad-rapida.html` | ley 02, REF 0,30 s |
| `criterio-3-aceleracion-rapida.html` | ley 03, REF 0,30 s |
| `lab.css` | estilos compartidos |
| `lab.js` | motor de render y reloj (vanilla, sin build) |
| `geometry.data.js` | **generado**: geometría, constelación y los 6 cronogramas |

## Regenerar los datos

```bash
node tools/logo/timing-lab.mjs   # o: npm run logo:timing
```

El generador importa `tools/logo/geometry.mjs`, calcula las dos familias y falla
si alguna referencia no da su `T_ref`, si una cadena no es contigua o si alguna
duración es ≤ 0. La página no recalcula nada: consume el dato horneado.
