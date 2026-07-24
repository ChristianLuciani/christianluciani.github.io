# ESTADO — cv-cluciani

> Archivo de re-entrada rápida. Actualizar al final de cada sesión.
> Última actualización: 2026-07-24

## Desplegado en
https://christianluciani.github.io/cv-cluciani

---

## ✅ Completado

- Estructura de 8 salas con ilusiones ópticas por canvas
- Fractal Koch animado (3 copos anidados, rotación diferencial) → minimiza como logo
- Foto de perfil circular (enero 2023) con fallback automático
- Botón descarga CV + versión imprimible A4 (@media print)
- Logo Drahma desde repo público DRAHMAN-ORG
- Galería con placeholders en 3 sub-secciones (Drahma, Lab STEM, Ciencia pública)
- WhatsApp, LinkedIn, ResearchGate, X, Instagram
- Necker BG full-width en Sala 01
- Sala 03 Proyectos: CLAPPS.AI, NOOS, Kontablo, Drahma repo
- Manual de estilo embebido en comentario HTML
- Estructura modular: docs/CONTRIBUTING.md, docs/STYLE_GUIDE.md, build.sh, ESTADO.md

---

## 🔜 Backlog — ordenado por prioridad sugerida

### P1 — Fotos de galería (impacto alto, esfuerzo bajo)
Añadir imágenes reales a `assets/gallery/` y descomentar los `<img>` en cada `.gallery-slot`.
- Drahma en campo amazónico (3 slots)
- Lab STEM USFQ — impresora 3D, cortadora láser, materiales (4 slots)
- Casa Abierta USFQ / difractómetro de rayos X (2 slots)
**Acción:** sesión fotográfica o rescate de archivo. Sin código nuevo.

### P2 — Thumbnails de papers científicos
Mostrar la portada o figura principal de cada publicación junto al ítem en la lista.
Estrategia: captura de pantalla del abstract en el journal, guardar en `assets/images/papers/`.
En el `.pub-item` añadir `<img class="pub-thumb">` con CSS `width:60px;object-fit:cover`.
**Nota:** Wiley, Elsevier, MDPI permiten mostrar la portada del artículo con enlace al DOI.

### P3 — Links de ilusiones ópticas a página externa
Añadir en cada `.illusion-frame` un enlace discreto a Wikipedia u otra referencia.

Referencias sugeridas (mejor que Wikipedia para este contexto):
- Cubo de Necker → https://michaelbach.de/ot/sze-necker/
- Escalera de Penrose → https://michaelbach.de/ot/sze-penrose-stairs/
- Triángulo de Penrose → https://michaelbach.de/ot/sze-penrose-triangle/
- Serpientes Rotantes → https://michaelbach.de/ot/mot-rotSnakes/
- Sierpinski → https://en.wikipedia.org/wiki/Sierpiński_triangle
(michaelbach.de = recurso académico de referencia en ciencias visuales, U. de Freiburg)

Implementación: pequeño ícono "↗" en `.illusion-label`, abre en `_blank`.
Futuro: página dedicada a ilusiones ópticas bajo clapps.ai o dominio propio.

### P4 — Fractales en TypeScript con leyenda matemática
Generar los fractales del lado del cliente en TypeScript compilado.
Cada canvas muestra en el margen la ecuación generadora estilo `\mathcal{}` de LaTeX,
renderizada con MathJax o KaTeX (CDN, ~30KB gzip).

Fractales candidatos con sus ecuaciones:
- Koch snowflake: regla de subdivisión `f(z) = z/3, z/3 + e^{iπ/3}/3, ...`
- Mandelbrot: `z_{n+1} = z_n² + c`, colorear por velocidad de escape
- Julia sets: igual que Mandelbrot con c fijo, z variable
- Sierpinski: IFS (Iterated Function System) — 3 contracciones afines
- Barnsley fern: IFS con 4 transformaciones afines
- L-System Koch: `F → F+F--F+F` con ángulo 60°

Arquitectura sugerida:
```
src/ts/
  fractals/
    koch.ts       ← Koch snowflake + L-system
    mandelbrot.ts ← Mandelbrot + Julia
    ifs.ts        ← Sierpinski, Barnsley
    renderer.ts   ← Canvas renderer compartido
    equations.ts  ← Strings LaTeX por fractal
  index.ts        ← Entry point, carga por sala
```
Build: `tsc` o `esbuild` → `src/js/fractals.bundle.js` → importado en index.html.
**Prerrequisito:** decidir si mantener single-file o separar JS. Abrir issue.

### P5 — Galería 3D con parallax en scroll / mouse
Sala de galería con planos a diferentes profundidades (eje Z).
- `z = 0`: plano principal (fotos grandes, primer plano)
- `z > 0`: planos de fondo (fotos más pequeñas, desplazadas con el mouse)
- Interacción: `mousemove` → `translateZ` leve en cada plano (efecto magnético)
- `hold scroll` o `Alt + scroll` → acercar el plano z>0 hacia z=0

Implementación: CSS `perspective` + `transform: translateZ()` por capa.
JS: escuchar `mousemove` y mapear posición a `rotateX/Y` en el contenedor.
Canvas de fondo por plano con textura sutil.
**Esfuerzo:** M-L. Abrir issue dedicado.

### P6 — Multilingüe ES / EN / FR
**Criterio:** vale la pena a medias. Los navegadores traducen bien el texto plano,
pero NO traducen: metadatos OG/Twitter, PDF descargable, labels de canvas,
tooltips de ilusiones, ni el CV imprimible.
Lo que sí tiene sentido implementar manualmente:
- `lang` toggle (botón ES/EN/FR en la nav)
- Objeto `i18n` en JS con strings por idioma para títulos, labels y sala-subtítulos
- `<html lang="es">` dinámico
- CV imprimible en 3 idiomas (3 secciones `#print-cv-es`, `#print-cv-en`, `#print-cv-fr`)
Lo que puede dejarse al navegador: cuerpo de texto largo, publicaciones.
**Esfuerzo:** M. Francés requiere revisión nativa.

---

## 💡 Ideas futuras (sin fecha)

- SVGs de alta calidad para ilusiones (prompts en docs/STYLE_GUIDE.md)
- Variante CV para ERP/Zoho consulting
- Variante CV académica con publicaciones expandidas
- Página dedicada a ilusiones ópticas (dominio propio o subdominio)
- Revisión de repos GitHub y actualización de Sala 03 con info real

---

## Notas técnicas

- Single HTML file · sin build step obligatorio para editar contenido
- GitHub Pages: push a `main` → deploy automático ~1 min
- Fractal: 3 copos Koch anidados rotando a velocidades distintas
  (`fractalAngle`, `-fractalAngle*1.3`, `fractalAngle*2`)
- Foto: URL Google Photos con onerror fallback →
  si expira, colocar `assets/images/christian-luciani.jpg`
- Ramas: `claude/[tema]` para Claude, `cursor/[tema]` para Cursor
- 2026-07-24: Añadida contribución OSS pi-acp (svkozak/pi-acp#76) — implementación session/delete para protocolo ACP — en sección Open Source de Sala 07 Competencias
