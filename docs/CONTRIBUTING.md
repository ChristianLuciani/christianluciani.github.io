# Guía de Contribución — christianluciani.github.io (CV de Christian Luciani)

## Flujo de trabajo Git

**Regla absoluta:** nunca trabajar directamente en `main`. Usar worktree/rama dedicada por sesión.

```
aionui/pi/[tema]   ← ramas de AionUi / Pi (harness del autor)
claude/[tema]      ← ramas de Claude
cursor/[tema]      ← ramas de Cursor / IDE agents
```

Ejemplo:
```bash
git checkout -b aionui/pi/fix-foto-perfil
# ... editar ...
git add .
git commit -m "fix: foto perfil circular con fallback"
git push origin aionui/pi/fix-foto-perfil
# → abrir PR para que Christian revise y haga merge
```

## Estructura del proyecto

```
christianluciani.github.io/
├── index.html          ← GENERADO (build.ts) — NO editar a mano
├── build.ts            ← Ensambla src/templates + SALAS → index.html
├── vite.config.ts      ← build (base "/")
├── README.md
├── ESTADO.md           ← Estado actual y próximo paso por proyecto
├── public/             ← Estáticos servidos tal cual (íconos, fotos)
├── src/
│   ├── main.ts         ← entry Vite (UI, i18n, intro, grafo, canvases, mountSalas)
│   ├── cv/
│   │   ├── salas.ts    ← SALAS: única fuente de verdad de la estructura del museo
│   │   ├── render.ts   ← deriva nav/números/ROOM_EN/MAP_EXTRA desde SALAS
│   │   ├── i18n.ts     ← diccionario MAP + toggle ES/EN (módulo)
│   │   ├── intro.ts    ← animación de introducción (módulo)
│   │   └── *.test.ts   ← integridad + paridad + build + guarda scripts
│   ├── templates/      ← HTML ensamblable (head, cover, hero, plano, salas…)
│   └── ts/
│       ├── app/        ← ui.ts + canvasWatch.ts
│       ├── graph/      ← grafo.ts (mapa de conexiones)
│       └── illusions/  ← ilusiones ópticas por canvas (módulos)
├── assets/             ← Recursos del sitio (og-image, thumbs de papers)
├── tools/              ← Generadores (og-image.svg)
└── docs/
    ├── CONTRIBUTING.md ← Este archivo
    └── STYLE_GUIDE.md  ← Sistema de diseño completo
```

> **El `index.html` es 100% generado.** Editar contenido = tocar `src/` y reconstruir:
> `npm run build:html` (solo HTML) o `npm run build` (HTML + bundle Vite). El test
> `src/cv/build.test.ts` falla si el index.html commiteado no coincide byte a byte con el
> output de `assembleHtml()` — no edites `index.html` a mano.

## Editar el CV

### Editar la estructura de salas
La **única fuente de verdad** de las salas es `src/cv/salas.ts` (`SALAS`). Desde ahí se generan
nav lateral, numeración (`SALA 01–07`), etiquetas del plano, títulos EN (`ROOM_EN`) y claves de
sala del diccionario ES/EN. Renombrar/reordenar/añadir/quitar sala = editar `SALAS` + `npm run
build:html` (o `npm run build`). Los tests `src/cv/parity.test.ts` y `src/cv/build.test.ts`
fallan si algo queda desalineado o el HTML no se regeneró.

### Editar el contenido (recomendado)
Cada `<section class="room">` vive en `src/templates/sala_html.ts` (`ROOM_SHELL` + `ROOM_BODY` por
sala; el header número/título/subtítulo se genera desde `SALAS`). El `<style>` global y el head
viven en `src/templates/head_html.ts`; el plano en `src/templates/plano_html.ts`. Cambiá la
fuente y reconstruí (`npm run build:html`).

**Al editar texto en español, actualiza también su traducción EN** en el diccionario `MAP` de
`src/cv/i18n.ts`. Si no, el toggle dejará ese texto sin traducir.

### Editar estilos / ilusiones
- Variables de diseño y CSS: empieza en el bloque `:root` y el `<style>` de
  `src/templates/head_html.ts`.
- Ilusiones/fractales en TypeScript: `src/ts/illusions/` (se compilan con `npm run build`).

## Añadir fotos a la galería

1. Copia la imagen a `public/assets/` (o `assets/`) con nombre descriptivo.
2. En `index.html`, dentro de la sala correspondiente, busca `.gallery-slot`.
3. Descomenta `<img src="assets/gallery/nombre-descriptivo.jpg">` (ajusta la ruta).
4. El placeholder desaparece automáticamente.

## Convención de commits

```
feat:  nueva funcionalidad
fix:   corrección de bug o dato incorrecto
style: cambio visual sin lógica nueva
docs:  README, CONTRIBUTING, ESTADO
chore: limpieza, refactoring sin cambio funcional
```
