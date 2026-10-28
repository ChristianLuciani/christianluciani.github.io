# Sistema de Diseño — christianluciani.github.io (CV de Christian Luciani)

Sistema vigente desde el tema **Laboratorio** (issue #89, opción A: superficie
densa, sistema tipográfico sin fuentes web). Fuente visual de referencia:
`proposals/estilo-lab/estilo.css`; la implementación vive inline en
`src/templates/head_html.ts`.

## Paleta de colores

Los nombres históricos se conservan como **alias** de los tokens nuevos, para no
romper reglas existentes.

| Token nuevo   | Alias histórico | Valor     | Uso |
|---------------|-----------------|-----------|-----|
| `--bg-0`      | `--night`       | `#050810` | Fondo principal (más oscuro) |
| `--bg-1`      | `--deep`        | `#0b1120` | Fondo secundario (salas alternas) |
| `--surface`   | —               | `#111827` | Tarjetas y superficies |
| `--ink`       | `--text`        | `#e7edf6` | Texto cuerpo |
| `--ink-dim`   | —               | `#8b9bb0` | Texto secundario / cuerpo de tarjeta |
| `--ink-meta`  | `--muted`       | `#75849a` | **Todo texto chico, labels y metadata** (AA 4,79:1 sobre tarjeta) |
| `--ink-faint` | —               | `#5b6a7e` | **Solo decoración** (3,30–3,63:1: no usar como color de texto) |
| `--line`      | `--border`      | `rgba(140,170,200,.14)` | Bordes |
| `--line-soft` | —               | `rgba(140,170,200,.08)` | Bordes de tarjeta y separadores |

Acentos: `--teal #00c9c0` (principal), `--gold #c9a84c` (secundario / títulos de
sala), `--ice #7ad7ff`, `--coral #ff8a70`.

`--muted` ya **no** vale `#6b7a8d`: sobre `--surface` caía a 4,05:1 y fallaba AA
para texto normal. Es alias de `--ink-meta`.

## Tipografía

Stacks del sistema, **cero fuentes web** (0 requests a Google Fonts):

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-body` / `--font-display` | `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` | Cuerpo, títulos, UI |
| `--font-mono` | `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace` | Labels, metadata, métricas |

Tamaño base: `16px` · Line-height: `1.55`. Playfair Display, Fira Code y
Cormorant Garamond se retiraron (eran ~158 KB de fuentes).

## Superficie

- Contenedor: `1220px` (`--container`), centrado, con padding lateral fluido.
- Tarjetas: borde `1px --line-soft`, radio `15px` (`--radius`), fondo
  `--card` (blanco al 1,6 %).
- Chips y pastillas: radio `99px` (`--radius-chip`).
- Grillas de tarjetas: **3 columnas** desktop / **2** tablet (≤900px) / **1**
  móvil (≤620px), gap `12px`.
- Banda de métricas (`.hero-metrics`): `dt` mono 9px `--ink-meta`, `dd` mono
  17–22px `--ink`.
- HUD superior sticky con número + label siempre visibles; en móvil colapsa a
  marca + sala actual (`.hud-current`).
- Cursor nativo: no hay cursor personalizado.

## Navegación (HUD)

La generan `SALAS` + `src/cv/render.ts` (nunca se escribe a mano):

```html
<header class="hud">
  <div class="hud-inner">
    <a class="brand" href="#hero">◈ Christian Luciani</a>
    <span class="hud-current" id="hud-current">Entrada</span>
    <nav id="nav" class="hud-nav" aria-label="Salas del museo">
      <a class="nav-dot" href="#room-proyectos" data-target="room-proyectos"
         data-label="Exposición" data-label-en="Exhibition">
        <span class="n" aria-hidden="true">01</span>
        <span class="nav-label">Exposición</span>
      </a>
      <!-- …una entrada por sala visible -->
    </nav>
    <div class="hud-side"><!-- idioma + sonido --></div>
  </div>
</header>
```

`render.ts` regenera las entradas desde `SALAS`, sincroniza los labels con
`<html lang>` y marca la sala activa con `aria-current="true"`.

## Animaciones de scroll

Añade `data-scroll="[tipo]"` al elemento. Se activa al entrar al viewport.

| Valor          | Efecto                              |
|----------------|-------------------------------------|
| `zoom-in`      | Escala 0.78 → 1                     |
| `zoom-out`     | Escala 1.22 → 1                     |
| `from-left`    | translateX(-80px) → 0               |
| `from-right`   | translateX(80px) → 0                |
| `from-center`  | scale(0.4) + translateY(20px) → 0   |
| `up`           | translateY(60px) → 0                |

Añade `data-delay="1"` a `data-delay="6"` para escalonar (×0.1s). Con
`prefers-reduced-motion: reduce` todo el contenido se revela sin animación.

## Estructura de salas

```html
<section class="room room--alt" id="room-NOMBRE">
  <canvas class="room-canvas" id="c-NOMBRE"></canvas>  <!-- ilusión de fondo -->
  <div class="room-content">
    <div class="room-number" data-scroll="up">SALA 0X</div>
    <h2 class="room-title" data-scroll="zoom-in">Título <em>Acento</em></h2>
    <div class="room-subtitle" data-scroll="up" data-delay="1">METADATA · CONTEXTO</div>
    <!-- contenido -->
  </div>
</section>
<div class="room-divider"></div>
```

- `.room--alt`: sala sobre `--bg-1` (alternancia).
- `.room--contact`: contacto compacto (min-height 55vh).
- `.room--hidden`: sala oculta (galería). Ya no se usa `display:none` inline.
- `.room-canvas` / `.illusion-canvas`: `width:100%; height:100%` (el bug de los
  canvas a 300×150 se corrigió con esa regla).

## Componentes disponibles

### `.entry` — ítem de timeline
```html
<div class="entry" data-scroll="from-left">
  <div class="entry-period">2019 – 2024</div>
  <div class="entry-title">Rol</div>
  <div class="entry-org">Organización · Ciudad</div>
  <ul class="entry-body"><li>Logro o descripción</li></ul>
</div>
```

### `.project-grid` + `.project-card` — tarjetas de proyecto (3/2/1)
```html
<div class="project-grid">
  <div class="project-card" data-scroll="from-left">
    <span class="project-status status-active">En desarrollo</span>
    <!-- status-active | status-private | status-paused -->
    <div class="project-title"><em>Nombre</em> — Subtítulo</div>
    <div class="project-tagline">Una línea de qué resuelve</div>
    <ul class="project-body"><li>Detalle</li></ul>
    <div class="project-note">Nota en dorado</div>
  </div>
</div>
```

### `.gallery-grid` — galería con placeholders
```html
<div class="gallery-grid cols-3 gallery-grid--280">
  <div class="gallery-slot" data-caption="Pie de foto">
    <div class="gallery-placeholder-icon">🐉</div>
    <div class="gallery-placeholder-text">TEXTO<br>Añadir foto</div>
  </div>
</div>
<!-- cols-2 | cols-3 | cols-4 · gallery-grid--220 | --260 | --280 -->
```

### `.pub-item` / `.pub-layout` — publicaciones
```html
<div class="pub-layout">
  <div>
    <div class="pub-item">
      <div class="pub-year">2025</div>
      <img class="pub-thumb" src="…" alt="…">
      <div>
        <div class="pub-title">Título del artículo</div>
        <div class="pub-journal">Autores · Journal · Vol/Nro</div>
        <a class="pub-doi" href="https://doi.org/…" target="_blank">↗ DOI</a>
      </div>
    </div>
  </div>
  <div class="pub-aside"><!-- ilusión lateral sticky --></div>
</div>
```

### Otros
- `.drahma-showcase`, `.drahma-columns`, `.drahma-grid`, `.drahma-cell`,
  `.lab-stem-card`, `.repo-strategy`.
- `.profile-grid`, `.profile-card`, `.profile-text--meta`.
- `.skills-grid`, `.skill-block`, `.room-footnote`, `.interests`.
- `.contact-grid`, `.contact-link` (chips), `.contact-note`.
- `.graph-stage`, `.graph-lede`.

No se usan atributos `style="…"` en el markup: la presentación vive en la hoja
inline de `head_html.ts` (o en variables CSS cuando el valor es por instancia).

## Ilusiones ópticas por sala

| Canvas ID        | Ilusión               | Sala |
|------------------|-----------------------|------|
| `c-necker`       | Cubo de Necker (BG)   | Perfil (fondo) |
| `c-necker-ill`   | Cubo de Necker        | Perfil (frame lateral) |
| `c-stairs-ill`   | Escalera de Penrose   | Proyectos (showcase Drahma) |
| `c-exp`          | Interferencia doble   | Experiencia (fondo) |
| `c-fisica`       | Serpientes Rotantes   | Biblioteca (fondo) |
| `c-penrose`      | Triángulo de Penrose  | Biblioteca (sidebar) |
| `c-comp`         | Sierpinski            | Taller (fondo) |
| `c-proyectos`    | Mandelbrot field      | Proyectos (fondo) |
| `hero-canvas`    | Cubos isométricos     | Hero (fondo) |

### Prompts para generar SVGs de mayor calidad
Usar en otra sesión de Claude para reemplazar cada canvas:

**Cubo de Necker:** "SVG del Cubo de Necker (1832), perspectiva isométrica. Líneas en #00c9c0, fondo transparente, 300×300px. Sin relleno, solo bordes. Ambigüedad perceptual perfecta."

**Escalera de Penrose:** "SVG Penrose Stairs (1958), perspectiva isométrica. Gradiente #00c9c0 → #c9a84c, fondo transparente, 380×480px. Bucle imposible cerrado visible."

**Triángulo de Penrose:** "SVG Penrose Triangle (1954). Degradado #00c9c0 → #c9a84c, sólido y tridimensional pero imposible. Fondo transparente, 280×280px."

**Sierpinski:** "SVG Triángulo de Sierpinski nivel 6. Solo bordes en #00c9c0 con alpha 0.15, fondo transparente, 500×500px."
