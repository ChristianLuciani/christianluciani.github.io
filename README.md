# Christian Luciani — Museo de una Trayectoria

CV interactivo diseñado como recorrido museográfico, con ilusiones ópticas animadas y scroll cinematográfico. Repositorio y sitio de GitHub Pages.

El mark animado del sitio se llama **Espirángulo** (espiral + triángulo).

**[→ Ver en vivo](https://christianluciani.github.io/)**

## Estructura

```
christianluciani.github.io/
├── index.html            ← Archivo principal (desplegado por GitHub Pages)
├── build.sh              ← Ensamblador opcional de src/
├── ESTADO.md             ← Estado actual y próximos pasos
├── vite.config.ts        ← Build con Vite (base "/")
├── public/               ← Recursos servidos tal cual (audio, thumbs de papers, OG, QR)
├── src/ts/               ← Fractales/ilusiones en TypeScript (Koch, canvas)
├── assets/               ← Fuente de build: iconos (inline), marca en assets/brand/logo
├── docs/
│   ├── CONTRIBUTING.md   ← Flujo de trabajo Git
│   ├── STYLE_GUIDE.md    ← Sistema de diseño completo
│   ├── cdn-decision.md   ← ADR: CDN de assets (jsDelivr) y pipeline
└── tools/                ← Generadores (og-image.svg)
```

## Stack

HTML · CSS · Canvas API · Vanilla JS · TypeScript (Vite) · Google Fonts
Sin frameworks ni dependencias de UI. La web publicada es un único `index.html`.

## Despliegue

Publicado en la **raíz** de GitHub Pages → `https://christianluciani.github.io/`
(`vite.config.ts` usa `base: "/"`; GitHub Actions compila `dist/` y lo despliega en cada push a `main`).

## Salas y sus ilusiones

| Sala | Contenido | Ilusión óptica |
|------|-----------|----------------|
| 00 · Entrada | Intro (frase → nombre) + Hero / museo | Cubos isométricos |
| 01 · La Exposición | **Obra publicada y auditable** — Kontablo · Drahma (showcase) · profile-as-code | Campo de Mandelbrot |
| 02 · El Bastidor | **En desarrollo** — ZENTROPY · Esteléctica · CLAPPS / Noesis-Noetix · NOOS · Topia · Nelson Companion · Physics Lab Book | Campo de Mandelbrot |
| 03 · El Taller | Competencias: agentes sintéticos, codificación agéntica, soberanía tecnológica, open source, ciencias, idiomas | Sierpinski |
| 04 · El Recorrido | Trayectoria 2003–presente | Interferencia de doble fuente |
| 05 · La Biblioteca | Publicaciones y preprints | Serpientes Rotantes + Triángulo Penrose |
| 06 · La Constelación | Mapa de conexiones (áreas · proyectos) | Constelación interactiva |
| 07 · El Visitante | Perfil y formación | Cubo de Necker |
| 08 · El Buzón | Redes y contacto | Copo de Koch |
| ~~El Archivo~~ | ~~Galería~~ — *oculta, pendiente de llenar* | — |

**La división de salas no se decide a mano.** `src/data/proyectos.ts` declara la `etapa`
de cada proyecto y los subtítulos derivan su conteo de ahí (nunca un "6 PROYECTOS"
hardcodeado, que miente en cuanto entra o sale una ficha):

- **publicado** = existe un artefacto que un tercero puede inspeccionar sin pedir permiso
  (repositorio público con licencia y release, DOI o URL viva). Es el mismo criterio que el
  SSOT de `profile-data` deriva con `projects[].artifactRefs` (`profile-as-code#333`).
- **desarrollo** = todavía no hay artefacto público. Cada ficha de El Bastidor declara
  `falta`: qué la haría graduarse a La Exposición.

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
