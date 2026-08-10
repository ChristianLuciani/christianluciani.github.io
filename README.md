# Christian Luciani — Museo de una Trayectoria

CV interactivo diseñado como recorrido museográfico, con ilusiones ópticas animadas y scroll cinematográfico. Repositorio y sitio de GitHub Pages.

**[→ Ver en vivo](https://christianluciani.github.io/)**

## Estructura

```
christianluciani.github.io/
├── index.html            ← Archivo principal (desplegado por GitHub Pages)
├── build.sh              ← Ensamblador opcional de src/
├── ESTADO.md             ← Estado actual y próximos pasos
├── vite.config.ts        ← Build con Vite (base "/")
├── public/               ← Recursos estáticos servidos tal cual (íconos, fotos)
├── src/ts/               ← Fractales/ilusiones en TypeScript (Koch, canvas)
├── assets/               ← Recursos del sitio (og-image, thumbs de papers)
├── docs/
│   ├── CONTRIBUTING.md   ← Flujo de trabajo Git
│   └── STYLE_GUIDE.md    ← Sistema de diseño completo
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
| 01 · Perfil | Formación + perfil | Cubo de Necker (grid BG + frame) |
| 02 · Proyectos | Kontablo / ZENTROPY / Esteléctica / CLAPPS / NOOS / **Drahma** (showcase) | Campo de Mandelbrot |
| 03 · Trayectoria | Experiencia 2003–presente | Interferencia de doble fuente |
| 04 · Galería | Fotografías y evidencias | — |
| 05 · Biblioteca | Publicaciones y preprints | Serpientes Rotantes + Triángulo Penrose |
| 06 · Competencias | Skills, idiomas, open source | Sierpinski |
| 07 · Conectar | Redes y contacto | — |

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
