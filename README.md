# Christian Luciani — Museo de una Trayectoria

CV interactivo diseñado como recorrido museográfico, con ilusiones ópticas animadas y scroll cinematográfico. Repositorio y sitio de GitHub Pages.

El mark animado del sitio se llama **Espirángulo** (espiral + triángulo).

El mark **estático** es canónico en
[`cluciani-brand-kit`](https://github.com/ChristianLuciani/cluciani-brand-kit)
(`v1.2.0`); `assets/brand/logo/` es un espejo vendored pinneado en
`brand-kit.lock.json` y verificado con `npm run brand:verify`. La animación
runtime y el clock viven en este repo.

**[→ Ver en vivo](https://christianluciani.github.io/)**

## Estructura

```
christianluciani.github.io/
├── index.html            ← Archivo principal (desplegado por GitHub Pages)
├── build.sh              ← Ensamblador opcional de src/
├── ESTADO.md             ← Estado actual y próximos pasos
├── vite.config.ts        ← Build con Vite (base "/")
├── public/               ← Recursos servidos tal cual (audio, thumbs de papers, OG, QR,
│                            robots.txt/llms.txt/AI-POLICY.md generados por sync:ai-policy)
├── src/ts/               ← Fractales/ilusiones en TypeScript (Koch, canvas)
├── assets/               ← Iconos inline + espejo vendored de marca (brand kit v1.2.0)
├── docs/
│   ├── CONTRIBUTING.md   ← Flujo de trabajo Git
│   ├── STYLE_GUIDE.md    ← Sistema de diseño completo
│   ├── cdn-decision.md   ← ADR: CDN de assets (jsDelivr) y pipeline
└── tools/                ← Generadores (og-image.svg)
```

## Stack

HTML · CSS · Canvas API · Vanilla JS · TypeScript (Vite) · Google Fonts
Sin frameworks ni dependencias de UI. La web publicada es un único `index.html`.

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

Publicado en la **raíz** de GitHub Pages → `https://christianluciani.github.io/`
(`vite.config.ts` usa `base: "/"`; GitHub Actions compila `dist/` y lo despliega en cada push a `main`).

## Salas y sus ilusiones

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

**La división de salas no se decide a mano.** `src/data/proyectos.ts` declara la `etapa`
de cada proyecto y los subtítulos derivan su conteo de ahí (nunca un "6 PROYECTOS"
hardcodeado, que miente en cuanto entra o sale una ficha):

- **publicado** = existe un artefacto que un tercero puede inspeccionar sin pedir permiso
  (repositorio público con licencia y release, DOI o URL viva). Es el mismo criterio que el
  SSOT de `profile-data` deriva con `projects[].artifactRefs` (`profile-as-code#333`).
- **desarrollo** = todavía no hay artefacto público. Cada ficha de El Bastidor declara
  `falta`: qué la haría graduarse a El Marco.

## Flujo de trabajo

```bash
# Editar en rama dedicada (nunca en main)
git checkout -b aionui/pi/descripcion-del-cambio

# Editar index.html (buscar "SALA 0X" para navegar)
# Los cambios de texto afectan a ES y al diccionario EN (MAP) al final del archivo

git add .
git commit -m "feat: descripcion"
git push origin aionui/pi/descripcion-del-cambio
# → abrir PR → Christian revisa y mergea → GitHub Pages actualiza (~1 min)
```

Ver `docs/CONTRIBUTING.md` para detalles y `docs/STYLE_GUIDE.md` para el sistema de diseño.

## Contacto

cluciani@gmail.com · [LinkedIn](https://www.linkedin.com/in/christian-luciani) · [ResearchGate](https://www.researchgate.net/profile/Christian-Luciani) · [X @cluciani_ve](https://x.com/cluciani_ve)
