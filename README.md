# Christian Luciani — Museo de una Trayectoria

CV interactivo diseñado como recorrido museográfico, con ilusiones ópticas animadas y scroll cinematográfico. Repositorio y sitio de GitHub Pages.

El mismo contenido factual (SSOT) se publica en **tres versiones**: el museo (default), una mirada de ingeniería y su variante nocturna. Cambia la narrativa y la piel, nunca los hechos ni la curación de otro tema.

El mark animado del sitio se llama **Espirángulo** (espiral + triángulo).

El mark **estático** es canónico en
[`cluciani-brand-kit`](https://github.com/ChristianLuciani/cluciani-brand-kit)
(`v1.2.0`); `assets/brand/logo/` es un espejo vendored pinneado en
`brand-kit.lock.json` y verificado con `npm run brand:verify`. La animación
runtime y el clock viven en este repo.

## Versiones publicadas

| Versión | URL | Narrativa | Piel |
|---|---|---|---|
| **Museo** (default) | https://christianluciani.github.io/ | `museo` — recorrido museográfico de 8 salas | `src/themes/museo/skin.css` |
| **Ingeniería** | https://christianluciani.github.io/ingenieria/ | `ingenieria` — reordenada, «Ciencia» agrupa Física+Grafo, competencias oculta, `profile-as-code` excluido | `src/themes/ingenieria/skin.css` |
| **Ingeniería nocturna** | https://christianluciani.github.io/ingenieria-nocturno/ | la MISMA de ingeniería, por referencia (`variantOf`) | `src/themes/ingenieria-nocturno/skin.css` |

El «switch» es la **URL**: no hay conmutador de tema en runtime en producción (ADR-001 §8). `SITE_THEME=<id>` aísla un tema en un build propio; sin selector, `npm run build` publica todo el registro.

## Estructura

```
christianluciani.github.io/
├── index.html              ← render FUENTE del tema default (commiteado; baseline del golden)
├── build.ts                ← render del documento + publicación del artefacto (dist/<path>/)
├── vite.config.ts          ← bundle único (base "/") + manifest hasheado
├── src/
│   ├── themes/             ← NARRATIVAS y PIELES: <id>/{narrative,copy,illusions,contrast}.ts + skin.css
│   │   ├── index.ts        ← registro id → narrative + resolución de SITE_THEME
│   │   ├── types.ts        ← contrato (NarrativeManifest, RoomRef, RoomGroup)
│   │   ├── rooms.ts        ← roomsFromCuration(): visibilidad + orden + conteos + voz
│   │   └── skin.ts         ← resuelve qué skin.css emite cada tema
│   ├── content/
│   │   ├── curation/       ← CURACIÓN: qué se presenta, orden y exclusiones con `reason`, por tema
│   │   └── copy.ts         ← resolución de copy del tema activo (t(), ta())
│   ├── templates/          ← renderers genéricos (salas, plano, hero, cover, print-CV, head)
│   ├── cv/                 ← derivaciones de estructura (SALAS, numeración, nav, i18n, render)
│   ├── data/               ← snapshots generados del SSOT (profile, entity, now, provenance)
│   ├── artifact/           ← publicación por página (canónica, sitemap, entry hasheado)
│   ├── ts/                 ← runtime del browser (illusions/, graph/, fractals/, app/theme.ts)
│   └── main.ts             ← entrada del bundle
├── tools/
│   ├── themes/             ← gates: check.ts (copy/curación/piel/contraste/linaje/golden) y assets.ts
│   ├── golden/             ← baseline por tema + política de cambios de golden
│   ├── curation.ts         ← reporte de cobertura de curación por tema
│   └── sync-*.ts           ← proyecciones del SSOT (profile, entity, ai-policy, now, check)
├── tests/
│   └── golden/             ← un snapshot HTML por tema (museo, ingenieria, ingenieria-nocturno)
├── public/                 ← servido tal cual (audio, thumbs, OG, QR, robots/llms/AI-POLICY)
├── assets/                 ← iconos inline + espejo vendored de marca (brand kit v1.2.0)
├── docs/
│   ├── SPEC.md             ← SPEC del sitio (§5 contenido/curación, §8 FASE 5 temas)
│   ├── CREAR-TEMA.md       ← receta operativa para crear/ajustar un tema
│   ├── adr/                ← ADR-001 (hechos · curación · narrativa · piel)
│   ├── epics/              ← epic y sub-issues de la FASE 5
│   ├── CONTRIBUTING.md     ← flujo de trabajo Git
│   ├── STYLE_GUIDE.md      ← sistema de diseño
│   └── cdn-decision.md     ← ADR: CDN de assets y pipeline
├── .github/workflows/      ← ci.yml · deploy.yml · refresh-now.yml
└── ESTADO.md               ← estado actual y próximos pasos
```

## Stack

HTML · CSS · Canvas API · Vanilla JS · TypeScript (Vite) · Google Fonts.
Sin frameworks ni dependencias de UI. **Un** bundle y **una** raíz de assets para **N** páginas: `build.ts` escribe `dist/<path>/index.html` por tema (hoy `/`, `/ingenieria/`, `/ingenieria-nocturno/`) y un `sitemap.xml` con todas las URLs.

## Temas: cuatro dimensiones

El sitio modela el contenido en cuatro capas (ADR-001):

| Dimensión | Dónde vive | Qué decide |
|---|---|---|
| **Hechos** | `src/data/profile.generated.ts` (SSOT en `profile-data`) | qué es verdad; ningún tema lo muta |
| **Curación** | `src/content/curation/<id>.ts` | qué se presenta, en qué orden y por qué (`exclude` exige `reason`) |
| **Narrativa** | `src/themes/<id>/narrative.ts` + `copy.ts` | salas (orden, agrupación, visibilidad), voz, metáforas, ilusiones, metadata |
| **Piel** | `src/themes/<id>/skin.css` | tokens, tipografía, densidad |

- **Agrupar salas** es una unidad de **navegación**, no una fusión de contenido: `NarrativeManifest.groups` le da a dos salas un número, una entrada de HUD y una celda del plano, y cada una conserva su `<section>`.
- `order.salas` es el **único** lever del orden de salas y, cuando se declara, es **completo** (nombra todas las visibles). Ocultar una sala es `salas:<id>` en `exclude` **y** sacarla de `include`/`order.salas`.
- Una **variante de piel** declara `variantOf` y reusa copy/salas/ilusiones/metadata/curación **por referencia**; el gate exige identidad, no una copia.
- El publicador inyecta `<html data-theme="<id>">` y `src/ts/app/theme.ts` instala esa narrativa al arrancar (antes de i18n, intro y render).

Gates del contrato (CI):

```bash
npm run themes:check    # copy ES/EN sin huérfanas, curación con reason, 0 literales de color,
                        # AA, skin own|inherit, linaje variantOf, golden y layout por tema
npm run themes:assets   # data-theme correcto y assets de cada página publicada
npm run curation:report # cobertura de curación (100% por tema)
npm run golden:update   # regenera tests/golden/<id>.html (el PR declara Golden-Cambio: render)
npm test                # suite completa (incluye los gates anteriores como tests)
```

## Datos del CV (SSOT)

Los hechos del CV (trayectoria, proyectos, publicaciones, skills) viven en el repo
privado `profile-data`; acá se commitean tres snapshots de deploy que se regeneran
desde el engine `pasco` (`PROFILE_DATA_PATH`):

| Artefacto | Comando | Qué es |
|---|---|---|
| `src/data/profile.generated.ts` | `npm run sync:profile` | proyección pública del perfil |
| `src/data/entity.generated.ts` | `npm run sync:entity` | JSON-LD `Person` + `FAQPage` (#140) |
| `public/robots.txt` · `llms.txt` · `AI-POLICY.md` | `npm run sync:ai-policy` | política IA del SSOT (Vite la copia a la raíz de `dist/`) |

La frescura del pin no alcanza: `npm run sync:check` corre ocho capas — sin
workspace, en CI, verifica cada archivo contra su propio render y contra un fixture
anonimizado (`self`/`fixture` del perfil, `entity-self`/`entity-fixture` de la
entidad, `policy-self` de la política: determinismo, `@id`, postura sin
`User-agent: *`). Esas capas **no invocan el pipeline** ni prueban paridad contra
`profile-data`: **sólo `--workspace` (o `PROFILE_DATA_PATH`) compara contenido
contra el SSOT** (`workspace`, `entity-workspace`, `policy-workspace`, byte a
byte). Cuando `verified < total` el cierre dice `PARCIAL` (en CI:
`PARCIAL — 5/8`) y nunca `✅ OK`; `OK — 8/8` sólo aparece con workspace y las ocho
capas verdes. Además corre el guard de consumidores — un snapshot al día sin
ningún consumidor de **render** ya no pasa verde en silencio (#99, #110).

## Feed «Ahora» (chrome, no hecho citable)

El bloque «Ahora» de la portada se renderiza **en el build** desde el feed que
publica `ChristianLuciani/now` (#117): `now.lock.json` pinea un tag inmutable
(`vX.Y.Z`) y el sha256 de sus bytes; `npm run sync:now` verifica el digest antes
de escribir `src/data/now.snapshot.json` y `src/data/now.generated.ts`, y
`now.generated.test.ts` exige paridad offline en CI. Un tag **nuevo** es un
re-pin TOFU declarado (se registra el digest de esos bytes); el **mismo** tag
siempre se verifica contra el pin, así un tag movido no se acepta en silencio.
`npm run build` no hace red: importa el módulo commiteado. El refresh corre en
`.github/workflows/refresh-now.yml`, resuelve el tag estable más nuevo del
productor, commitea el snapshot + el `index.html` reconstruido y despacha CI y
deploy (el push con `GITHUB_TOKEN` no los dispara).

Este bloque es **chrome**: no entra a JSON-LD, `llms.txt` ni `FAQPage`. Lo que
deba ser citable por un motor de respuestas se promueve a `content/` en
`profile-data` — curado, fechado, con fuente.

## Despliegue

Publicado en GitHub Pages con **una página por tema** dentro de un solo artefacto: `https://christianluciani.github.io/` (museo, raíz), `/ingenieria/` y `/ingenieria-nocturno/`. `vite.config.ts` usa `base: "/"`; GitHub Actions compila `dist/` y lo despliega en cada push a `main`. La canónica, `og:url` y `og:image` salen de la dirección declarada por cada tema (`narrative.site` + `path`), overrideable con `SITE_ORIGIN`/`SITE_BASE`.

## Salas — tema `museo` (default)

| Sala | Contenido | Ilusión óptica |
|------|-----------|----------------|
| 00 · Entrada | Intro (frase → nombre) + Hero / museo | Cubos isométricos |
| 01 · El Marco | **Obra publicada y auditable** — Kontablo · Drahma (showcase) · profile-as-code | Campo de Mandelbrot |
| 02 · El Bastidor | **En desarrollo** — ZENTROPY · Esteléctica · CLAPPS / Noesis-Noetix · NOOS · Topia · Nelson Companion · Physics Lab Book | Campo de Mandelbrot |
| 03 · La Paleta | Competencias: agentes sintéticos, codificación agéntica, soberanía tecnológica, open source, ciencias, idiomas | Sierpinski |
| 04 · El Friso | Trayectoria 2003–presente | Interferencia de doble fuente |
| 05 · La Biblioteca | Publicaciones y preprints | Serpientes Rotantes + Triángulo Penrose |
| 06 · El Compás | Mapa de conexiones (áreas · proyectos) | Constelación interactiva |
| 07 · El Autorretrato | Perfil y formación | Cubo de Necker |
| 08 · El Buzón | Redes y contacto | Copo de Koch |
| ~~El Archivo~~ | ~~Galería~~ — *oculta, pendiente de llenar* | — |

**El layout lo decide cada tema, no este README.** El tema `ingenieria` demuestra el contrato completo: reordena (Producción → Trayectoria → Prototipos → Ciencia → Perfil → Contacto), **agrupa** Física y Grafo en la unidad «Ciencia», **oculta** competencias, excluye `profile-as-code` con `reason` y deriva su plano (7 celdas). `ingenieria-nocturno` publica la misma narrativa con otra piel.

**La división de salas no se decide a mano.** `src/data/proyectos.ts` declara la `etapa`
de cada proyecto y los subtítulos derivan su conteo de ahí (nunca un "6 PROYECTOS"
hardcodeado, que miente en cuanto entra o sale una ficha). Un tema que excluye una
ficha ve el conteo re-derivado de **su** curación:

- **publicado** = existe un artefacto que un tercero puede inspeccionar sin pedir permiso
  (repositorio público con licencia y release, DOI o URL viva). Es el mismo criterio que el
  SSOT de `profile-data` deriva con `projects[].artifactRefs` (`profile-as-code#333`).
- **desarrollo** = todavía no hay artefacto público. Cada ficha de El Bastidor declara
  `falta`: qué la haría graduarse a El Marco.

## Flujo de trabajo

```bash
# Editar en rama dedicada (nunca en main). Prefijo por harness: dsh/, pi/, claude/…
git checkout -b dsh/docs/descripcion-del-cambio

# Un cambio de tema vive en src/themes/<id>/** + src/content/curation/<id>.ts
npm run themes:check && npm test

git add .
git commit -m "docs(themes): descripcion"
git push origin dsh/docs/descripcion-del-cambio
# → abrir PR → Christian revisa y mergea → GitHub Pages actualiza (~1 min)
```

Ver `docs/CONTRIBUTING.md` para el flujo Git, `docs/CREAR-TEMA.md` para crear o ajustar un tema, `docs/SPEC.md` §5/§8 para el contrato y `docs/adr/ADR-001-temas-y-narrativas.md` para las decisiones.

## Contacto

cluciani@gmail.com · [LinkedIn](https://www.linkedin.com/in/christian-luciani) · [ResearchGate](https://www.researchgate.net/profile/Christian-Luciani) · [X @cluciani_ve](https://x.com/cluciani_ve)
