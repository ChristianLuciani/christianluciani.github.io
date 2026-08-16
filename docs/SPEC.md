# SPEC — Separación contenido/presentación + dependencia de profile-data

> Status: draft v0.1 (pendiente de aprobación del operador) · Method: spec-driven (dev-methodology)
> Owner: Christian Luciani · Repo: `christianluciani/cv-cluciani` · Branch: `aionui/pi/cv-profile-data`
> Fecha: 2026-08-15 · Relacionado: profile-as-code `docs/SPEC.md` (§9.1 deploy surfaces, §15.6 v1.1), komuno manifiesto (IX–XI), AGOS (proyección read-only)

---

## 1. Contexto

El CV (`christianluciani.github.io`) es hoy un sitio 100% generado (Fase 2 de
`docs/REFACTOR_PLAN.md`): `index.html` = `assembleHtml()` desde `src/templates/` + `SALAS`.
Ese refactor parametrizó la **estructura** (salas, nav, numeración, i18n estructural) pero el
**contenido factual sigue embebido en la capa de presentación**, disperso y duplicado:

| Archivo | Contenido factual hoy |
|---|---|
| `src/templates/sala_html.ts` (`ROOM_BODY`) | perfil, proyectos, experiencia, publicaciones, competencias — mezclado con `data-scroll`, estilos inline, canvases |
| `src/cv/i18n.ts` | diccionario ES→EN de **182 claves** escrito a mano |
| `src/templates/print_cv_html.ts` | CV imprimible: **duplica** perfil, experiencia, formación, publicaciones, competencias |
| `src/templates/head_html.ts` | **duplica** persona/links (JSON-LD Person) + publicaciones (JSON-LD ScholarlyArticle) |
| `src/templates/hero_html.ts` | nombre + tagline hardcodeados |
| `src/cv/intro.ts` | frases del intro hardcodeadas |
| `src/ts/graph/grafo.ts` | nodos de la constelación hardcodeados |

Mientras tanto, el ecosistema `profile-*` ya definió el **SSOT** de esos mismos hechos:

- `profile-as-code` — el motor: contrato `schema/profile.schema.json` v1, `packages/core`
  (load/validate · driftCheck · geoCheck · compile), SPEC §9.1 clasifica el sitio CV como
  **deploy surface** (*rendered output, never edited by hand*) y el roadmap **M5** es
  literalmente "web renderer — cv-cluciani consumes generated profiles".
- `profile-data` (privado) — workspace real con `content/*.yaml`: `identity`, `positioning`,
  `bios`, `headlines`, `skills`, `experience`, `projects`, `publications`, `keywords`.
  Extraído del CV el 2026-08-10 y **nunca re-consumido** por el CV.
- `komuno` (manifiesto) — IX *proyección sobre duplicación*, XI *parametrización y reducción
  de superficie*: la fuente se edita una vez; lo derivado es read-only con header
  AUTO-GENERATED. Duplicar lógica/datos en dos repos es "la forma silenciosa del monolito".

**La deriva ya se materializó** (evidencia de que el duplicado está roto):
- `positioning.statement.en` en YAML ≠ traducción EN del MAP del CV
  ("20+ years navigating" vs "over 20 years navigating between").
- "36 guías de laboratorio" vive como publicación en la sala del CV y como **proyecto**
  (`Physics Lab Book`) en `projects.yaml`.
- `experience.yaml` tiene `role`/`org` solo en EN; el CV renderiza ES — el SSOT no puede
  servir al CV sin completar el idioma.
- `publications.yaml` no puede representar outputs sin DOI (abstract AIChE, preprint RG,
  guías) — limitación ya documentada como propuesta v1.1 (SPEC §15.6).

---

## 2. Goals / Non-goals

### Goals

1. **Separación total contenido/presentación**: los hechos viven en `profile-data` (SSOT);
   cv-cluciani queda como capa de **presentación + curación museográfica**.
2. **Dependencia de datos (D1)**: el CV consume `profile-data` como dependencia via archivo
   **generado + commiteado** (`src/data/profile.generated.ts`, header AUTO-GENERATED, jamás
   editado a mano) — mismo patrón que `index.html` hoy (D14 de profile-as-code: integración
   por path configurado).
3. **Reducción de superficie**: 182 claves de MAP manual → diccionario generado desde
   langMaps YAML + diccionario UI pequeño. Publicaciones: 3 copias → 1. Experiencia/skills:
   2 copias → 1.
4. **Consistencia cross-surface (GEO)**: JSON-LD, print-CV y salas derivan del mismo perfil;
   un LLM que cruce CV vs GitHub vs LinkedIn encuentra los mismos hechos byte-consistentes.
5. **Drift gate por CI**: deriva entre `profile.generated.ts` commiteado y el output del
   sync = CI rojo (mismo contrato que `build.test.ts`).

### Non-goals (v1)

- No refactorizar ilusiones/UI (se mantienen tal cual; solo se re-enganchan a datos).
- No implementar el museo 3D.
- No promover el renderer web a profile-as-code (M5) en este refactor — queda documentado
  como camino futuro (D4: se promueve después).
- No resolver la visibilidad del repo (sigue siendo público como deploy surface).
- No editar a mano `profile-data` desde este repo (la fuente se edita en su repo, aquí solo
  se lee en build local).

---

## 3. Arquitectura objetivo

```
profile-data (PRIVADO · SSOT factual — se edita SOLO ahí)
  content/*.yaml  (identity, positioning, headlines, bios, experience,
                   projects, publications, skills, keywords)
        │  tools/sync-profile.ts  (build local / agente; lee PROFILE_DATA_PATH — D14)
        │  → valida contra schema/profile.schema.json → normaliza → emite
        ▼
cv-cluciani (PÚBLICO · deploy surface)
  src/data/profile.generated.ts    ← AUTO-GENERATED (commiteado; D1). Jamás a mano.
  src/content/cv/*.ts              ← CAPA DE CURACIÓN (D2): textos museográficos que NO
                                     son hechos — títulos, quotes, showcase, frases intro,
                                     grafo, galería. Editables por humano, tipados.
  src/presentation/*               ← templates (head CSS, cover, hero shell, sala shell,
                                     plano, print) — reciben {data}, no contienen hechos.
  src/cv/i18n.ts                   ← MAP GENERADO (langMaps YAML + curación) + diccionario
                                     UI pequeño manual (~30 claves) (D3).
  index.html                       ← generado (sin cambio de contrato).
```

**Regla de oro (komuno IX):** un hecho se edita UNA vez en `profile-data`; el CV deriva.
Un texto de curación se edita UNA vez en `src/content/cv/`; los templates lo renderizan.
Si un valor tiene que cambiar en dos archivos para mantenerse coherente → es un bug de
arquitectura (duplicación), no una tarea.

---

## 4. Frontera contenido/presentación (tabla canónica)

| Dato | Vive en | Tipo |
|---|---|---|
| nombre, ubicación, foto, links canónicos, ORCID | `profile-data/identity.yaml` | hecho |
| statement, ángulos por audiencia, anclas GEO | `profile-data/positioning.yaml` | hecho |
| headlines por plataforma | `profile-data/headlines.yaml` | hecho |
| experiencia (rol, org, fechas, highlights) | `profile-data/experience.yaml` | hecho |
| proyectos (name, status, description, links, evidence) | `profile-data/projects.yaml` | hecho |
| publicaciones (title, venue, year, doi, url) | `profile-data/publications.yaml` | hecho |
| skills + idiomas | `profile-data/skills.yaml` (+ `languages` v1.1) | hecho |
| keywords SEO/GEO | `profile-data/keywords.yaml` | hecho |
| títulos museísticos ("El Visitante") | `src/content/cv/museo.ts` | curación |
| subtítulos de sala (parametrizados con `{location}` del SSOT) | `src/content/cv/museo.ts` | curación + hecho |
| estructura de salas (ids, ilusiones, nav/plano labels) | `src/content/cv/salas.ts` (ex `src/cv/salas.ts`) | presentación |
| quote-block ("La física me enseñó…") | `src/content/cv/museo.ts` | curación |
| showcase Drahma (celdas, timeline, lab STEM) | `src/content/cv/drahma.ts` | curación (hechos referencian `projects.yaml` por id) |
| frases del intro | `src/content/cv/museo.ts` | curación |
| grafo constelación (nodos/aristas) | `src/content/cv/constelacion.ts` | curación (ref. `projects` SSOT) |
| galería placeholders | `src/content/cv/galeria.ts` | curación |
| CSS, ilusiones, animaciones, canvas | `src/presentation/` + `src/ts/` | presentación |

**Reglas de reconciliación (deriva conocida, resuelta en el normalizador):**
- "36 guías de laboratorio" = **proyecto** `Physics Lab Book` en el SSOT → la sala Biblioteca
  renderiza una entrada institucional con link al repo, **no** una publication.
- Publications sin DOI (abstract AIChE, preprint RG) → el contrato v1.1 les da `url` (Fase 1.5).
- `experience[].role/org` → langMap `{en, es}` (v1.1): el CV renderiza ES desde el SSOT.

---

## 5. Contrato de datos — la proyección (interfaces)

### 5.1 `tools/sync-profile.ts` (pipeline de dependencia)

```
sync-profile [--path <workspace>] [--out <file>] [--report]
  1. read  workspace (por defecto: $PROFILE_DATA_PATH del entorno; .env / .pacrc)
  2. merge content/*.yaml → un solo Profile
  3. validate contra schema/profile.schema.json (JSON Schema — D3 de profile-as-code;
     violación de schema = FAIL; drift/geo = warn en --report)
  4. normalize → CV data model (sección 5.2)
  5. emit  src/data/profile.generated.ts con header AUTO-GENERATED + metadata de
     procedencia (repo, commit, fecha) — GEO/auditabilidad
  6. --report: lista hechos sin traducción ES, urls fuera de identity.links, etc.
```

Puro, determinista, sin red: mismo input → mismo output byte a byte (komuno VI/X).

### 5.2 Shape de `profile.generated.ts` (normalizado, NO espejo del schema)

```ts
export const PROFILE = {
  identity: { name, givenName, familyName, location, photo, links: Link[] },
  positioning: { statement: LangText, audiences: Record<string, LangText>, geo },
  headlines: Headline[],
  experience: Experience[],   // role/org: LangText; highlights: { en: string[]; es: string[] }
                              // (bullets; normaliza string v1 "·"-separado → array v1.1)
  education: Education[],     // entrada deducida: experience[] con role=título (v1 legacy)
                              // o education[] explícito (v1.1) — el normalizador unifica
  projects: Project[],        // con evidence[]; id estable para referencias desde curación
  publications: Publication[],// con url (v1.1); DOI/ORCID resolubles (ancla GEO)
  skills: Skill[],            // + languages: [{ code, level }] (v1.1)
  keywords: { seo, geo },
  source: { repo, commit, syncedAt }   // procedencia (GEO + auditoría)
} as const;
```

### 5.3 Capa de curación (`src/content/cv/`) — el único otro lugar editable por humano

Tipada (TS), sin hechos. Referencia entidades del SSOT por **id estable** (p.ej.
`drahma.ts` referencia `projects` con name "Drahma — Educational Synthetic Intelligence").
`museo.ts` exporta títulos/subtítulos/quotes/frases con `{en, es}` para alimentar el MAP.

---

## 6. Decisiones (ADR-lite)

| # | Decisión | Racional |
|---|---|---|
| D1 | **Archivo generado + commiteado** en cv-cluciani (`src/data/profile.generated.ts`) | Mismo patrón que `index.html` (build.test.ts): CI solo verifica paridad; la generación es local/agente; cero credenciales de repo privado en CI. Contrato enforced por test. |
| D2 | **Curación museográfica en cv-cluciani** (`src/content/cv/*.ts`), no en profile-data | Son textos de ESTE museo con UN consumidor; no son hechos ni plataforma-cross. Meterlos en el schema contaminaría el contrato concreta de una superficie. |
| D3 | **MAP generado** en build desde langMaps YAML + curación; queda diccionario UI pequeño manual | Elimina la clase de bug "edité ES y olvidé EN" (causa histórica de deriva). El walker runtime no cambia. |
| D4 | **print-CV = renderer determinista** dentro de cv-cluciani, consumiendo `profile.generated.ts` | Deploy surface sin API; promovible a renderer `print` de profile-as-code después (M5+, queda anotado). |
| D5 | **Extensión del contrato como profile-as-code** (schema v1.1, spec-first en profile-as-code, NO ad-hoc en el CV) | El contrato de datos es del motor: `highlights → array`, `role/org → langMap`, `publications.url`, `languages`, `education`. El CV normaliza ambos shapes (v1 legacy + v1.1) para no bloquear el refactor. |
| D6 | Integración por **path configurado** (`PROFILE_DATA_PATH` en `.env`/`.pacrc`, `.env` gitignored) | D14 de profile-as-code: sin symlink en el flujo normal; parametrización komuno XI. |
| D7 | El sync **valida contra el schema del motor** (fail on schema, warn on drift — D12 profile-as-code) | Integridad del contrato sin romper flexibilidad de intención por plataforma. |

---

## 7. Dependencias cross-repo (cadena de integración)

1. **profile-as-code — schema v1.1 (spec-first):** amendar `docs/SPEC.md §15.6` + `schema/profile.schema.json`
   (`highlights: array`, `role/org: langMap`, `publications.url`, `languages`, `education`) +
   `gen-zod` + tests core. PR contra main de profile-as-code (merge: humano).
2. **profile-data — contenido ES:** completar `role`/`org` ES de `experience.yaml` y
   verificar hechos contra el CV actual (CHECKLIST pendiente). PR en profile-data (merge: humano).
3. **cv-cluciani — Fase 2 en adelante:** consume lo publicado por 1–2.

El normalizador del CV soporta **ambos shapes** (v1 y v1.1), así el refactor del CV no
queda bloqueado si 1–2 tardan: la Fase 2 renderiza con el shape disponible y la Fase 2.5
(adopción v1.1) es mecánica.

---

## 8. Plan por fases (cada fase: tests verdes + CI verde + PR propio)

### FASE 0 — Baseline + SPEC (ESTE PR)
- [x] Worktree `aionui/pi/cv-profile-data` desde `origin/main` (22 commits adelante del main local).
- [x] Baseline verde: 50 tests, `npm run build`.
- [ ] `docs/SPEC.md` (este documento) + aprobación del operador.

### FASE 1 — Pipeline de dependencia (sin cambio de comportamiento)
- `tools/sync-profile.ts` (5.1) + `.env.example` (`PROFILE_DATA_PATH`) + `.gitignore` (.env).
- `src/data/profile.generated.ts` generado y commiteado + `profile.generated.test.ts`
  (paridad byte a byte: commiteado == output del sync — el drift gate).
- Test del normalizador: highlights string v1 → array, role/org langMap, publications sin
  DOI, reconciliación "guías = proyecto".
- **DoD:** pipeline corre, paridad enforced, ningún template consume todavía la data,
  salida visual idéntica (cero riesgo de regresión de contenido).

### FASE 1.5 — Dependencias upstream (PRs en otros repos, merge humano)
- profile-as-code: schema v1.1 (D5) + profile-data: ES completo + verificación de hechos.
- El CV consume lo disponible (normalizador dual-shape).

### FASE 2 — Rewiring de las salas al perfil compilado (el grueso)
- `src/content/cv/*.ts` creada (mueve curación fuera de templates).
- Sala Perfil: photo/statement/educación desde el perfil.
- Sala Proyectos: cards desde `projects.yaml` (name/status/description/links/evidence);
  showcase Drahma desde `content/cv/drahma.ts` (ref. id estable).
- Sala Trayectoria: entries desde `experience.yaml` (periodo = start/end, bullets =
  highlights).
- Sala Biblioteca: `publications.yaml` (+ entrada institucional "guías" → project).
- Sala Competencias: skills + languages.
- Hero: nombre + tagline desde identity/headlines.
- print-CV: renderer determinista (D4). JSON-LD: generado (Person + ScholarlyArticle).
- MAP generado (D3). Templates dejan de contener hechos.
- Tests: paridad por sala (generado == index.html commiteado), cobertura i18n (todo texto
  tiene EN+ES), JSON-LD válido, print-CV == SSOT (drift), tests de SALAS/render intactos.
- **DoD:** cero textos factuales editables en `src/templates`; editar un hecho = tocar
  profile-data + sync + rebuild.

### FASE 3 — Datos restantes + limpieza
- Grafo-constelación desde `projects.yaml` + `content/cv/constelacion.ts`.
- Frases intro → `content/cv/museo.ts`.
- `build.sh` stale (apunta a `src/sections/` inexistente) → eliminar o arreglar.
- Galería → `content/cv/galeria.ts`.

### FASE 4 — CI + drift gate + docs
- CI: `npm test` (incluye paridad generados) + typecheck + build. Opcional: `sync --report`
  como job manual.
- `ESTADO.md`, `README.md`, `docs/STYLE_GUIDE.md` actualizados con la frontera
  hecho/curación y el flujo "editar hecho = profile-data".

### Fuera de alcance (roadmap futuro)
- Renderer `web`/`print` promovido a profile-as-code (M5+).
- Museo 3D (SALAS es el prerrequisito ya cumplido).

---

## 9. Verificación final

- `npm test` (vitest: paridad generados + salas/render/i18n/print/jsonld).
- `npm run build` (Vite).
- Browser headless: ES/EN toggle (MAP generado), nav, plano, intro, grafo, print-CV,
  JSON-LD parseable, sin errores de consola.
- Drift manual: `sync --report` con 0 warnings de hechos; diff del perfil vs CV actual.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Refactor cambia contenido sin querer | Paridad byte a byte por fase (generado == commiteado); Fase 1 sin cambio visual. |
| Romper i18n (el MAP pasa a generado) | Diccionario UI separado + test de cobertura EN/ES; walker runtime intacto. |
| Dependencia bloqueada (v1.1 tarda) | Normalizador dual-shape (v1/v1.1); la Fase 2 no depende de upstream. |
| Deriva SSOT↔CV silenciosa | `profile.generated.test.ts` (paridad) + `sync --report` en CI manual. |
| Pérdida de hechos de curación al migrar | Fase 2 mueve 1:1 (byte a byte) a `src/content/cv/`; test de paridad lo verifica. |
| "36 guías" (proyecto vs publicación) | Regla de reconciliación explícita en 4.0; entrada institucional en Biblioteca. |

---

## 11. Notas de contexto para quien ejecute

- Repo `ChristianLuciani/christianluciani.github.io`; deploy GitHub Actions → raíz Pages.
- Nunca trabajar en `main`; worktree + rama `aionui/pi/<feature>`.
- El merge es del humano (repo-governance). PRs: uno por fase, descripción clara, CI verde.
- `profile-data` es PRIVADO: el sync corre local o en la máquina del agente; CI solo
  verifica paridad (nunca lee el repo privado).
- El SSOT factual futuro de textos por plataforma (`bios`, `headlines`) alimentará también
  otros deploy surfaces (GitHub README ya genera profile-as-code); el CV es el primero en
  consumir el perfil compilado — dogfood de M5.
