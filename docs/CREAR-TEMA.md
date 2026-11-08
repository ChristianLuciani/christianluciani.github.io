# Crear un tema (narrativa + piel) — instructivo para agentes

> Contrato operativo. Un tema nuevo = **un PR** que crea `src/themes/<id>/`, declara su
> curación y suma **una línea** en cada registro (`THEMES` y `CURATIONS`). Si necesitás
> tocar el renderer, el SSOT o el tema de otro, el contrato falló: pará y reportá
> (ADR-001, `docs/SPEC.md` §5.4–§5.6).
>
> **Alcance:** `Cubre: crear o modificar un tema del sitio · No cubre: hechos del perfil (profile-data), ilusiones (src/ts/illusions), deploy · as_of: 2026-11-07`

## 1. Definiciones

| Capa | Vive en | Un tema puede |
|---|---|---|
| **Hechos** | `src/data/profile.generated.ts` | sólo **leerlos** (por tipo); nunca mutarlos ni copiarlos |
| **Curación** | `src/content/curation/<id>.ts` | decidir qué se presenta, orden y exclusiones **con razón** |
| **Narrativa** | `src/themes/<id>/narrative.ts` + `copy.ts` | elegir salas, orden, metáforas, labels, ilusiones, metadata |
| **Piel** | `src/themes/<id>/skin.css` | tokens, tipografía, densidad, radios, sombras |

**Regla de oro:** un hecho se edita una vez en el SSOT; un copy una vez en el pack del
tema. Si un valor debe cambiar en dos archivos para seguir coherente, es un bug.

## 2. Estructura obligatoria

```
src/themes/<id>/
├── narrative.ts   # ThemeNarrative: rooms, groups (opcional), copy (tipado), illusions, meta, site
├── copy.ts        # claves semánticas → { es, en } — 100% obligatorio
├── skin.css       # tokens + reglas del tema; cero literales de color fuera de tokens
└── illusions.ts   # roomId → canvas id existente en src/ts/illusions
```

Excepción declarada: una **variante de piel** (§6) no repite `copy.ts` ni `illusions.ts`
—reusa los del tema base por referencia— y su `narrative.ts` sólo declara `id`, `path` y
`variantOf`.

`narrative.ts` declara también la dirección de publicación del tema:

```ts
site: { origin: "https://christianluciani.github.io", base: "" }   // base = prefijo de deploy
path: "ingenieria"                                                 // "" = raíz del artefacto
```

Registro (las dos únicas líneas permitidas fuera de los directorios del tema y de su
curación; la piel NO se registra: se resuelve por convención de directorio):

```ts
// src/themes/index.ts
import { ingenieria } from "./ingenieria/narrative.ts";
export const THEMES = { museo, ingenieria } as const;
export const DEFAULT_THEME = "museo";

// src/content/curation/index.ts
import { INGENIERIA_CURATION } from "./ingenieria.ts";
export const CURATIONS = { museo: MUSEO_CURATION, ingenieria: INGENIERIA_CURATION };
```

Cada `narrative.ts` declara `id`, `path` y `site { origin, base }` (obligatorios en el
manifest, SPEC §5.4): `path` define el subpath de su PÁGINA (`""` = raíz; `"ingenieria"`
→ `/ingenieria/`) y `site` la dirección de publicación (el build la puede overridear con
`SITE_ORIGIN`/`SITE_BASE`). Prohibido hardcodear el id en templates, CSS o JS: todo sale
de `THEMES`/`SITE_THEME`. El render fuente (`index.html` commiteado) es siempre el del
tema default; el selector decide qué páginas se publican en `dist/`.

## 3. Claves semánticas (no strings exactos)

```
hero.tagline
cover.title | cover.hint
room.<roomId>.title | .subtitle | .function
room.<roomId>.<item>.<campo>
nav.<roomId>.label
meta.title | meta.description
```

- Toda clave existe **ES y EN**. Falta una → el build falla (no hay fallback silencioso).
- El mismo `roomId` puede tener copy distinto por tema sin tocar templates.
- Prohibido keyear por texto visible: rompe en cuanto cambia una coma.

### 3.1 Dónde vive el copy hoy (#127)

```
src/themes/<id>/copy.ts     pack: clave semántica → { es, en, runtime? }
src/content/copy.ts         t()/th()/ta()/te() → pack del tema vigente
src/templates/**            piden claves; 0 copy literal > 2 palabras
```

- `t("clave")` interpola el ES con markup (títulos con `<em>`, `<br>`).
  `th()` escapa `& < >` para texto plano; `ta()` escapa además `"` y `'` para
  **valores de atributo** (`aria-label`, `alt`, `title`, `data-caption`);
  `te()` devuelve el EN como texto y `tae()` el EN escapado para atributos
  (`data-aria-en`). Un atributo se pide SIEMPRE con `ta()`/`tae()`, nunca `t()`.
- Clave inexistente = **error de build**: no hay fallback silencioso.
- `runtime: true` marca copy que el HTML inicial no contiene (frases del intro
  que monta `intro.ts`, labels del canvas del grafo, estados como el feed vacío).
  El gate de claves huérfanas lo respeta; sin esa marca, una clave sin uso
  rompe el test.
- El gate `src/templates/no-literal-copy.test.ts` falla si un template emite
  **> 2 palabras** de copy literal (linter: `tools/copy/lint.ts`), en dos
  superficies: **nodos de texto** y la lista cerrada de **atributos de copy**
  (`aria-label`, `alt`, `title`, `placeholder`, `data-caption`, `data-aria-es`,
  `data-aria-en`, y `content` cuando el tag es `<meta>`). Un aria-label literal
  también es copy: lo lee un lector de pantalla y el toggle no lo traduce. El
  umbral es el mismo en ambas superficies (> 2 palabras); los tokens de pura
  puntuación no cuentan. Si falla, mové la frase al pack y pedila con
  `t()`/`th()`/`ta()`.
- El diccionario i18n (`src/cv/i18n.ts`) se **deriva** del pack + `SALAS` + SSOT:
  no hay ninguna clave escrita a mano en el MAP. Se arma en `initI18n` (no al importar)
  con el pack del tema que la página declara en `<html data-theme>`; el runtime lo
  instala antes de i18n/intro/render (`src/ts/app/theme.ts`). Ojo con dos definiciones
  distintas, que el gate separa a propósito:
  - **Pack → HTML** (lo que mide `no-literal-copy.test.ts`): toda clave no
    `runtime` aparece en el render, como texto o como atributo. Es el gate que
    atrapa una clave muerta real del pack.
  - **MAP → nodo del walker** (lo que NO mide): el walker recorre nodos de
    texto, así que hay pares derivados que nunca consulta y **no son deuda**:
    los `print.*` (el walker salta `#print-cv`) y los sólo-atributo
    (aria/alt/meta/caption, que viajan en atributos, no en nodos), más los
    pares derivados de una rama del SSOT/curación que los datos de hoy no
    renderizan (p. ej. un `statusLabel` sin proyecto en ese estado). Que existan
    no significa que estén mal: no se mantienen a mano ni pueden quedar stale
    respecto de una fuente que ya no existe.
  `src/themes/copy-dictionary.test.ts` fija esta clasificación: un par que no
  aparece en el render falla salvo que sea `runtime` o derivado del SSOT, y los
  pares de `SALAS` no tienen excepción.
- El copy del print-CV usa las claves `print.*` del pack; `content/cv/print.ts`
  declara sólo la **estructura** de esa superficie (qué links entran al encabezado),
  sin texto. La **clasificación de Trayectoria** (`experience[]` →
  `professional`/`training`) es curación del tema: vive en
  `Curation.experienceSections` (§5.5), no en el renderer.

## 4. Curación: mostrar sin borrar

```ts
// src/content/curation/ingenieria.ts
export const CURATION: Curation = {
  // ids namespaced `colección:clave` (ver content/curation/keys.ts; la clave es derivada, no un id de fila)
  include: ["proyectos:Kontablo", "proyectos:ZENTROPY", "proyectos:CLAPPS.AI"],
  exclude: [
    { id: "proyectos:Drahma", reason: "storytelling de aula; fuera del marco de ingeniería" }
  ],
  // `order` es por colección y usa claves SIN prefijo
  order: { proyectos: ["Kontablo", "ZENTROPY", "CLAPPS.AI"] }
};
```

- `exclude` **nunca** borra: el hecho sigue en el SSOT y en los demás temas.
- Toda exclusión exige `reason` redactada para el operador, no "n/a".
- El universo incluye las 8 colecciones del perfil (proyectos, publicaciones,
  experiencia, formación, competencias, idiomas, credenciales, artefactos) y las
  salas: un hecho que el tema no muestra también se decide, con `exclude` y su
  razón. `include`/`exclude` deben cubrir el 100%.
- `curatedOrder(curation, colección, hechos, keyOf)` es el consumidor canónico:
  filtra lo excluido y ordena por `order`. No lo reimplementes a mano.
- `experienceSections` del contrato es la clasificación de `experience[]` que
  imprime el print-CV (clave de fila → `professional`/`training`); el print
  compartido la pide al tema activo, no al módulo de un tema.
- `npm run curation:report` (o `tsx tools/curation.ts --report`) sale 1 con un
  hecho sin decisión, un id inexistente o un `exclude` sin razón (gate I3).

### Reordenar, ocultar y agrupar salas (S9 · #135)

El layout de la visita se declara en DOS lugares y no se reimplementa:

```ts
// src/content/curation/<id>.ts — el ORDEN y la VISIBILIDAD de las salas
const SALAS_VISIBLES = ["proyectos", "experiencia", "bastidor", "fisica", "grafo", "perfil", "contacto"];
export const CURATION: Curation = {
  // ...
  exclude: [{ id: "salas:competencias", reason: "…" }],  // ocultar: la sala queda en el DOM, invisible
  order: { salas: SALAS_VISIBLES }                        // ordenar: único lever del orden
};

// src/themes/<id>/narrative.ts — la VOZ y las UNIDADES de navegación
rooms: roomsFromCuration(CURATION, VOICE),               // deriva visibilidad + orden + conteos
groups: [{ id: "ciencia", label: "Ciencia", labelEn: "Science", rooms: ["fisica", "grafo"] }]
```

- **Ordenar:** `order.salas` (claves sin prefijo, sólo salas visibles). No toques
  `rooms` a mano ni reordenes `SALAS`: `roomsFromCuration()` aplica el orden y
  `themes:check` falla si `rooms` y `order.salas` discrepan.
- **Ocultar:** `salas:<id>` en `exclude`, con `reason`. Vale para CUALQUIER sala (no
  sólo la galería): la sala sigue en el DOM con `room--hidden`, no se numera ni
  entra al HUD/plano. Ocultar no borra el hecho.
- **Agrupar:** `groups` con ≥2 salas VISIBLES y CONTIGUAS. La unidad comparte
  número, entrada del HUD y celda del plano (`navUnits()`); cada sala conserva su
  `<section>` y su cuerpo. No inventes una sala ni fusiones contenido.
- **Contar:** si el subtítulo de la sala cuenta fichas (`proyectos`, `bastidor`),
  se re-deriva de TU curación (`subtitulosCurados()`): no escribas el número.
- **Excluir contenido:** `exclude` con `reason` es vinculante en el DOM (El Marco y
  El Bastidor filtran con `activeCuration()`): la tarjeta desaparece y el conteo
  del subtítulo cambia con ella. Si el ítem vive en un renderer todavía hardcodeado
  (#99), excluirlo sería una decisión sin efecto: no lo hagas.

## 5. Hechos: referencia, jamás copia

```ts
// correcto — un solo consumidor: excluye y ORDENA con la curación del tema.
// `keyOf` deriva la clave estable del hecho (content/curation/keys.ts).
const proyectos = curatedOrder(
  curation,
  "proyectos",
  PROFILE.projects,
  (project) => projectKey(project.name)
);
// o, ya resuelto para el sitio: proyectosDe() / publicacionesDe()

// prohibido — filtrar a mano sin `order` publica en el orden del SSOT
const proyectos = PROFILE.projects.filter(
  (project) => !curation.exclude.some((e) => e.id === `proyectos:${projectKey(project.name)}`)
);
// prohibido — copiar hechos
const proyectos = [{ name: "Kontablo", status: "Publicado", … }];
```

Si el tema necesita un hecho que no existe en `CvProfile`: **STOP**. Se reporta como
hallazgo; no se inventa ni se escribe a mano (ADR-025: el issue lo decide el operador).

## 6. Ilusiones y piel

- Elegí canvas existentes de `src/ts/illusions/` por sala; **no** se editan.
- La piel sólo declara tokens y reglas: `--bg-0/1`, `--ink*`, `--line*`, `--teal/--gold/…`,
  `--radius`, `--container`, tipografía. Cero `#hex`/`rgba()` fuera del bloque de tokens.
  La emite `src/themes/skin.ts` (`emitSkin`): los tokens del bloque marcado
  `@derived:begin … @derived:end` se resuelven a su literal mientras dure el
  congelamiento de I1 (#130). Publicarlos es un cambio de render declarado.
- Todo par texto/fondo declara contraste y **pasa AA** (4,5:1 normal, 3:1 grande);
  el umbral no es autodeclarable: `contrast.ts` sólo admite 3 o 4,5.
- **Piel por tema (S4 de ADR-001 §D11, resuelto en #134):** `emitSkin` resuelve
  `src/themes/<id>/skin.css` del tema ACTIVO (el que `assembleHtml({ theme })` instala
  durante el render). Un tema con `skin.css` propio **publica esa piel**. Un tema que
  quiera heredar la del default lo declara **explícitamente** (`skin: "inherit"` en el
  manifest); sin esa declaración, un tema registrado sin `skin.css` es un error (borrar
  el archivo no se lee como herencia — F4 del pase fresco de #159). `themes:check` no
  confía en el emisor: extrae el `<style>` del render de cada tema y lo compara con el
  CSS de su fuente; si la piel no llega al documento, el gate falla (F4/#158).
- Prohibido `!important` para pisar otro tema: si hace falta, falta un token.

### Segunda piel: variante sobre la misma narrativa (S10 · #136)

Una **variante de piel** es un tema registrado que reusa la narrativa de otro en vez de
declararla; existe para probar —y mantener— que piel y narrativa son ejes independientes
(ADR-001 §3). Estructura mínima, sin `copy.ts` ni `illusions.ts`:

```
src/themes/<base>-<piel>/
├── narrative.ts   # { ...base, id, path, variantOf: "<base>" } — reuso por REFERENCIA
├── skin.css       # único contenido nuevo: paleta y/o densidad
└── contrast.ts    # pares de texto/fondo de esta piel
```

- `narrative.ts` **reusa por referencia** (`...base`): `copy`, `rooms`, `illusions`,
  `meta` y `site` son EL MISMO objeto del tema base. Sólo `id`, `path` y `variantOf` son
  propios: publica en su subpath, con su `data-theme` y su golden, y editar el copy del
  base se refleja acá sin tocar nada.
- `CURATIONS["<id>"]` es la MISMA entrada que la del base: no se clona la curación.
- `contrast.ts` puede reusar los pares del base cuando las reglas de CSS son las mismas
  (los ratios se recalculan contra los tokens de esta piel); una combinación nueva se
  agrega al contrato del base.
- `themes:check` verifica el linaje POR IDENTIDAD: `copy`, `rooms`, `illusions`, `meta`,
  `site` y la curación tienen que ser el mismo objeto (`no reusa … por referencia`). Una
  copia con el mismo texto es un error, porque divergiría en silencio al editar el base. La
  regla mira el LINAJE DECLARADO (`variantOf`): dos temas sin `variantOf` no se comparan.
  La variante tampoco puede declarar `skin: "inherit"`: existe para CAMBIAR la piel.
- **SEO — limitación declarada (F1/F4 de #164):** al heredar `meta`, la variante publica el
  mismo `title`/`description` y los mismos bloques JSON-LD que su base, cada página con
  `canonical` autorreferente; el deploy construye sin `SITE_THEME`, así que la URL de la
  variante entra al sitemap con contenido textual idéntico y piel distinta. Es un duplicado
  aceptado mientras la variante sea instrumental; el PR que la agrega lo declara, y la
  salida es retirarla, darle identidad textual propia (deja de ser `variantOf`) o excluirla
  del deploy.
- **Piel clara bloqueada (deuda hasta tokenizar canvas/grafo):** la paleta de
  `src/ts/illusions/*` y `src/ts/graph/grafo.ts:179-182,229` está hardcodeada para fondo
  oscuro (labels `#ffffff`/`#d6dde8`: 1,00:1 y 1,37:1 sobre papel blanco) y ningún gate
  mide canvas. Una variante clara hoy publicaría canvas/grafo ilegibles. Salida: tokenizar
  esos colores desde la piel + gate de contraste de canvas; hasta entonces, la segunda piel
  es oscura.

## 7. Metadata y SEO del tema

El **documento** (`assembleHtml`) es independiente de la dirección: `narrative.meta`
provee `title`, `description`, `ogImage` y el render los emite (byte a byte iguales a
las claves del pack, que es la fuente única). Su golden no cambia por publicar.

La **dirección** es del tema y se declara en `narrative.site`, con overrides de deploy
validados en `src/themes/site.ts`:

| Dato | Valor | Efecto |
|---|---|---|
| `narrative.site.origin` / `SITE_ORIGIN` | `https://christianluciani.github.io` (default) | origen de `canonical`/`og:url`/`og:image`/`sitemap`; **no admite path** |
| `narrative.site.base` / `SITE_BASE` | `""` (default) o `/prefijo` | prefijo con el que se sirve el artefacto; entra en assets, canónica y sitemap |
| `narrative.path` | `""` o `ingenieria` | dónde vive la PÁGINA (`dist/<path>/index.html`) |

Al publicar (`src/artifact/pages.ts`) el documento recibe su `canonical`, `og:url` y
`og:image` con esa dirección, y las rutas de assets pasan a **raíz-absolutas** con el
prefijo: el bundle y `public/` se publican **una sola vez** en la raíz del artefacto
(`/assets/**`, `/audio/**`), así resuelven desde cualquier subpath sin duplicar assets.
Un tema con otro `base` no comparte artefacto: se publica solo con `SITE_THEME=<id>`
(`artifactBase()` falla si dos temas del mismo build declaran prefijos distintos).

Un tema nuevo no hardcodea rutas: si necesita un asset, lo pide con `assetAttrs` (CDN +
fallback) o con una ruta raíz-absoluta (`/assets/…`), nunca relativa al documento
(`assets/…` rompe en un subpath). Los recursos que pide el RUNTIME por URL (audio,
laboratorio) se componen con `runtimeAsset()` (`src/ts/app/runtime-assets.ts`), que
aplica `import.meta.env.BASE_URL`.

`npm run build` publica `sitemap.xml` con la raíz y todos los subpaths; `robots.txt` lo
genera el SSOT (`sync:ai-policy`) y se sirve en la raíz del dominio (permite todos los
subpaths con `Allow: /`).

## 8. Procedimiento (orden fijo)

1. Reservá el id: `[a-z0-9-]`, único en `THEMES`, sin colisionar con rutas existentes.
2. Copiá la estructura de `src/themes/museo/` como andamiaje (no como contenido).
3. Escribí `copy.ts` completo (ES+EN) antes de tocar `narrative.ts`.
4. Declará la curación del tema (include/exclude/orden y razones) y registrala en
   `CURATIONS`, el registro que hoy trae `museo`.
5. Asigná ilusiones; si ninguna encaja, dejá `undefined` y reportalo (no inventes canvas).
6. Escribí `skin.css` con tokens primero; recién después reglas.
7. Registrá el tema en `src/themes/index.ts` (una línea).
8. Corré los gates y pegá la salida en el body del PR.

```bash
npm run curation:report           # I3: 100% de hechos con decisión
npm run build                     # render fuente (default) + bundle + dist/<path>/index.html de cada tema + sitemap
npm run build:all                 # construye TODOS los temas registrados (el artefacto los publica todos)
npm test                          # unidades + golden POR TEMA (tests/golden/<id>.html)
npm run themes:check              # copy ES/EN, curación, literales de color y contraste AA, por tema
npm run themes:assets             # smoke: assets del HTML + recursos del runtime + sitemap/robots (sobre el build completo)
npm run build:html                # sólo el render fuente (commit del index.html)
SITE_THEME=<id> npm run build     # publica SÓLO la página de ese tema; va al final porque vacía `dist/`
```

`themes:check` (#133) es el gate que corre en CI sobre **cada tema registrado**:

- **copy**: toda clave tiene ES y EN no vacíos y el render del tema publica toda
  clave no `runtime` (una huérfana falla; `runtime: true` declara el copy que
  monta el JS).
- **curación**: el tema tiene entrada en `CURATIONS`, cubre el 100% de los
  hechos con `reason` en cada exclusión y `experienceSections` clasifica todas
  las filas de `experience[]` del print-CV.
- **piel**: `src/themes/<id>/skin.css` no tiene literales de color fuera de sus
  bloques de tokens. Un tema sin `skin.css` propio hereda la piel del default sólo
  si lo declara (`skin: "inherit"`); sin esa declaración, el gate falla. La piel que
  el emisor resuelve para el tema tiene que
  ser la que aparece en el `<style>` de su render: el gate compara ambos y falla
  si el documento publica otra (F4 de #158).
- **contraste**: todo `color: var(--x)` y toda combinación texto/tinte tiene par
  declarado en `contrast.ts` y pasa AA; las deudas (`AA_DEBT`) se auto-eliminan
  cuando el par empieza a cumplir.
- **golden**: existe `tests/golden/<id>.html`; sin snapshot no hay comparación
  byte a byte y el gate falla duro (`npm run golden:update` lo genera).

## 9. Checklist de aceptación (el PR no se abre sin esto)

- [ ] `src/themes/<id>/` completo; fuera de ahí sólo las líneas de registro
      (`src/themes/index.ts` y `src/content/curation/index.ts`) y su curación.
- [ ] Copy 100% ES+EN; 0 claves huérfanas; 0 strings visibles en templates.
- [ ] `curation` declara include/exclude; toda exclusión con `reason`; el
      reporte cubre el 100% de los hechos (`npm run curation:report` verde) y
      `curation.experienceSections` cubre las filas de `experience[]` del print-CV.
- [ ] `skin.css` sin literales de color; contraste AA verificado; la piel del
      tema llega al `<style>` de su render (`themes:check`). Si el tema hereda la
      piel del default, lo declara con `skin: "inherit"`.
- [ ] Ilusiones: sólo ids existentes; ninguna modificación en `src/ts/illusions/**`.
- [ ] `npm run build:all` verde; golden del tema `museo` **intacto** y el tema
      nuevo con su `tests/golden/<id>.html` (`npm run golden:update`).
- [ ] Si reordena/oculta/agrupa salas: `order.salas` == orden visible de `rooms` y
      `groups` válidos (visibles, ≥2, contiguos); `npm run themes:check` lo exige.
- [ ] `npm run themes:check` **y** `npm run themes:assets` verdes.
- [ ] `meta` y `site` propios: title, description, ogImage; canonical por subpath.
      Una **variante de piel** (S10) es la excepción declarada: `meta`, `site`, `copy`,
      `rooms`, `illusions` y la curación se reusan POR REFERENCIA del base; sólo `id`,
      `path` y `skin.css` son propios, y `themes:check` lo verifica (`variantOf`).
- [ ] La página publicada declara su tema (`<html data-theme>`), el runtime usa
      salas/copy/i18n/intro del tema y el golden lo fija (`themes:assets`).
- [ ] Body del PR: qué narrativa, para qué audiencia, qué se excluye y por qué.

## 10. Anti-patterns (rechazo directo en review)

- Copiar hechos al tema "porque es más rápido".
- Escribir HTML de layout con copy adentro (el copy va al pack).
- Un `if (theme === "…")` en un template o en `main.ts`.
- Duplicar el CSS del default y cambiar dos colores: se extiende por tokens, no por copia.
- Ocultar contenido sin `reason`, o borrar un ítem del SSOT para que "no aparezca".
- Introducir una dependencia de runtime para el tema (fuentes web, iconos remotos).
