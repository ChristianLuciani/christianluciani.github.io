# Guía de Contribución — cv (Christian Luciani)

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
cv/
├── index.html          ← ARCHIVO PRINCIPAL DESPLEGADO (GitHub Pages + Vite)
├── build.sh            ← Ensambla src/ → index.html (opcional, legacy)
├── vite.config.ts      ← build (base "/")
├── README.md
├── ESTADO.md           ← Estado actual y próximo paso por proyecto
├── public/             ← Estáticos servidos tal cual (íconos, fotos)
├── src/ts/             ← Fractales/ilusiones en TypeScript (Koch, canvas)
├── assets/             ← Recursos del sitio (og-image, thumbs de papers)
├── tools/              ← Generadores (og-image.svg)
└── docs/
    ├── CONTRIBUTING.md ← Este archivo
    └── STYLE_GUIDE.md  ← Sistema de diseño completo
```

> Nota: el flujo de edición real es **directamente sobre `index.html`**. La subcarpeta
> modular legacy (`src/styles|js|sections`) ya no se usa; la lógica viva está en `src/ts/`
> (compilada por Vite) y el contenido en `index.html`.

## Editar el CV

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
