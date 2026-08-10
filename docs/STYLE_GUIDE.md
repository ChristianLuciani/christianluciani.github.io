# Sistema de Diseño — christianluciani.github.io (CV de Christian Luciani)

## Paleta de colores

| Variable      | Valor     | Uso                        |
|---------------|-----------|----------------------------|
| `--night`     | `#050810` | Fondo principal (más oscuro) |
| `--deep`      | `#0b1120` | Fondo secundario (salas alternas) |
| `--surface`   | `#111827` | Tarjetas y superficies     |
| `--teal`      | `#00c9c0` | Acento principal           |
| `--gold`      | `#c9a84c` | Acento secundario / alertas |
| `--text`      | `#d6dde8` | Texto cuerpo               |
| `--muted`     | `#6b7a8d` | Texto secundario / metadata |
| `--border`    | `rgba(0,201,192,0.15)` | Bordes sutiles |

## Tipografía

| Familia               | Uso                    | Google Fonts          |
|-----------------------|------------------------|-----------------------|
| Playfair Display      | Títulos / display      | `wght@400;700;900`    |
| Fira Code             | Labels / código / mono | `wght@300;400;500`    |
| Cormorant Garamond    | Cuerpo                 | `wght@300;400` italic |

Tamaño base: `18px` · Line-height: `1.7`

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

Añade `data-delay="1"` a `data-delay="6"` para escalonar (×0.1s).

## Estructura de salas

```html
<section class="room" id="room-NOMBRE" style="background:var(--deep)">
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

Salas en `--night`: hero, proyectos, galería, competencias  
Salas en `--deep`: perfil, experiencia, física, contacto  
Sala Drahma: `#080d18`

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

### `.project-card` — tarjeta de proyecto
```html
<div class="project-card" data-scroll="from-left">
  <span class="project-status status-active">En desarrollo</span>
  <!-- status-active | status-private | status-paused -->
  <div class="project-title"><em>Nombre</em> — Subtítulo</div>
  <div class="project-tagline">Una línea de qué resuelve</div>
  <ul class="project-body"><li>Detalle</li></ul>
  <div class="project-note">Nota en dorado</div>
</div>
```

### `.gallery-grid` — galería con placeholders
```html
<div class="gallery-grid cols-3" style="height:280px">
  <div class="gallery-slot" data-caption="Pie de foto">
    <!-- <img src="assets/gallery/foto.jpg"> -->
    <div class="gallery-placeholder-icon">🐉</div>
    <div class="gallery-placeholder-text">TEXTO<br>Añadir foto</div>
  </div>
</div>
<!-- cols-2 | cols-3 | cols-4 -->
```

### `.pub-item` — publicación
```html
<div class="pub-item">
  <div class="pub-year">2025</div>
  <div>
    <div class="pub-title">Título del artículo</div>
    <div class="pub-journal">Autores · Journal · Vol/Nro</div>
    <a class="pub-doi" href="https://doi.org/..." target="_blank">↗ DOI</a>
  </div>
</div>
```

## Ilusiones ópticas por sala

| Canvas ID        | Ilusión               | Sala |
|------------------|-----------------------|------|
| `c-necker`       | Cubo de Necker (BG)   | 01 Perfil (fondo) |
| `c-necker-ill`   | Cubo de Necker        | 01 Perfil (frame lateral) |
| `c-stairs-ill`   | Escalera de Penrose   | 02 Drahma |
| `c-exp`          | Interferencia doble   | 04 Experiencia (fondo) |
| `c-fisica`       | Serpientes Rotantes   | 06 Física (fondo) |
| `c-penrose`      | Triángulo de Penrose  | 06 Física (sidebar) |
| `c-comp`         | Sierpinski            | 07 Competencias (fondo) |
| `c-proyectos`    | Mandelbrot field      | 03 Proyectos (fondo) |
| `hero-canvas`    | Cubos isométricos     | Hero (fondo) |

### Prompts para generar SVGs de mayor calidad
Usar en otra sesión de Claude para reemplazar cada canvas:

**Cubo de Necker:** "SVG del Cubo de Necker (1832), perspectiva isométrica. Líneas en #00c9c0, fondo transparente, 300×300px. Sin relleno, solo bordes. Ambigüedad perceptual perfecta."

**Escalera de Penrose:** "SVG Penrose Stairs (1958), perspectiva isométrica. Gradiente #00c9c0 → #c9a84c, fondo transparente, 380×480px. Bucle imposible cerrado visible."

**Triángulo de Penrose:** "SVG Penrose Triangle (1954). Degradado #00c9c0 → #c9a84c, sólido y tridimensional pero imposible. Fondo transparente, 280×280px."

**Sierpinski:** "SVG Triángulo de Sierpinski nivel 6. Solo bordes en #00c9c0 con alpha 0.15, fondo transparente, 500×500px."
