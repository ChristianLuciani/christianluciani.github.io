# PLAN DE REFACTOR — desmonolitización y parametrización del CV

> **Estado:** plan aprobado para ejecutar en una ventana de contexto nueva.
> **Metodología:** spec-driven (dev-methodology). Este documento es la SPEC; el código la implementa.
> **Fecha:** 2026-08-10
> **Autor:** Christian Luciani (con asistencia de agente)

---

## 1. Objetivo

Rehacer la arquitectura del CV (hoy un único `index.html` de ~2.360 líneas con todo dentro:
CSS, HTML de salas, plano SVG, e scripts en línea) para que sea **mantenible, parametrizable
y evolucionable** hacia una experiencia de **museo 3D** a largo plazo. Sin cambiar el
contenido ni el comportamiento actual de lo ya publicado.

## 2. Diagnóstico del monolito (estado actual)

El contenido vive disperso y duplicado, lo que hace cada cambio costoso y frágil:

| Dato | Hoy (dónde está) | Problema |
|---|---|---|
| **Títulos de sala** | `<h2 class="room-title">` en cada `<section>` | Editar un título toca HTML + `ROOM_EN[]` (posicional) + a veces MAP. Riesgo de off-by-one. |
| **Numeración** | `.room-number` escrito a mano en cada sala | Renumerar obliga a tocar 7+ sitios (section, room-number, plano, navSections, README/ESTADO). |
| **Navegación lateral** | `.nav-dot` duplicados en `#nav` | Cada sala = 1 dot; olvidar uno rompe el índice (`navSections[]` posicional). |
| **Plano SVG** | coordenadas `x/y` manuales por sala | Añadir/quitar sala obliga a reposicionar manualmente. |
| **Subtítulos** | `.room-subtitle` en cada sala | Dispersos; no tienen contrapartida i18n centralizada. |
| **i18n** | diccionario `MAP` (186 llaves) + `ROOM_EN[]` posicional | Duplicación y riesgo de desalineación (ya hubo un off-by-one). |
| **Scripts** | 3 bloques `<script>` en línea (canvas illusiones, intro, i18n) | Difícil de testear; el de canvas es un monolito de ~16 KB. |

### Riesgos actuales confirmados (incluye uno crítico ya resuelto)
- **CRÍTICO (resuelto):** faltaba un `</script>` tras el bloque i18n; fusionaba dos scripts y rompía el parseo (`Unexpected token '<'`). El deploy funcionaba porque Vite no lo valida. **Volvería a ocurrir con cualquier edición descuidada de los bloques en línea.**
- **Off-by-one en `ROOM_EN[]`:** la sala Proyectos mostraba "Project Drahma" en inglés (ya corregido, pero la causa raíz persiste: array posicional).

---

## 3. Arquitectura objetivo

### 3.1 Parametrización — una sola fuente de verdad para las salas

Definir un objeto `SALAS` como **única fuente de verdad** de la estructura del museo:

```js
// src/cv/salas.ts  (o data/salas.ts en build)
export interface SalaDef {
  id: string;          // id del <section> (sin prefijo, p.ej. 'fisica')
  num: string;         // '01'..'07'
  titulo: string;      // título museístico (HTML con <em>)
  tituloEn: string;    // traducción EN
  subtitulo: string;   // lectura tradicional de CV
  subtituloEn: string;
  ilusion: string;     // id de canvas/ilusión
  navLabel: string;    // etiqueta del nav lateral
}

export const SALAS: SalaDef[] = [
  { id:'perfil',       num:'01', titulo:'El <em>Visitante</em>', en:'The <em>Visitor</em>', ... },
  { id:'proyectos',    num:'02', ... },
  { id:'experiencia',  num:'03', ... },
  { id:'galeria',      num:'04', ... },
  { id:'fisica',       num:'05', ... },
  { id:'competencias', num:'06', ... },
  { id:'contacto',     num:'07', ... },
];
```

**Desde `SALAS` se generan automáticamente** (render en tiempo de compilación con un
template, o en runtime por JS):
- `navSections[]` y los `.nav-dot` del nav lateral.
- `ROOM_EN[]` y las claves de título del `MAP`.
- El `.room-number` y `.room-subtitle` de cada sala.
- (Opcional, fase 2) el plano SVG, pero con coordenadas **calculadas** (eje X/Y por índice en grilla) en vez de a mano.

**Beneficio inmediato:** renombrar una sala, reordenar, o añadir/eliminar sala = **editar una
entrada de `SALAS`**, y todo lo demás (navegación, numeración, plano, i18n) se alinea solo.

### 3.2 Modularización — partir el monolito en archivos

Tras la parametrización (o en paralelo), dividir el `index.html` en fuentes ensamblables:

```
cv/
├── src/
│   ├── main.ts                     ← entry TS (ya existe, se migra)
│   ├── cv/
│   │   ├── salas.ts                ← SALAS (parametrización)
│   │   ├── render.ts               ← genera nav/plano/room-number/ROOM_EN desde SALAS
│   │   ├── i18n.ts                 ← diccionario MAP + toggle ES/EN
│   │   └── intro.ts                ← lógica de introducción (frase → nombre)
│   ├── ts/
│   │   ├── illusions/<ilusion>.ts  ← por ilusión (necker, stairs, penrose, sierpinski…)
│   │   └── fractals/<koch>.ts      ← fractal logo/loader
│   └── templates/
│       ├── head_html.ts            ← <head>, meta, JSON-LD, style global
│       ├── cover_html.ts           ← loader + intro + nav
│       ├── plano_html.ts           ← SVG del plano (generado desde SALAS)
│       └── sala_html.ts            ← template por sala (usa SALAS[id])
├── build.ts        ← ensambla templates + TS → index.html estático (desplegable)
├── public/
└── index.html [generated]          ← output ensamblable (NO se edita a mano)
```

**Regla:** el `index.html` desplegado pasa a ser **generado** (a partir de `src/`), no
editado a mano. Editar = tocar las fuentes en `src/` y reconstruir (`npm run build`).

### 3.3 (A largo plazo) Museo 3D

La parametrización de `SALAS` es el **prerrequisito** para la experiencia 3D: cada sala
tiene ya `id`, `num`, `titulo` y `ilusion`. El 3D real reutilizaría `SALAS` para crear los
espacios (Three.js / R3F), sin re-definir la estructura. **No se implementa en este refactor.**

---

## 4. Orden de ejecución recomendado

### FASE 1 — Parametrización (primero)
**Por qué primero:** es el cimiento; cualquier modularización posterior es trivial si la
estructura de salas ya vive en `SALAS`. Además ataca el riesgo crítico (scripts en línea +
off-by-one).

**Tareas:**
1. Crear `src/cv/salas.ts` con las 7 salas actuales (datos reales del HTML).
2. Crear `render.ts` que, dado `SALAS`, inyecte:
   - `.nav-dot` en `#nav`
   - `navSections[]`
   - `ROOM_EN[]`
   - `.room-number` + `.room-subtitle` por sala (por `id`)
   - Actualice MAP de títulos
3. Test de paridad: tras render, el DOM generado **debe ser idéntico** al HTML actual
   (comparar salida). Si difiere, es un bug del render, no del contenido.

**Criterio de salida (Definition of Done):**
- Renombrar una sala = tocar 1 archivo (`salas.ts`) y refleja en todo.
- Build + tests verdes. Browser check: nav, plano, títulos ES/EN correctos.

### FASE 2 — Modularización (segundo)
**Por qué segundo:** con `SALAS` existe la estructura; solo queda mover el HTML/CSS/JS a archivos
ensamblables.

**Tareas:**
1. Extraer `<style>` global → `src/templates/head_html.ts`.
2. Extraer cada `<section class="room">` → `sala_html.ts` parametrizado por `SALAS[id]`.
3. Extraer scripts en línea (ilusiones, intro, i18n) → módulos TS y/o archivos.
4. `build.ts` ensamble todo → `index.html` (misma salida que hoy, byte a byte salvo hashes).

**Criterio de salida:**
- El `index.html` es 100% generado; editar contenido = editar `src/` + rebuild.
- Ningún `<script>` en línea en el output; todo viene de bundles.
- Se elimina de raíz la clase de bug del `</script>` y el off-by-one.

---

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Refactor cambia contenido sin querer | **Test de paridad** (DOM generado == DOM actual). |
| Romper i18n | El `MAP`/`ROOM_EN` se generan desde `SALAS`; test ES/EN en browser. |
| Pérdida del flujo "single-index.html" | `build.ts` sigue produciendo UN `index.html` desplegable (GitHub Pages + Vite no cambian). |
| Plano SVG complejo de auto-generar | Fase 1 opcional: mantener coordenadas manuales pero leer nombres/números de `SALAS`. Evaluar generación por grilla en Fase 2. |
| Costo alto en una sesión | Hacer FASE 1 y FASE 2 en ventanas separadas si es necesario; FASE 1 ya deja valor solo. |

## 6. Verificación final

- `npm test` (vitest, 11 tests actuales + nuevos de `SALAS`/`render`).
- `npm run build` (Vite).
- Browser check (headless Chrome): intro, nav, plano, títulos ES/EN, QR en print-cv, sin errores de consola.

---

## 7. Notas de contexto para quien ejecute

- El nombre del paquete es `christianluciani-cv`; el repo es `ChristianLuciani/christianluciani.github.io`.
- El deploy es GitHub Actions → `dist/` → raíz `christianluciani.github.io`.
- No trabajar en `main`; usar worktree + rama `aionui/pi/<feature>`.
- El contenido actual de las salas ya está alineado (numeración 01–07, Drahma integrado en Proyectos, Contacto="Conectar").
