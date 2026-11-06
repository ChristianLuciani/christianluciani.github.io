# Epic — Temas: contenido intacto, N narrativas y N pieles

> Plan ejecutable de la FASE 5 (`docs/SPEC.md` §8) y de ADR-001. Cada sub-issue es un PR
> propio con gates propios; el epic no cierra hasta S9.

## Cuerpo del epic

**Qué:** separar el sitio en cuatro dimensiones — hechos · curación · narrativa · piel — y
publicar N temas por subpath con un selector único de build (`SITE_THEME`), de modo que
cambiar de audiencia no toque contenido.

**Por qué:** el sitio fue diseñado como museo de ilusiones ópticas y el mismo contenido debe
presentarse a un equipo de ingeniería sin reescribirlo. Hoy el 69% del texto visible vive a
mano en templates, el i18n keyea por string exacto del DOM (240 claves, 20 huérfanas) y la
paridad se verifica contra un único `index.html`.

**Invariante del epic:** en cada PR, el tema default (`museo`) publica **byte-idéntico**
(golden). Sólo S5 (selector) y S8/S9 (tema nuevo) añaden artefactos; ninguno modifica el
render del default.

**No-goals:** no se borra contenido; no se inventan hechos; no hay conmutador de tema en
runtime en producción; no se editan ilusiones (`src/ts/illusions/**`); no hay un tema por
repo ni subdominio.

**Definition of done del epic:**
- `SITE_THEME=museo npm run build` → idéntico a hoy; `SITE_THEME=ingenieria npm run build`
  → `/ingenieria/` con contenido del SSOT, narrativa y piel propias.
- El piloto S9 reordena/oculta/cura **sin** tocar código compartido.
- `themes:check` + `themes:assets` + golden por tema verdes en CI.
- `docs/CREAR-TEMA.md` ejecutable por un agente sin preguntas.

**Impact:** `#99` (Fase 2: consumir el perfil) queda absorbido por S1–S2; `#110` (gate de
sync en CI) se integra en S7.

**Coste total:** 20–31 días de sesión. Ruta crítica: S0 → S1 → S3 → S5.

| # | Issue | Depende | Coste |
|---|---|---|---|
| S0 | Golden por tema + higiene del runner | — | 1 d |
| S1 | Copy fuera de templates (narrativa default) | S0 | 3–5 d |
| S2 | Curación explícita (`include`/`exclude`/`order`) | S1 | 1–2 d |
| S3 | Registro de narrativas + `SITE_THEME` | S1, S2 | 2–3 d |
| S4 | Piel extraída: tokens y 0 literales | S1 | 2–3 d |
| S5 | Selector de build + subpath + meta/SEO | S3, S4 | 2–3 d |
| S6 | Ratificación de norma (ADR-001 + SPEC v0.2 + playbook) — **ratificada 2026-11-06** (#132) | — | 1 d |
| S7 | Gates de CI multi-tema | S5 | 1–2 d |
| S8 | Piloto mínimo: `themes/ingenieria` (mismas 8 salas) | S5, S7 | 3–4 d |
| S9 | Control total: reordenar/agrupar/curar | S8 | 2–3 d |
| S10 | Segunda piel sobre el mismo tema (opcional) | S5 | 0,5–1 d |

---

## S0 — Golden por tema + higiene del runner

**Objetivo:** instrumento que hace verificable "el render no cambió".

**Entregable**
- `tests/golden/museo.html` (salida de `assembleHtml()` del tema default) + snapshot por
  sección (hero, plano, cada sala, print-CV) para localizar el diff.
- `vite.config.ts`: excluir `.worktrees/**` del runner (hoy: 130 fallos falsos porque vitest
  recorre 15 worktrees).
- `tests/golden/README.md`: cómo se regenera un golden — **sólo** en el PR que cambia el
  render a propósito, nunca en el que refactoriza.

**DoD:** `npm test` verde y estable; `npm test` desde la raíz no contamina; el golden falla
si se toca un espacio del HTML generado.

**No toca:** `src/**`, `index.html`, deploy.

---

## S1 — Copy fuera de templates (narrativa default)

**Objetivo:** que ningún texto visible viva en un template.

**Entregable**
- `src/themes/museo/copy.ts` con claves semánticas (`room.<id>.title|subtitle|function`,
  `hero.tagline`, `cover.*`, `intro.*`, `graph.*`, `print.*`) y ES+EN completos.
- Templates de copy (`sala_html`, `intro`, `cover`, `hero`, `grafo`, `i18n`) consumen claves.
- Walker i18n: deja de keyear por string del DOM; el texto sale del pack ya traducido.

**DoD**
- Golden `museo` byte a byte **sin cambios** (I1).
- 0 claves huérfanas (hoy 20/240); 0 strings visibles en `src/templates/**`.
- Test que falla si un template contiene texto literal > 2 palabras fuera de una clave.

**No toca:** hechos, CSS, estructura de salas, deploy.

---

## S2 — Curación explícita

**Objetivo:** representar "qué se presenta y qué no" sin borrar nada.

**Entregable**
- `src/content/curation/museo.ts` (`include`/`exclude` con `reason`/`order`) que reproduce
  la curación actual (El Marco/Bastidor, orden de proyectos, publicaciones, galería oculta).
- `tools/curation.ts --report`: todo hecho del perfil con decisión; `exclude` sin `reason`
  = error.
- Test de cobertura (I3).

**DoD:** golden intacto; el reporte lista 100% de hechos con decisión; mover el orden de un
proyecto cambia sólo `curation/museo.ts`.

**No toca:** hechos, copy, CSS.

---

## S3 — Registro de narrativas + `SITE_THEME`

**Objetivo:** que la narrativa sea datos con contrato, no templates.

**Entregable**
- `src/themes/index.ts` (`THEMES`, `DEFAULT_THEME`, resolución de `SITE_THEME`).
- `NarrativeManifest` (`rooms`, `copy`, `illusions`, `meta`, `path`) en `src/themes/types.ts`.
- `themes/museo/narrative.ts` derivado de `SALAS` + `copy.ts` + `illusions.ts`.
- `assembleHtml({ theme })` recibe el tema; ningún template conoce el id.

**DoD:** `SITE_THEME=museo` reproduce el HTML actual byte a byte; `SITE_THEME=noexiste`
falla con la lista de temas válidos.

**No toca:** CSS, deploy, hechos.

---

## S4 — Piel extraída: tokens y 0 literales

**Objetivo:** que una piel sea un archivo, no un fork del CSS.

**Entregable**
- `src/themes/museo/skin.css` con tokens + reglas (extraído de `head_html.ts`).
- 74 literales de color → tokens con alpha (`--teal-04`, `--teal-12`, … o `color-mix`).
- Contraste declarado por par texto/fondo + chequeo AA.

**DoD:** CSS emitido byte-idéntico; 0 literales fuera del bloque de tokens; AA pasa.

**No toca:** copy, estructura, deploy.

---

## S5 — Selector de build + subpath + meta/SEO

**Objetivo:** publicar N temas en un solo artefacto, con URLs estables.

**Entregable**
- `SITE_THEME` + `SITE_BASE`/`SITE_ORIGIN` por tema; `build.ts` acepta tema y escribe
  `dist/<path>/index.html`.
- Las 26 rutas `/assets/**` y las 7 referencias de origen pasan por `SITE_BASE`/`SITE_ORIGIN`.
- `title`/`description`/`og:*`/`twitter:*`/`canonical`/`og:url` desde `narrative.meta`.
- `robots.txt` + `sitemap.xml` con todas las URLs publicadas.
- `npm run build:all`; smoke `themes:assets` (toda URL referenciada existe en `dist/`).

**DoD:** raíz byte-idéntica; `/ingenieria/` (aún sin tema real) resuelve; ningún asset 404
en ningún tema; `sitemap` lista raíz + subpaths.

**No toca:** hechos, copy del museo.

---

## S6 — Ratificación de norma

**Objetivo:** que la norma exista donde el agente la busca antes de tocar código.

**Entregable:** `docs/adr/ADR-001-temas-y-narrativas.md` (accepted), `docs/SPEC.md` v0.2
(§3, §4, §5.3–§5.6, §6 D2/D3/D8–D12, §8 FASE 5, §9–§11), `docs/CREAR-TEMA.md`, este epic.

**DoD:** premerge-review fresca (es norma, session-discipline §3b) con veredicto publicado
en el PR del cambio —o excepción declarada cuando la norma ya está en `main`—; el operador
ratifica y la traza de la ratificación se registra en #132. **Entregado por el PR del
epic**; el seguimiento continúa en #132.

---

## S7 — Gates de CI multi-tema

**Objetivo:** que un tema roto no llegue a `main`.

**Entregable:** job que corre `build:all` + gate de render por tema + `themes:check`
(completitud ES/EN, curación, literales, contraste) + `themes:assets`. Absorbe `#110`
(sync gate).

**DoD:** un literal de color nuevo, una clave sin EN o un asset faltante ponen el PR rojo
con mensaje accionable.

**No toca:** código de render.

---

## S8 — Piloto mínimo: `themes/ingenieria`

**Objetivo:** validar la plomería con el caso barato (mismas 8 salas, otra voz y piel).

**Entregable:** `src/themes/ingenieria/` (narrative, copy ES/EN, skin, illusions, meta) +
una línea en `themes/index.ts`; `curation/ingenieria.ts` (mismo conjunto, sin exclusiones
todavía). Se publica en `/ingenieria/`.

**DoD:** build y deploy de `/ingenieria/`; golden `museo` intacto; **0 cambios** fuera del
directorio del tema + registro; checklist de `docs/CREAR-TEMA.md` completo.

**No toca:** `src/data/**`, `src/content/curation/museo.ts`, renderers, `src/ts/**`.

---

## S9 — Control total: reordenar/agrupar/curar

**Objetivo:** probar el contrato completo (la promesa de "máxima flexibilidad").

**Entregable (segundo PR del piloto):** reordenar salas, agrupar dos salas en una,
ocultar una, renombrar metáforas, excluir 1–2 ítems con `reason`, cambiar el plano.

**DoD:** todo el cambio cabe en `themes/ingenieria/**` + `curation/ingenieria.ts`;
si algo exige tocar código compartido ⇒ **bug de contrato**: se corrige el contrato en este
mismo PR y se documenta en ADR-001 (no se parchea lateralmente).

---

## S10 — Segunda piel sobre el mismo tema (opcional)

**Objetivo:** probar que piel y narrativa son ejes independientes.

**Entregable:** `themes/ingenieria-claro/` o `skinAlt` dentro de `ingenieria`, con la misma
narrativa y otra paleta/densidad.

**DoD:** sólo cambia `skin.css` (+ registro); copy y curación se reusan sin duplicar.
