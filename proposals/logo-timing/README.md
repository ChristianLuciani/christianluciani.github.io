# Laboratorio temporal del Espirángulo

Experimento visual para decidir **dos cosas independientes** de la animación:

1. la **ley de conexión** entre nodos (intervalo, velocidad o aceleración);
2. el **tempo base** de la página (`REF 0,70 s` o `REF 0,30 s`).

Son seis páginas de la matriz (3 leyes × 2 tempos), la **séptima** (una sola
aceleración para todo el recorrido), la **octava** (canon áureo) y una portada,
con la geometría real del mark Espirángulo (21 conexiones, `CONFIG_AUREA`). El
build las publica en `/laboratorio/` y también se abren directo desde
`file://`, sin servidor. Cada una de la matriz enlaza a sus dos hermanas de ley
y a su equivalente en el otro tempo; la portada indexa las ocho.

## Abrir

Ruta publicada (activa al mergear y desplegar): <https://christianluciani.github.io/laboratorio/>. La portada
(`index.html`) permite entrar a las ocho; el mark minimizado del sitio abre esa
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

# séptima · aceleración global
open proposals/logo-timing/propuesta-07-global.html

# octava · canon áureo
open proposals/logo-timing/propuesta-08-aurea.html
```

Las seis páginas de la matriz tienen un selector `REF 0,70 s / 0,30 s` para
saltar a la misma ley en el otro tempo; la séptima es solo 0,30 s. Para congelar
un instante: `#t=<segundos>` en la URL.

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

## Propuesta 07 · Aceleración global

Una sola aceleración `a` sobre **todo** el recorrido, sin reiniciar la velocidad
en cada nodo. Se calibra para que el último tramo de la C dure `T_ref = 0,30 s`:

```
a = 2·(√S_total − √S_ref)² / T_ref² = 419,69 px/s²
t(S) = √(2·S / a)
```

- Conexiones: **3,57 s** (3,87 s con entrada).
- Por link: **0,101–0,300 s** (rango 3,0×; los links no se reinician).
- Aceleración: `419,69 px/s²`; velocidad final: `1.498,59 px/s`.
- El gráfico distancia–tiempo es **una sola parábola**, no una escalera de
  reinicios.

Es la alternativa que más se acerca a un “crecimiento continuo” y la que elegiría
hoy para la animación principal. **Ya es la animación principal del sitio**
(2026-10-27): `aurea7.html` usa esta ley y publica su cronograma; el clock de la
página repite los ticks después del settle (`src/ts/app/tempo.ts`). El criterio 3
por link sigue disponible para comparar: reparte menos (47–300 ms) y tiene 21
reinicios.

## Propuesta 08 · Canon áureo

La misma ley 07 (una `a` global sobre los 21 links) con un **envelope temporal
φ**:

```
T_ref = 300 ms
entrada = T_ref / φ = 185,41 ms
anillo = T_ref × φ = 485,41 ms
a = 419,69 px/s²
```

- Conexiones: **3,57 s** (3,76 s con entrada).
- Por link: **0,101–0,300 s**; la ley interna sigue saliendo de la geometría.
- φ ordena el marco (entrada, anillo), **no** los intervalos internos: forzar φ
  dentro de cada link lo desacopla de los nodos y rompe la lectura del tick.
- Este es el límite honesto de “tiempo áureo”: la geometría y el envelope
  pueden ser φ; la secuencia de 21 intervalos no, porque está atada a los lados.

## Anillos de choque

En todas las páginas, el anillo que nace cuando un link toca su nodo tiene:

- **radio final = largo del link entrante** (el anillo pasa por el nodo de
  origen);
- **duración fija** = `T_ref × φ = 485,41 ms`;
- por lo tanto, **velocidad de expansión = L / 485,41 ms**: los links cortos
  expanden lento y los largos rápido.

Antes el radio era constante (42 unidades); ahora el tamaño del anillo cuenta
el lado que lo produjo. El círculo se recorta contra el viewBox en los lados
más largos, pero el arco alcanza el nodo de origen.

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
- La **propuesta 07** lleva esa idea al límite: una sola curva de aceleración,
  sin reinicios, con un rango de 3,0× y 3,57 s. Es mi recomendación actual.

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

**Espirángulo** es el nombre del mark, ratificado el 2026-10-27 (espiral +
triángulo). Funciona como portmanteau, es pronunciable en español y describe la
geometría sin ser genérico.

Alternativas descartadas: *Espiral áurea* (descriptivo, pero compite con el
concepto matemático), *La C áurea* (pone el foco en la firma, no en el espiral),
*Triángulo espiral* (literal, sin carácter de marca).

Pendiente: (1) definir el alcance completo de uso (sitio, `alt`, favicon, OG,
brand kit); (2) verificar colisión de uso/marca antes de un registro. El nombre
ya está aplicado al laboratorio; el brand kit lo recibe en
[cluciani-brand-kit#3](https://github.com/ChristianLuciani/cluciani-brand-kit/issues/3).

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
| `index.html` | portada del laboratorio (octava + séptima + seis propuestas) |
| `index.css` | estilos de la portada |
| `criterio-1-intervalo.html` | ley 01, REF 0,70 s |
| `criterio-2-velocidad.html` | ley 02, REF 0,70 s |
| `criterio-3-aceleracion.html` | ley 03, REF 0,70 s |
| `criterio-1-intervalo-rapida.html` | ley 01, REF 0,30 s |
| `criterio-2-velocidad-rapida.html` | ley 02, REF 0,30 s |
| `criterio-3-aceleracion-rapida.html` | ley 03, REF 0,30 s |
| `propuesta-07-global.html` | séptima: aceleración global, REF 0,30 s |
| `propuesta-08-aurea.html` | octava: canon áureo, REF 0,30 s |
| `lab.css` | estilos compartidos |
| `lab.js` | motor de render y reloj (vanilla, sin build) |
| `geometry.data.js` | **generado**: geometría, constelación y los cronogramas de las familias (0,70 / 0,30 / áurea) |

## Regenerar los datos

```bash
node tools/logo/timing-lab.mjs   # o: npm run logo:timing
```

El generador importa `tools/logo/geometry.mjs`, calcula las familias (leyes
1–4, incluida la global) y la variante áurea, y falla si alguna referencia no da
su `T_ref`, si una cadena no es contigua o si alguna duración es ≤ 0. La página
no recalcula nada: consume el dato horneado.
