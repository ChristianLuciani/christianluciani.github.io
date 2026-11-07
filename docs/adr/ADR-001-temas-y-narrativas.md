---
id: ADR-001
status: accepted
date: 2026-11-05
domain: [narrativas, pieles, temas, deploy, contenido, curacion]
decided_by: operador (sesión dsh/norma/temas-narrativas)
---

# ADR-001 — Cuatro dimensiones: hechos · curación · narrativa · piel

**Alcance declarado:** `Cubre: el modelo de contenido y presentación del sitio, el contrato de un tema y la topología de publicación de N temas · No cubre: hechos del perfil (viven en profile-data, SPEC §5.1), diseño de las ilusiones (src/ts/illusions), 3D, i18n de terceros · as_of: 2026-11-05`

**Ratificación:** operador, 2026-11-06 (issue #132) — ratifica el contenido de PR #121
(merge commit `e60d5e4`) sobre `main` al 2026-11-06 (`cd4c8b8`), incluida `docs/SPEC.md`
v0.2 (FASE 5); `docs/CREAR-TEMA.md` queda como contrato operativo. La decisión de este ADR
no cambia (`status: accepted`).

**Enmienda 2026-11-07 (PR #156), ratificada por el operador el 2026-11-07** (traza: issues
#128 y #131): `Curation` incorpora `experienceSections` (el print-CV compartido clasifica con
la curación de SU tema, ADR-001 §1–§2); y la publicación de N temas usa **un** bundle y
**una** raíz de assets con dirección **por tema** (`narrative.site`), en lugar de N
invocaciones de Vite con N copias de assets. Reemplaza las cláusulas de §Consecuencias que
decían lo contrario; además ajusta §Decisión 4 y §Contratos. El resto del ADR no cambia.

## Contexto

El sitio fue diseñado como **museo de ilusiones ópticas** (`docs/SPEC.md`, `SALAS`). El
mismo contenido factual sirve a otras audiencias (equipo de ingeniería, reclutador,
prensa), pero la estética museográfica y el vocabulario de sala lo vuelven confuso para
ellas. El pedido del operador es: **cambiar estética y narrativa sin tocar el contenido**,
con curación explícita de qué se presenta y sin borrar nada.

Medición del estado (2026-11-03, script sobre `assembleHtml()`):

| Superficie | Medida |
|---|---|
| Texto visible total | 24.832 chars |
| Derivado del SSOT (`print-CV`) | 7.614 chars (31%) |
| Copy escrito a mano en templates | 17.218 chars (69%) |
| Hechos del perfil re-escritos a mano (fuera del print) | 22 de 107 |
| Diccionario i18n | 240 claves por string exacto del DOM; 20 huérfanas |
| CSS | 338 bloques, 1225 declaraciones, 232 `var()`, 74 literales de color |
| Ilusiones | asignadas por id de canvas dentro de cada cuerpo de sala |

`docs/SPEC.md` ya resolvió la frontera **hechos ↔ curación** (D1, D2) y la estructura
paramétrica (`SALAS`), pero está dimensionada para **una sola narrativa**: nombra la
curación `museo.ts`, ata la curación a "ESTE museo con UN consumidor", no declara
variantes de build y su gate de paridad compara **un** `index.html`.

## Decisión

El sitio se modela en **cuatro dimensiones** con un solo selector:

```
HECHOS      profile.generated.ts      (SSOT; ningún tema los muta)
CURACIÓN    content/curation/<id>      (qué se presenta, orden, exclusiones con razón)
NARRATIVA   themes/<id>/narrative.ts   (voz, salas, labels, ilusiones, metadata)
PIEL        themes/<id>/skin.css       (tokens + reglas)
                        │
                SITE_THEME=<id>        (selector único, default "museo")
                        ▼
              dist/<ruta-del-tema>/index.html
```

1. **Un tema = un directorio.** `src/themes/<id>/` con `narrative.ts`, `copy.ts`,
   `skin.css`, `illusions.ts`, más una línea de registro en `src/themes/index.ts`.
2. **Selector único de build:** `SITE_THEME`; default `museo`, que publica en la raíz.
   Ningún template conoce el id del tema; prohibido hardcodearlo fuera del registro.
3. **Narrativa ≠ piel.** La narrativa posee estructura, voz y curación; la piel posee
   tokens, tipografía y densidad. Un tema puede cambiar una sin la otra.
4. **Topología: subpath** (`/ingenieria/`, `/museo/`), un solo sitio Pages y un solo
   artefacto de deploy con **una página por tema** (un bundle y una raíz de assets). Se
   rechaza el subdominio (ver alternativas); un tema que necesite otro `base` se publica en
   un build propio, no en el mismo artefacto.
5. **Claves semánticas, no strings exactos.** `room.<id>.title|subtitle|function`,
   `hero.tagline`, `cover.*`. El diccionario i18n deja de keyear por texto del DOM.
6. **Curación explícita.** `include` / `exclude` por id estable; excluir **no borra** y
   exige `reason`. Gate: todo hecho del perfil tiene decisión declarada.
7. **La ilusión pertenece a la piel/narrativa.** `SALAS.ilusion` deja de ser estructura;
   el tema asigna ilusiones por sala. Modificar `src/ts/illusions/**` sigue prohibido.
8. **Sin conmutador en runtime en producción.** El "switch" es la URL. `?theme=` sólo
   como preview de desarrollo.

### Contratos

```ts
// src/themes/index.ts — registro único
export interface Theme {
  id: string;                    // slug estable, [a-z0-9-]
  path: string;                  // subpath de publicación ("" = raíz)
  label: string;                 // nombre visible en tooling
  narrative: NarrativeManifest;
  skin: SkinManifest;
}

// narrative.ts
export interface NarrativeManifest {
  id: string;                    // slug estable [a-z0-9-], clave del registro
  path: string;                  // subpath de publicación ("" = raíz)
  rooms: RoomRef[];              // orden, ids y metáfora; pueden reusar o subconjunto de SALAS
  copy: CopyPack;                // claves semánticas ES/EN (todas obligatorias)
  illusions: Record<string, string>;  // roomId → canvas id de src/ts/illusions
  meta: { title: string; description: string; ogImage: string };
  site: { origin: string; base: string };  // dirección de publicación (SPEC §5.4/§8 5.5)
}

// content/curation/<id>.ts
export interface Curation {
  include: string[];             // project/publication/experience ids del SSOT
  exclude: { id: string; reason: string }[];
  order?: Record<string, string[]>;
  experienceSections?: Record<string, "professional" | "training">;  // clave de fila → sección del print-CV (obligatorio en la práctica: el print falla si una fila no está clasificada)
}

// skin.css — sólo tokens y reglas; sin literales de color
```

### Invariantes (verificables, no aspiracionales)

| # | Invariante | Instrumento |
|---|---|---|
| I1 | El tema default produce HTML byte-idéntico antes/después de cada refactor | golden por tema (S0) |
| I2 | Un tema no muta ni inventa hechos | test de imports + revisión: `themes/**` sólo importa tipos |
| I3 | Todo hecho tiene decisión de curación | `curation --report` + test de cobertura |
| I4 | Toda clave de copy tiene ES y EN | test de completitud del pack |
| I5 | Ningún template contiene copy ni literales de color | lint de templates (S7) |
| I6 | Toda URL de tema existe en `dist/` con sus assets | smoke de assets por tema (S5) |

## Alternativas consideradas

| Alternativa | Veredicto | Razón |
|---|---|---|
| **Subdominio por audiencia** | rechazada | GitHub Pages da **un sitio por repo**: un subdominio nuevo exige otro sitio (otro repo) o un proxy. Implica 2 pipelines, 2 secretos/deploy keys, 2 rollbacks y duplicación o publicación cruzada de artefactos |
| **Repo por audiencia** | rechazada | Duplica el render: rompe la fuente única y multiplica el mantenimiento |
| **Conmutador runtime (`?theme=`)** | rechazada en prod | Peso de N pieles en un documento, flash de tema, canonical ambiguo, SEO confuso |
| **Un solo tema con secciones "modo ingeniería"** | rechazada | Mezcla dos voces en un documento y no escala a N |
| **Mantener un tema y editar el copy** | rechazada | Obliga a reescribir el contenido por audiencia y destruye el museo |

## Consecuencias

- **Build:** un artefacto de deploy con N directorios de página sobre **un** bundle y **una**
  raíz de assets. El `path` del tema mueve su página y su canónica, no duplica assets. La
  dirección (`origin`/`base`) se declara **por tema** en `narrative.site` y se puede
  overridear al construir con `SITE_ORIGIN`/`SITE_BASE`; todos los temas de un mismo
  artefacto comparten `base` (el build falla ruidoso si dos temas del mismo artefacto
  declaran prefijos distintos) y un tema con otro prefijo se publica en un build propio
  (`SITE_THEME=<id>`). El tema default no cambia de URL.
- **CI:** paridad por tema + smoke de assets + completitud i18n + contraste. El gate deja
  de comparar "el" `index.html` y pasa a comparar "el golden de cada tema".
- **SEO:** mismo origen ⇒ autoridad compartida. Cada tema declara `title`, `description` y
  JSON-LD propios; el publicador produce `canonical`, `og:url` y `og:image` desde `site` +
  `path`, y `sitemap.xml` lista todas las URLs.
- **Mantenimiento:** un repo, un pipeline, un set de tests. Cada tema nuevo es un
  directorio + una línea de registro.
- **Migración futura a subdominio:** es configuración (`site.origin` del tema +
  `SITE_ORIGIN`) + infraestructura, **no** un refactor del modelo.
- **Riesgo aceptado:** el bundle y `public/` se publican **una vez** en la raíz del
  artefacto (no hay copia por tema): el peso no se multiplica, pero un tema no puede
  aislar sus assets del resto del artefacto.

## Referencias

- `docs/SPEC.md` §3, §4, §5.3–§5.6, §6 (D2, D8–D12), §8 (FASE 5), §10
- `docs/CREAR-TEMA.md` — procedimiento para un agente que crea un tema
- `docs/epics/temas-narrativas.md` — epic y sub-issues del plan
