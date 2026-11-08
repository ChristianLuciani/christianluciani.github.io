# Crear un tema (narrativa + piel) — instructivo para agentes

> Contrato operativo. Un tema nuevo = **un PR** que crea `src/themes/<id>/` y añade
> **una línea** al registro. Si necesitás tocar cualquier otro archivo, el contrato
> falló: pará y reportá (ADR-001, `docs/SPEC.md` §5.4–§5.6).
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
├── narrative.ts   # ThemeNarrative: rooms, copy (tipado), illusions, meta, site
├── copy.ts        # claves semánticas → { es, en } — 100% obligatorio
├── skin.css       # tokens + reglas del tema; cero literales de color fuera de tokens
└── illusions.ts   # roomId → canvas id existente en src/ts/illusions
```

`narrative.ts` declara también la dirección de publicación del tema:

```ts
site: { origin: "https://christianluciani.github.io", base: "" }   // base = prefijo de deploy
path: "ingenieria"                                                 // "" = raíz del artefacto
```

Registro (única línea permitida fuera del directorio):

```ts
// src/themes/index.ts
import { ingenieria } from "./ingenieria/narrative.ts";
export const THEMES = { museo, ingenieria } as const;
export const DEFAULT_THEME = "museo";
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
  no hay ninguna clave escrita a mano en el MAP. Ojo con dos definiciones
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

El **Buzón** (sala Contacto) declara MEMBRESÍA y ORDEN en
`BUZON_CONTACT_PLATFORMS` (`src/content/cv/platforms.ts`): las filas y el `href`
salen de `PROFILE.identity.links`, resueltos contra esa lista. Lo que se muestra
es la lista declarada ∩ SSOT, en ese orden; `website` y toda plataforma fuera de
la lista quedan omitidas por diseño. El LABEL es copy del pack
(`room.contacto.<plataforma>`, accesor estricto, sin fallback): el `label` del
SSOT no se publica en esta sala (nombra las filas de repo en El Marco).
Plataforma nueva visible ⇒ entrada en la lista + clave de copy + icono en
`assets/icons/<plataforma>.svg`; si falta el copy o el archivo, el build falla
con la clave o el archivo exacto.

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
- **Límite vigente (ADR-001 §D11, S4 pendiente):** `src/themes/skin.ts` emite la piel de
  `museo` y sólo de `museo`. Un tema no-default con `skin.css` propio **no publica esa
  piel**: `themes:check` lo falla en vez de certificar CSS que no llega al render. Hasta
  que S4/#136 haga que `emitSkin` resuelva la piel del tema activo, un tema nuevo sin
  `skin.css` hereda la del default (y el reporte lo declara).
- Prohibido `!important` para pisar otro tema: si hace falta, falta un token.

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
  bloques de tokens. Un tema sin `skin.css` propio hereda la piel del default
  (el reporte lo declara).
- **contraste**: todo `color: var(--x)` y toda combinación texto/tinte tiene par
  declarado en `contrast.ts` y pasa AA; las deudas (`AA_DEBT`) se auto-eliminan
  cuando el par empieza a cumplir.
- **golden**: existe `tests/golden/<id>.html`; sin snapshot no hay comparación
  byte a byte y el gate falla duro (`npm run golden:update` lo genera).

## 9. Checklist de aceptación (el PR no se abre sin esto)

- [ ] `src/themes/<id>/` completo; **0** cambios fuera de ahí salvo la línea de registro.
- [ ] Copy 100% ES+EN; 0 claves huérfanas; 0 strings visibles en templates.
- [ ] `curation` declara include/exclude; toda exclusión con `reason`; el
      reporte cubre el 100% de los hechos (`npm run curation:report` verde) y
      `curation.experienceSections` cubre las filas de `experience[]` del print-CV.
- [ ] `skin.css` sin literales de color; contraste AA verificado.
- [ ] Ilusiones: sólo ids existentes; ninguna modificación en `src/ts/illusions/**`.
- [ ] `npm run build:all` verde; golden del tema `museo` **intacto** y el tema
      nuevo con su `tests/golden/<id>.html` (`npm run golden:update`).
- [ ] `npm run themes:check` **y** `npm run themes:assets` verdes.
- [ ] `meta` y `site` propios: title, description, ogImage; canonical por subpath.
- [ ] Body del PR: qué narrativa, para qué audiencia, qué se excluye y por qué.

## 10. Anti-patterns (rechazo directo en review)

- Copiar hechos al tema "porque es más rápido".
- Escribir HTML de layout con copy adentro (el copy va al pack).
- Un `if (theme === "…")` en un template o en `main.ts`.
- Duplicar el CSS del default y cambiar dos colores: se extiende por tokens, no por copia.
- Ocultar contenido sin `reason`, o borrar un ítem del SSOT para que "no aparezca".
- Introducir una dependencia de runtime para el tema (fuentes web, iconos remotos).
