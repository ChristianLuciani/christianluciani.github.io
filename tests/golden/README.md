# Golden del render

Copia congelada del HTML del tema default (`museo`), cortada por secciones. Es el
instrumento del invariante **I1**: durante la FASE 5 (`docs/SPEC.md` §8, ADR-001) el
render del sitio no puede cambiar, y esto lo verifica mecánicamente.

## Por qué no alcanza `build.test.ts`

`build.test.ts` compara `index.html` con `assembleHtml()`: si un refactor cambia ambos
lados, el test sigue verde. El golden es una copia **externa** al build, así que detecta
exactamente eso.

## Cuándo regenerarlo

**Sólo** en un PR que cambia el render **a propósito**, y se declara con un **trailer de
commit** (no en el body: el body es markdown y cualquier parser de prosa es burlable):

```
Golden-Cambio: render    # rediseño, copy, estructura
Golden-Cambio: datos     # sync:profile movió el pin/fecha del print-CV
```

El render depende de los hechos: `sync:profile` mueve el footer de procedencia del print-CV
y por eso el golden cambia sin que nadie haya tocado la presentación. Ese caso se declara
`Golden-Cambio: datos`, y la guarda exige además que `src/data/profile.generated.ts` haya
cambiado: sin eso, "datos" sería la declaración más barata para mover el golden por
presentación. Inventar un refactor para justificarlo sería mentirle al gate.

El trailer va en cualquier commit del PR; si hay varios, `render` gana.

En cualquier otro PR —refactor, extracción de copy, tokens, i18n, selector de tema— el
golden **no se toca**: si el test falla, el refactor cambió el render y hay que corregir
el refactor, no el golden.

## Cómo

```bash
npm run golden:update   # reescribe tests/golden/museo.html desde assembleHtml()
npm run build           # reescribe index.html (build.test.ts exige que coincida)
npm test                # verde antes de commitear
```

`index.html` también es un artefacto generado: si el render cambió y no lo regenerás,
`build.test.ts` falla y el golden queda verde en falso respecto del sitio publicado.

Requiere el entorno **sin CDN** (`VITE_ASSET_BASE_URL` y `VITE_BRAND_KIT_BASE_URL`
vacías): las rutas de assets se resuelven al importar los templates y el golden se congela
con Pages como origen, igual que CI.

## Enforcement en CI

`ci.yml` verifica que el golden no se mueva sin declararlo: si `tests/golden/museo.html`
cambia respecto de la base y ningún commit del PR trae `Golden-Cambio: render|datos`, el
job falla con `::error::`. También falla si el comparador (`golden.test.ts`) desaparece:
sin test, el baseline no es un gate. Así, un PR que cambia el render **y** regenera el golden no puede
pasar verde en silencio — que es la única forma de que el invariante sea real.

El PR que introdujo el baseline queda exento (no hay contra qué comparar); la guarda rige
desde el merge siguiente. La exención exige que la base **no tenga ningún** archivo en
`tests/golden/`: renombrar o mover el baseline no la vuelve a ganar.

## Cómo lee el fallo

El test compara el documento completo y después **por sección**; el error nombra la sección
y la línea:

```
sección "sala-fisica" cambió en la línea 42
  esperado: <div class="entry-period">2019 – 2024</div>
  actual:   <div class="entry-period">2018 – 2024</div>
```

Secciones: `head` (doctype, meta, JSON-LD, `<style>` global) · `print-cv` · `cover`
(HUD) · `hero` · `plano` · `sala-<id>` (una por sala, incluida la oculta) · `footer`.

Los marcadores viven en `tools/golden/sections.ts`. Si un refactor renombra o elimina un
marcador, el test falla con **"falta el marcador de la sección …"**: un cambio estructural
es visible, nunca silencioso.
