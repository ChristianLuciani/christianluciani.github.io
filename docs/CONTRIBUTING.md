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
├── index.html          ← ARCHIVO PRINCIPAL DESPLEGADO (GitHub Pages + Vite)
├── build.sh            ← Ensambla src/ → index.html (opcional, legacy)
├── vite.config.ts      ← build (base "/")
├── README.md
├── ESTADO.md           ← Estado actual y próximo paso por proyecto
├── public/             ← Estáticos servidos tal cual (íconos, fotos)
├── src/
│   ├── main.ts         ← entry Vite (mounts canvases + mountSalas)
│   ├── cv/             ← PARAMETRIZACIÓN: estructura del museo
│   │   ├── salas.ts    ← SALAS: única fuente de verdad (nav, numeración, i18n, títulos)
│   │   ├── render.ts   ← deriva nav/números/ROOM_EN/MAP_EXTRA desde SALAS
│   │   └── *.test.ts   ← integridad + paridad con index.html + guarda scripts inline
│   └── ts/             ← Fractales/ilusiones en TypeScript (Koch, canvas)
├── assets/             ← Recursos del sitio (og-image, thumbs de papers)
├── tools/              ← Generadores (og-image.svg)
└── docs/
    ├── CONTRIBUTING.md ← Este archivo
    └── STYLE_GUIDE.md  ← Sistema de diseño completo
```

> Nota: el flujo de edición real es **directamente sobre `index.html`**. La subcarpeta
> modular legacy (`src/styles|js|sections`) ya no se usa; la lógica viva está en `src/ts/`
> (compilada por Vite), el contenido en `index.html` y la **estructura de salas en `src/cv/salas.ts`**
> (la navegación, numeración e i18n de salas se generan desde ahí en runtime — ver
> `docs/REFACTOR_PLAN.md`, Fase 1).

## Editar el CV

### Editar la estructura de salas (recomendado para el refactor)
La **única fuente de verdad** de las salas es `src/cv/salas.ts` (`SALAS`). Desde ahí se generan
nav lateral, numeración (`SALA 01–07`), títulos EN (`ROOM_EN`) y claves de sala del diccionario
ES/EN. Para renombrar, reordenar, añadir o quitar una sala: edita `SALAS` (y en Fase 2 el HTML
se regenerará solo; hoy los `<section>` viven en `index.html` en el mismo orden que `SALAS` —
el test `src/cv/parity.test.ts` falla si se desalinean).

### Editar el contenido (recomendado)
El `index.html` tiene comentarios `SALA 0X` que delimitan cada sala.
Busca `SALA 01`, `SALA 02`, etc. para navegar.

**Al editar texto en español, actualiza también su traducción EN** en el diccionario
`MAP` al final del archivo (el bloque `<!-- i18n ES/EN toggle -->`). Si no, el toggle
dejará ese texto sin traducir.

### Editar estilos / ilusiones
- Variables de diseño y CSS: empieza en el bloque `:root` y el `<style>` del `index.html`.
- Ilusiones/fractales en TypeScript: `src/ts/` (se compila con `npm run build`).

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
