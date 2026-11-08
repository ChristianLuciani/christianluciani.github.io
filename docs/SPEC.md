# SPEC — Separación contenido/presentación + dependencia de profile-data

> Status: v0.2 — FASE 5 (temas) incorporada; **ratificada por el operador el 2026-11-06** (issue #132): ratifica el contenido de PR #121 (merge commit `e60d5e4`) sobre `main` al 2026-11-06 (`cd4c8b8`) · Method: spec-driven (dev-methodology)
> **Enmienda 2026-11-07 (PR #156), ratificada por el operador el 2026-11-07** (traza: issues #128 y #131): `Curation` incorpora `experienceSections`; las N páginas de tema se publican sobre un solo bundle y una sola raíz de assets, con dirección **por tema** (`narrative.site`, overrides `SITE_ORIGIN`/`SITE_BASE`). Toca §2, §3, §4, §5.3, §5.4, §5.5, §5.6, §6 (D12), §8 FASE 5.5 y §9.
> Owner: Christian Luciani · Repo: `ChristianLuciani/christianluciani.github.io`
> Fecha: 2026-08-15 · v0.2: 2026-11-05 (ADR-001: hechos · curación · narrativa · piel)
> Relacionado: `docs/adr/ADR-001-temas-y-narrativas.md`, `docs/CREAR-TEMA.md`, `docs/epics/temas-narrativas.md`, profile-as-code `docs/SPEC.md` (§9.1 deploy surfaces, §15.6 v1.1), komuno manifiesto (IX–XI), AGOS (proyección read-only)

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
| `src/templates/head_html.ts` | persona/links (JSON-LD Person) — **derivado del SSOT desde #140**; publicaciones (JSON-LD ScholarlyArticle) siguen **a mano** |
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
- `experience.yaml` tiene `role` solo en EN; el CV renderiza ES — el SSOT no puede
  servir al CV sin completar el idioma. `org` es un **nombre propio invariante**
  (`string`, nunca langMap): no se traduce; la presentación ES sólo ajusta el rol
  del empleador, el país y la glosa `(scholarship)` (SPEC §11/§15.6).
- `publications.yaml` no puede representar outputs sin DOI (abstract AIChE, preprint RG,
  guías) — limitación ya documentada como propuesta v1.1 (SPEC §15.6).

**Nueva dimensión (2026-11-05, ADR-001) — N narrativas y N pieles sobre un contenido.**
El sitio se diseñó como museo de ilusiones ópticas; el mismo contenido factual debe poder
presentarse a un equipo de ingeniería sin reescribirlo. Medición del estado: 69% del texto
visible (17,2k de 24,8k chars) vive a mano en templates, el diccionario i18n keyea por
string exacto del DOM (240 claves, 20 huérfanas) y la paridad se verifica contra **un**
`index.html`. Esta SPEC se extiende para que **estética y narrativa sean intercambiables
sin tocar contenido**, con curación explícita (qué se presenta, nunca borrar). Modelo:
cuatro dimensiones — hechos · curación · narrativa · piel — y un selector único de build
(`SITE_THEME`), publicado por subpath.

---

## 2. Goals / Non-goals

### Goals

1. **Separación total contenido/presentación**: los hechos viven en `profile-data` (SSOT);
   christianluciani.github.io queda como capa de **presentación + curación museográfica**.
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
6. **Contenido intacto entre temas (ADR-001 · I2)**: un tema no muta ni copia hechos; el
   SSOT y la curación son únicos. Cambiar de audiencia = cambiar `SITE_THEME`, no el
   contenido.
7. **Render estable durante el refactor (D9)**: el tema default publica **byte-idéntico**
   en cada PR de la FASE 5; el gate es un golden por tema, no una promesa.

### Non-goals (v1)

- No refactorizar las **ilusiones** (`src/ts/illusions/**`): se asignan por tema, no se
  editan. El resto de la UI **sí** se refactoriza (piel y narrativa son datos, ADR-001).
- No implementar conmutador de tema en runtime en producción: el switch es la URL.
- No compartir una página entre dos audiencias (una página por tema).
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
christianluciani.github.io (PÚBLICO · deploy surface)
  src/data/profile.generated.ts    ← AUTO-GENERATED (commiteado; D1). Jamás a mano.
  src/data/entity.generated.ts     ← AUTO-GENERATED (#140): JSON-LD Person + FAQPage,
                                     tal cual los emite el assembler del engine.
  public/robots.txt                ← AUTO-GENERATED (#140): política IA del SSOT
  public/llms.txt                    (retrieval permitido / training bloqueado).
  public/AI-POLICY.md                Vite copia public/ a la raíz de dist/.
  src/content/curation/<id>.ts     ← CAPA DE CURACIÓN (D8): qué se presenta, orden y
                                     exclusiones con razón. Referencia el SSOT por id.
  src/themes/<id>/narrative.ts     ← NARRATIVA (D10): salas, orden, metáforas, labels,
  src/themes/<id>/copy.ts            ilusiones, metadata. Claves semánticas ES/EN.
  src/themes/<id>/skin.css         ← PIEL (D11): tokens, tipografía, densidad.
  src/themes/index.ts              ← REGISTRO + selector SITE_THEME (default "museo")
  src/presentation/*               ← renderers genéricos: reciben {data, curation,
                                     narrative, skin}; no contienen copy ni hechos.
  index.html                       ← tema default, generado (sin cambio de contrato).
  dist/<path>/index.html           ← una página por tema dentro del artefacto, publicada por subpath.
```

**Regla de oro (komuno IX):** un hecho se edita UNA vez en `profile-data`; el CV deriva.
Un copy se edita UNA vez en el pack del tema; un renderer genérico lo muestra. Si un valor
tiene que cambiar en dos archivos para mantenerse coherente → es un bug de arquitectura
(duplicación), no una tarea. **Corolario (ADR-001):** un tema nuevo no toca hechos,
curación de otro tema, renderers ni el SSOT; toca sólo su propio directorio de tema y su
línea de registro (§8 FASE 5).

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
| copy del chrome y de las salas (hero, cover, intro, plano, now, galería, competencias, contacto) | `src/themes/museo/copy.ts` | copy (pack del tema, #127) |
| títulos y leyendas de publicaciones (fila de la Biblioteca + `headline` del JSON-LD) | `src/themes/museo/copy.ts` (`pub.<id>.*`) | copy de presentación — **deuda declarada**: proyectar `profile-data/publications.yaml` (#99/#128) |
| diccionario i18n ES/EN | derivado en `src/cv/i18n.ts` del pack, de `src/cv/salas.ts` y del SSOT | presentación (sin claves a mano, #127) |
| títulos museísticos ("El Autorretrato") | `src/content/cv/museo.ts` | copy (hoy; destino §8 FASE 5) |
| subtítulos de sala (parametrizados con `{location}` del SSOT) | `src/content/cv/museo.ts` | copy + hecho (hoy) |
| estructura de salas (ids, orden, metáfora, nav/plano labels) | `src/cv/salas.ts` | estructura + narrativa (hoy) |
| asignación de ilusión por sala | `src/cv/salas.ts` + `src/templates/sala_html.ts` | presentación (hoy) |
| qué proyectos/publicaciones/experiencias se presentan y en qué orden | `src/content/curation/museo.ts` (decisión de inclusión, exclusión y orden) → `curatedOrder()` (`src/content/curation/index.ts`) → `src/data/proyectos.ts` + `src/data/publicaciones.ts` | curación |
| quote-block ("La física me enseñó…") | `src/content/cv/museo.ts` | copy (hoy) |
| showcase Drahma (celdas, timeline, lab STEM) | `src/content/cv/museo.ts` (export `DRAHMA`) | copy (ref. `projects.yaml` por id) |
| curación de El Marco / El Bastidor (subtítulo, `falta`, fecha de recencia, labels de link, nota) | `src/content/cv/proyectos.ts` | curación de presentación (el ORDEN vive en la curación del tema) |
| frases del intro | `src/content/cv/museo.ts` | copy (hoy) |
| copy del print-CV (títulos de sección, labels y nombres de idioma/nivel) | `src/themes/museo/copy.ts` (`print.*`, #127) | copy (pack del tema) |
| curación del print-CV (qué links entran al encabezado) | `src/content/cv/print.ts` (`PRINT_CV.contactPlatforms`) | curación (sin copy) |
| links de El Buzón (sala Contacto) | `PROFILE.identity.links` — derivados por `src/content/cv/contacto.ts` (excluye la plataforma website, dedupe por plataforma) | hecho (derivado; el `mailto:` es la excepción declarada) |
| clasificación de Trayectoria (`experience[]` → `professional`/`training`) | `Curation.experienceSections` (§5.5), resuelta por `activeCuration()` | curación (sin copy) |
| prosa de perfil (print-CV y sala de Perfil del sitio) | `PROFILE.positioning.statement` (SSOT) — la selección de campo vive en `src/content/cv/profile-prose.ts` (`PROFILE_PROSE`) | hecho (derivado, #122) |
| feed «Ahora» (fecha + link, 5 filas) | `ChristianLuciani/now` con tag pineado en `now.lock.json` → `src/data/now.generated.ts` | chrome (nunca JSON-LD/FAQ, #117) |
| grafo constelación (nodos/aristas) | roadmap — sin módulo de curación; los 16 nodos y las 24 aristas viven en `src/ts/graph/grafo.ts` (`NODOS`/`LINKS`); la sala (lede + canvas) en `src/templates/sala_html.ts` (`ROOM_BODY`) | curación (ref. `projects` SSOT) |
| galería placeholders | roadmap — la sala se oculta desde la curación del tema (`salas:galeria` en `exclude`), aplicada al construir las salas del manifest en `src/themes/museo/narrative.ts`; shell en `src/templates/sala_html.ts` (`ROOM_BODY`) | curación |
| CSS: tokens, tipografía, densidad | `src/themes/museo/skin.css` (el head la emite) | presentación (FASE 5 · #130) |
| ilusiones, animaciones, canvas | `src/ts/` | presentación (no editable por temas) |

Esta tabla es la frontera de **HOY**: todo puntero resuelve contra el árbol (gate
`tools/docs/doc-pointers.test.ts`). El layout de la FASE 5 —pack de copy, curación, piel y
registro de temas— se especifica en §8, que el gate excluye por nombrar archivos planeados.

**Reglas de reconciliación (deriva conocida, resuelta en el normalizador):**
- "36 guías de laboratorio" = **proyecto** `Physics Lab Book` en el SSOT → la sala Biblioteca
  renderiza una entrada institucional con link al repo, **no** una publication.
- Publications sin DOI (abstract AIChE, preprint RG) → el contrato v1.1 les da `url` (Fase 1.5).
- `experience[].role` → langMap `{en, es}` (v1.1): el CV renderiza ES desde el SSOT.
  `experience[].org` es `string` invariante (nombre propio): no entra en el langMap.

---

## 5. Contrato de datos — la proyección (interfaces)

### 5.1 `tools/sync-profile.ts` (pipeline de dependencia)

```
sync-profile [--now <iso8601>] [--report]
  1. workspace: $PROFILE_DATA_PATH del entorno (o .env)
  2. engine (>= 0.4.0): `pasco export profile --json --workspace <ws>` — la ÚNICA
     fuente de datos. El script no parsea YAML ni valida con Ajv: consume el
     `LoadedProfile` compilado por el motor (profile-as-code SPEC §7.5, #348).
     Si pasco falta o es viejo, el error imprime el comando de instalación exacto.
  3. `pasco doctor --json` aporta la etiqueta completa del contrato (`schema.version`);
     el export 0.4.0 sólo trae el major.
  4. proyección explícita LoadedProfile → CvProfile (sección 5.2; NO es un dump):
     sólo los roots/fields que el CV usa. `credentials[]`/`artifacts[]` se filtran a
     `visibility: public` (ausente = público; `private` y `unlisted` quedan fuera,
     §18.5) y se descartan las referencias (`identity.links`, `projects[].links` /
     `evidence[].source`) a locators o verifyUrls no públicos.
  5. emit  src/data/profile.generated.ts con header AUTO-GENERATED + metadata:
     `profile-data @ <sha>` (pinPattern del gate), `engine @ <version> · schema v<label>`
     (label = `schema.version` de `pasco doctor`; vigente al 2026-11-05: v1.16) y
     `generatedAt` (null salvo --now) — GEO/auditabilidad.
  6. --report: lista hechos sin traducción ES, urls fuera de identity.links, etc.
```

Puro, determinista, sin red: mismo input → mismo output byte a byte (komuno VI/X).
El reloj no entra: `source.generatedAt` es `null` salvo `--now` explícito.

**La capa legible por máquina también deriva del SSOT (#140).** El objetivo 4
(exactamente los mismos hechos byte-consistentes en JSON-LD, print-CV y salas) no
se cumple si el `Person` se escribe a mano: hasta #140 el bloque publicado decía
`jobTitle: "Independent Researcher"` contra `Strategic Systems Consultant` del
SSOT, omitía `@id`/`description`/`email`/7 de los 12 `sameAs`, y no existía
`FAQPage`. Dos pipelines más, mismo contrato de determinismo y procedencia:

```
sync-entity [--workspace <ws>] [--out <file>] [--now <iso8601>]
  1. `pasco entity --json`      → la vista congelada: schemaVersion, entity, gaps, faqJsonLd.
     Refusa si schemaVersion ≠ 1 o si la entidad no declara `@id` (el engine nunca
     lo inventa; sin ancla no hay consistencia cross-surface).
  2. `pasco entity --jsonld --bare` → los nodos EXACTOS del assembler que embeden los
     renderers del engine: el script no re-arma el JSON-LD (un segundo emisor es el
     bug que #140 cierra). Verifica que `--json` y `--jsonld` declaren el mismo
     número de nodos.
  3. `pasco doctor --json` → versión del engine del header.
  4. emit src/data/entity.generated.ts (`ENTITY = { source, nodes } as const`) con el
     MISMO formato de header que el perfil: `profile-data @ <sha> · generatedAt null`,
     `engine @ <v> · schema v<label>`.

sync-ai-policy [--workspace <ws>] [--out <dir>]     (default: public/)
  `pasco export ai-policy --out <dir>` → robots.txt + llms.txt + AI-POLICY.md.
  Postura: los crawlers de `ai-retrieval` con `Allow: /`, los de `ai-training` con
  `Disallow: /`, lista EXPLÍCITA sin `User-agent: *` (un wildcard bloquearía también
  a los buscadores que la política no nombra). El engine refusa pisar un archivo que
  no generó él: un `robots.txt` escrito a mano hace fallar el sync, no se borra.
```

Los tres artefactos de `public/` y `entity.generated.ts` **se commitean** como
snapshot de deploy: el workflow de CI no tiene acceso al repo privado, así que el
gate es `sync:check` (capas abajo) y no una generación en CI. Vite copia `public/`
a la raíz de `dist/`, así que `/robots.txt` y `/llms.txt` se sirven sin plugin.

**Frescura ≠ render — `npm run sync:check` (#110).** El gate de frescura (pin
ancestro de HEAD y `content/` sin cambios) puede estar verde con **cero
consumidores** (#99). `sync:check` agrega el gate de render:

```
sync-check [--workspace <path>] [--generated <path>] [--entity <path>]
  1. self:      header coherente con `PROFILE.source` y el archivo es
                byte-idéntico a `renderSource(PROFILE, engine, schema)`.
                Re-renderiza el `PROFILE` importado del propio archivo: prueba
                consistencia interna (cuerpo ↔ header ↔ renderer), NO autoría —
                un edit manual coherente es su propio render y pasa.
  2. fixture:   proyecta `src/data/fixtures/export-profile.json` —payload
                anonimizado con la forma del engine— y exige determinismo y
                filtro de `private`/`unlisted` (entradas Y referencias desde
                `identity.links`, `projects[].links` / `evidence[].source`).
  3. workspace: si hay `PROFILE_DATA_PATH` (o `--workspace`), recién ahí corre
                el pipeline real (`pasco export`) y compara byte a byte; exit 1
                con archivo:línea exacto.
  4. entity-self:      idem 1 sobre `src/data/entity.generated.ts` (`ENTITY`).
  5. entity-fixture:   `src/data/fixtures/entity-jsonld.json` —forma del assembler
                con hechos de ejemplo—: determinismo, 1 `Person` con `@id`,
                `@context` schema.org y ningún `FAQPage` vacío ni pregunta sin
                `citation`.
  6. entity-workspace: `pasco entity --jsonld` + `--json`, compara byte a byte.
  7. policy-self:      los 3 artefactos de `public/` existen y la postura no se
                degradó ESTRUCTURALMENTE. `robots.txt` se parsea con la semántica
                del crawler (RFC 9309): §2.1 —el grupo termina con un `user-agent`
                o EOF, NO con una línea en blanco— y §2.2.1 —los grupos que
                matchean el mismo product token se COMBINAN en un conjunto efectivo
                (case-insensitive)—. Sobre ese conjunto se exige: ningún
                `User-agent: *`, todo `User-agent` con product token válido, al
                menos un agente de retrieval (`Allow: /` exclusivo) y uno de training
                (`Disallow: /` exclusivo), y ningún agente con ambas (a igual match
                gana `Allow`, §2.2.2). `llms.txt` con heading de índice.
                LÍMITES declarados (no fail-open del artefacto, sí del modelo):
                (a) NO verifica el mapa agente↔postura — qué crawler va en cada
                conjunto vive en el registro del engine y duplicarlo acá sería
                una segunda fuente; lo prueba `policy-workspace` o el `--check`
                del engine (`profile-as-code#477`);
                (b) NO modela el matching por path de §2.2.2 (`Disallow: /` +
                `Allow: /legal`, o `Disallow: /private` bajo un `Allow: /`) ni
                los patrones no-raíz (`/**`, `*`): un `robots.txt` con
                excepciones por path tiene una postura que esta capa no deriva.
                El engine no emite excepciones y `policy-workspace` compara byte
                a byte, así que el artefacto commiteado no queda expuesto; un
                archivo editado a mano con excepciones sí. Cerrar el modelo es
                del engine (`profile-as-code#477`), no de otro gate local.
  8. policy-workspace: `pasco export ai-policy` a un tmpdir y compara los 3 bytes.
```

Sin `--workspace` los pipelines **no se invocan**: las capas `self` comparan cada
archivo consigo mismo y los `fixture` corren payloads anonimizados, así que ninguna
prueba paridad de contenido contra el SSOT. **Sólo las capas `workspace` comparan
contenido**: sin ellas el cierre cuenta las capas verificadas, nombra las que
quedaron fuera con su razón y dice `PARCIAL` (nunca `✅ OK`) cuando
`verified < total` — en CI es `PARCIAL — 5/8` (perfil self+fixture, entidad
self+fixture, policy self) con las tres de paridad declaradas no verificadas; con
`--workspace` y todo verde es `✅ OK — 8/8`. El exit code sigue 0 sin workspace:
CI no tiene el repo privado. CI corre las capas sin workspace más el guard de consumidores
(`src/data/consumers.test.ts`): falla si ningún módulo de **render**
(`templates/index.ts` o `templates/sala_html.ts`) importa `PROFILE` (sin
comentarios ni `import type`; un importador de metadata no cuenta), si
`templates/index.ts` deja de llamar `printCvHtml(PROFILE…)`, o si una superficie
ya migrada al SSOT (El Friso/El Marco: `frisoHtml`, `marcoHtml`,
`publicadosDe`, `proyectosDe`) deja de existir o de consumirlo — sin rama
PENDIENTE desde que #109 está en `main`. Las capas `workspace` son local/agente:
nunca fingen paridad de contenido.

### 5.1b Shape de `entity.generated.ts` (#140)

```ts
export const ENTITY = {
  source: { commit, generatedAt },       // pin del SSOT; generatedAt null por defecto
  nodes: [Person, FAQPage?]              // tal cual los emite `pasco entity --jsonld --bare`
} as const;
```

El orden de `nodes` es el del assembler del engine (entidad y después FAQ) y **no se
reordena**: `head_html.ts` los serializa en ese orden. `Person` lleva `@id`
(`https://christianluciani.github.io`), `description`, `jobTitle`, `email` y los 12
`sameAs` del SSOT; `FAQPage` lleva las preguntas con su `citation`. El `@graph` de
`ScholarlyArticle` sigue escrito a mano en `head_html.ts` (el engine no lo emite):
fuera de alcance de #140.

### 5.2 Shape de `profile.generated.ts` (normalizado, NO espejo del schema)

```ts
export const PROFILE = {
  identity: { name, givenName, familyName, location, photo, links: Link[] },
  positioning: { statement: LangText, audiences: Record<string, LangText>, geo },
  headlines: Headline[],
  experience: Experience[],   // role: LangText; org: string (invariante, SPEC §11/§15.6);
                              // highlights: { en: string[]; es: string[] }
                              // (bullets; normaliza string v1 "·"-separado → array v1.1)
  education: Education[],     // entrada deducida: experience[] con role=título (v1 legacy)
                              // o education[] explícito (v1.1) — el normalizador unifica
  projects: Project[],        // con evidence[]; `published` DERIVADO de artifactRefs →
                              // artifact público con locator.url (El Marco vs El Bastidor, #109)
  publications: Publication[],// con url (v1.1); DOI/ORCID resolubles (ancla GEO)
  skills: Skill[],            // + languages: [{ code, level }] (v1.1)
  keywords: { seo, geo },
  source: { repo, commit, generatedAt }   // procedencia (GEO + auditoría); generatedAt null por defecto
} as const;
```

Tipos en `src/data/profile.types.ts` (`CvProfile`). El archivo es una **proyección, no el
`LoadedProfile`**: quedan afuera `bios`, `faq`, `flavor`, `deployments`, `checks`,
`socialHandles`, `press`, `releases`, `active`, `email`, `handle`, `timezone`,
`nationality`, `authors`, `kind`, `artifactRefs` (crudo) y los ids de fila que el CV no usa.
Los derivados que sí viajan son `projects[].published` (artifact público abrible, calculado en
el pipeline a partir de `artifactRefs`), `identity.givenName`/`familyName` (partidos del nombre),
`publications[].url` (la `url` explícita del SSOT o el fallback `https://doi.org/<doi>`) y
`experience[].end` default `"present"`. Los IDs de `artifactRefs` no se emiten porque pueden
apuntar a un artifact privado.

### 5.3 Capa de curación — el único otro lugar editable por humano

Tipada (TS), sin hechos. Referencia entidades del SSOT por **clave derivada**
(`colección:clave`), no por id de fila: la proyección no expone ids estables. Separa dos
cosas que hoy están mezcladas (D8):

- **curación** = qué se presenta, en qué orden y qué se excluye (`include`, `exclude` con
  `reason`, `order`). Excluir **no borra**: el hecho sigue en el SSOT y en otros temas.
- **copy** = cómo se nombra (vive en el pack del tema, no acá).

Estado de migración: el material actual de `src/content/cv/` (`museo.ts`, `proyectos.ts`,
`print.ts`) se mueve **sin cambios de contenido** al layout de §8 FASE 5, con el golden
byte a byte como gate (I1).

Implementación (#128, FASE 5.2): `src/content/curation/museo.ts` declara
`include`/`exclude`/`order`/`experienceSections`, y `src/content/curation/index.ts`
registra una curación por tema. Los ids son `colección:clave` (`keys.ts`):
`proyectos:Kontablo`, `experiencia:org|role|start`, `publicaciones:<doi|url>`, etc.;
`order` es por colección y usa claves sin prefijo. `curatedOrder()` (`index.ts`) es el
consumidor canónico —filtra lo excluido y ORDENA por `order`— que usan
`proyectosDe()`/`publicacionesDe()`. La clasificación de `experience[]` es parte del
contrato (`Curation.experienceSections`): la tabla de `museo` vive en `curation/museo.ts`
y el print-CV COMPARTIDO la resuelve con `activeCuration()`, nunca importando el módulo
de un tema. La visibilidad de salas es per-tema por la misma razón: cada
`themes/<id>/narrative.ts` construye sus `rooms` desde `SALAS` aplicando SU curación
(`salas:<id>` en `exclude`), así la galería oculta del museo no ata a otro tema.
`tools/curation.ts --report` (`npm run curation:report`) enumera todo hecho curable por
ítem del perfil y de las salas y sale 1 si alguno no tiene decisión o si un `exclude` no
tiene razón (`validate.ts`). La Biblioteca todavía renderiza desde el pack (#99), así
que `render-drift.test.ts` exige que el orden curado y el DOM coincidan hasta que
consuma `publicacionesDe()`.

### 5.4 Contrato de narrativa — `narrative.ts` del tema

```ts
export interface NarrativeManifest {
  id: string;                       // slug [a-z0-9-], único en THEMES
  path: string;                     // subpath de publicación ("" = raíz)
  rooms: RoomRef[];                 // ids, orden y metáfora; subconjunto o reordenamiento
  copy: CopyPack;                   // claves semánticas ES/EN, 100% completas (I4)
  illusions: Record<string, string>;// roomId → canvas id existente en src/ts/illusions
  meta: { title: string; description: string; ogImage: string };
  site: { origin: string; base: string }; // dirección de publicación (origen + prefijo)
}
```

Reglas: ningún template conoce el id del tema; el selector es `SITE_THEME` resuelto en el
registro de temas; `meta` alimenta `<title>`, `og:*` y `twitter:*`; `site` + `path` producen
`canonical`, `og:url` y `og:image` con la dirección del tema: el documento fuente emite
`og:*` con el origen por defecto y el publicador reescribe `og:url`/`og:image` y añade
`canonical` (falla si `og:url` no está), así el golden del default queda byte-idéntico.
La narrativa declara las salas que EXISTEN y su `hidden` se resuelve con la curación de
ESE tema (`salas:<id>` en `exclude`): la visibilidad no se hereda de otro tema ni se fija
en la estructura compartida.

### 5.5 Curación — `curation.ts` por tema

```ts
export interface Curation {
  include: string[];                          // claves `colección:clave` (derivadas, no ids de fila)
  exclude: { id: string; reason: string }[];  // excluir no borra; reason obligatoria
  order?: Record<string, string[]>;
  experienceSections?: Record<string, "professional" | "training">;  // clave de fila → sección del print-CV
}
```

`experienceSections` es **opcional en el tipo** pero **obligatorio en la práctica**: el
print-CV falla ruidoso si una fila de `experience[]` no está clasificada. El instrumento es
el renderer (`print_cv_html.ts` lanza) y `print_cv.test.ts` (cobertura total contra
`PROFILE.experience`), no el reporte de I3 — que sólo verifica `include`/`exclude`.

Gate I3: `curation --report` lista todo hecho del perfil sin decisión (mostrado o excluido
con razón) y no permite un `exclude` sin `reason`.

### 5.6 Piel — `skin.css` del tema

Sólo tokens (`--bg-*`, `--ink*`, `--line*`, acentos, `--radius`, `--container`, tipografía)
y reglas que los consumen. Prohibido: literales de color fuera del bloque de tokens,
`!important` para pisar otro tema, fuentes web. Gate I5: 0 literales + contraste AA en los
pares texto/fondo declarados.

**Excepción declarada — clasificación de `experience[]` en el print-CV (D2, F1 de #119).**
`Curation.experienceSections` (la tabla del tema `museo` vive en `src/content/curation/museo.ts`) reparte cada fila de `experience[]` en
`professional`/`training` mediante una clave **derivada de hechos**
(`org|role.es|start` —el rol sale en ES y cae a `role.en` si la fila no tiene
ES, fallback que aplica `experienceKey`—, o `id` cuando existe), no por `id` estable:
la proyección **no expone `id` de fila** (§5.2 descarta los ids que el CV no usa),
así que hoy no hay id al que referenciar. La tabla no duplica hechos renderizables —sólo repite la clave para
clasificar y no imprime `org`, `role` ni `start`— y falla ruidoso: una fila nueva,
renombrada o eliminada rompe el render y el test de cobertura total
(`print_cv.test.ts`), que compara la tabla contra `PROFILE.experience` (no contra una
lista copiada a mano). **Condición de salida:** si el SSOT/proyección empieza a exponer
`id` estable en `experience[]`, la tabla migra a id; el hook `if (item.id)` de
`experienceKey` ya lo prefiere sin cambiar el resto del renderer.

---

## 6. Decisiones (ADR-lite)

| # | Decisión | Racional |
|---|---|---|
| D1 | **Archivo generado + commiteado** en christianluciani.github.io (`src/data/profile.generated.ts`) | Mismo patrón que `index.html` (build.test.ts): CI solo verifica paridad; la generación es local/agente; cero credenciales de repo privado en CI. Contrato enforced por test. |
| D2 | **Curación en christianluciani.github.io** (contenido de curación del repo), no en profile-data | Son decisiones de esta superficie (qué se presenta a qué audiencia), no hechos ni plataforma-cross. Meterlas en el schema contaminaría el contrato con una decisión de presentación. La curación es **por tema** y nunca borra: un `exclude` deja el hecho vivo en el SSOT y en los demás temas. |
| D3 | **Copy por tema con claves semánticas** (`copy.ts` del tema), resuelto en render; el MAP generado sobrevive sólo para el texto de UI | Elimina la clase de bug "edité ES y olvidé EN" **y** la de "cambié una coma y la traducción quedó huérfana" (240 claves por string exacto, 20 ya huérfanas). Con N narrativas, keyear por texto del DOM multiplica la deuda. |
| D4 | **print-CV = renderer determinista** dentro de christianluciani.github.io, consumiendo `profile.generated.ts` | Deploy surface sin API; promovible a renderer `print` de profile-as-code después (M5+, queda anotado). |
| D5 | **Extensión del contrato como profile-as-code** (schema v1.1, spec-first en profile-as-code, NO ad-hoc en el CV) | El contrato de datos es del motor: `highlights → array`, `role → langMap`, `org → string` invariante, `publications.url`, `languages`, `education`. El CV normaliza ambos shapes (v1 legacy + v1.1) para no bloquear el refactor. |
| D6 | Integración por **path configurado** (`PROFILE_DATA_PATH` en `.env`/`.pacrc`, `.env` gitignored) | D14 de profile-as-code: sin symlink en el flujo normal; parametrización komuno XI. |
| D7 | El sync **valida contra el schema del motor** (fail on schema, warn on drift — D12 profile-as-code) | Integridad del contrato sin romper flexibilidad de intención por plataforma. |
| D8 | **Curación explícita y reversible** (`include`/`exclude`/`order` + `reason`), por tema | "Qué presentar sin borrar" necesita representación y gate: sin `reason` y sin reporte de cobertura, un tema puede ocultar trabajo en silencio y nadie lo ve. |
| D9 | **Paridad por tema (golden)**, no contra un único `index.html` | El refactor de la FASE 5 debe dejar el tema default byte-idéntico; con dos temas, el gate histórico se vuelve rojo o se borra. Golden por tema = instrumento único de "el render no cambió". |
| D10 | **Narrativa = datos** (`narrative.ts` + `copy.ts` del tema), no markup | Es la diferencia entre "otra piel" y "otra audiencia". Tocar templates para cambiar de voz reintroduce la duplicación que esta SPEC cierra. |
| D11 | **Piel = tokens** (`skin.css` del tema), sin literales de color | Un segundo tema hoy exige tocar 74 literales de color y 30 tintes teal con alpha propio: sin tokens, cada piel es un fork del CSS. |
| D12 | **Topología: subpath con selector `SITE_THEME`**; un sitio Pages, un artefacto de deploy | El "switch" es la URL en cualquier topología; el subdominio exige un segundo sitio Pages (otro repo) y duplica pipeline, secretos y rollback. `site` por tema (+ overrides `SITE_ORIGIN`/`SITE_BASE`) deja la migración a subdominio como configuración, no refactor. |
| D13 | **Prosa de perfil = una pieza derivada del SSOT** (`PROFILE.positioning.statement`, resuelta por `profile-prose.ts`); print-CV y sala de Perfil la comparten | El claim «más de 20 años» vivía escrito a mano en dos archivos, con dos redacciones y sin respaldo en el SSOT: un mismo claim duplicado es un defecto de arquitectura (SPEC §3), no curación. Un fallback declarado dentro del SSOT (`audiences.recruiters`) evita redactar copy nuevo cuando el primario falta. |
| D14 | **Reglas del print = una constante** (`print-tokens.ts`) con el teal del brand, no grises fijos por bloque | Las reglas de sección (`#ccc`) y del footer (`#ddd`) eran dos literales independientes: el print no compartía el color de la marca y cada bloque podía derivar sin que nadie lo viera. El test compara la constante contra el token `--teal` de pantalla. |

---

## 7. Dependencias cross-repo (cadena de integración)

1. **profile-as-code — schema v1.1 (spec-first):** amendar `docs/SPEC.md §15.6` + `schema/profile.schema.json`
   (`highlights: array`, `role: langMap`, `org: string`, `publications.url`, `languages`, `education`) +
   `gen-zod` + tests core. PR contra main de profile-as-code (merge: humano).
2. **profile-data — contenido ES:** completar `role` ES de `experience.yaml` (`org` es
   string invariante, no admite traducción) y
   verificar hechos contra el CV actual (CHECKLIST pendiente). PR en profile-data (merge: humano).
3. **christianluciani.github.io — Fase 2 en adelante:** consume lo publicado por 1–2.

El normalizador del CV soporta **ambos shapes** (v1 y v1.1), así el refactor del CV no
queda bloqueado si 1–2 tardan: la Fase 2 renderiza con el shape disponible y la Fase 2.5
(adopción v1.1) es mecánica.

---

## 8. Plan por fases (cada fase: tests verdes + CI verde + PR propio)

### FASE 0 — Baseline + SPEC (ESTE PR)
- [x] Worktree `aionui/pi/cv-profile-data` desde `origin/main` (22 commits adelante del main local).
- [x] Baseline verde: 50 tests, `npm run build`.
- [x] `docs/SPEC.md` (este documento) + aprobación del operador — ratificada el 2026-11-06 (issue #132).

### FASE 1 — Pipeline de dependencia (sin cambio de comportamiento)
- `tools/sync-profile.ts` (5.1) + `.env.example` (`PROFILE_DATA_PATH`) + `.gitignore` (.env).
- `src/data/profile.generated.ts` generado y commiteado + `profile.generated.test.ts`
  (paridad byte a byte: commiteado == output del sync — el drift gate).
- Test del normalizador: highlights string v1 → array, role langMap y org string, publications sin
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
  showcase Drahma desde `content/cv/museo.ts` (export `DRAHMA`, ref. id estable).
- Sala Trayectoria: entries desde `experience.yaml` (periodo = start/end, bullets =
  highlights).
- Sala Biblioteca: `publications.yaml` (+ entrada institucional "guías" → project).
- Sala Competencias: skills + languages.
- Hero: nombre + tagline desde identity/headlines.
- print-CV: renderer determinista (D4). JSON-LD: `Person` + `FAQPage` **ya** derivados
  del SSOT (#140); el `@graph` de `ScholarlyArticle` sigue escrito a mano — es lo que
  falta para que el head no contenga ningún hecho editable.
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

### FASE 5 — Temas: contenido intacto, N narrativas y N pieles (ADR-001)

Objetivo: **cambiar estética y narrativa sin tocar contenido**, con el tema default
publicando byte-idéntico en cada paso. Sub-fases (cada una: PR propio, tests verdes):

- **5.0 — Golden por tema.** `tests/golden/museo.html` + snapshot por sección + exclusión
  de `.worktrees/**` en vitest (hoy contamina: 130 fallos falsos). Sin esto no hay
  invariante I1.
- **5.1 — Copy fuera de templates.** `themes/museo/copy.ts` con claves semánticas; los
  templates dejan de contener texto visible. Gate: golden byte a byte + 0 claves huérfanas.
- **5.2 — Curación explícita.** `content/curation/museo.ts` (`include`/`exclude`/`order`
  con `reason`) + `curation --report` (I3).
- **5.3 — Registro de narrativas.** `themes/index.ts`, `NarrativeManifest`, `SITE_THEME`;
  `museo` reproduce el HTML actual.
- **5.4 — Piel extraída.** Tokens a `themes/museo/skin.css`; 74 literales de color → tokens
  (I5); contraste AA verificado.
- **5.5 — Selector + subpath.** `SITE_THEME=<id> npm run build`; raíz default; `/<path>/`
  por tema; dirección **por tema** (`narrative.site`, overrides `SITE_ORIGIN`/`SITE_BASE`)
  sobre un solo bundle y una sola raíz de assets; `canonical`, `og:url`, `og:image`,
  `sitemap.xml`; smoke de assets por tema (I6).
- **5.6 — Gates de CI.** Golden por tema + completitud copy ES/EN + cobertura de curación +
  contraste + build de todos los temas.
- **5.7 — Piloto mínimo (S8).** `themes/ingenieria/` con **las mismas 8 salas**: sólo voz,
  piel, ilusiones y metadata. Valida la plomería; si exige tocar código compartido, el
  contrato falló.
- **5.8 — Control total (S9).** Segundo PR del piloto: reordena/agrupa/oculta salas y cura
  ítems. **Prueba de aceptación del contrato**: cualquier cambio necesario fuera de
  `themes/<id>/` + registro se corrige en el contrato, no con un parche lateral.

**DoD de la fase:** `SITE_THEME=ingenieria npm run build` produce `/ingenieria/` sin tocar
`src/data`, `src/content/curation/museo.ts`, renderers genéricos ni el tema `museo`; el
golden de `museo` no cambia en ningún PR de la fase.

### Fuera de alcance (roadmap futuro)
- Renderer `web`/`print` promovido a profile-as-code (M5+).
- Museo 3D (SALAS es el prerrequisito ya cumplido).

---

## 9. Verificación final

- `npm test` (vitest: paridad generados + salas/render/i18n/print/jsonld + **golden por
  tema**).
- `npm run build:all` (un bundle; una página por tema) + `SITE_THEME=<id> npm run build`.
- `npm run themes:check` (gate de #133): copy ES/EN completo (0 huérfanas),
  cobertura de curación con `experienceSections`, 0 literales de color, contraste AA
  declarado — por cada tema registrado — y baseline de render por tema.
- `npm run themes:assets`: toda URL de asset de cada tema existe en `dist/` (I6).
- Browser headless **por tema**: ES/EN, nav, plano, intro, grafo, print-CV, JSON-LD
  parseable, `canonical`/`og:url` correctos al subpath, sin errores de consola.
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
| Un tema muta o copia hechos | Gate I2: `themes/**` sólo importa tipos de `CvProfile`; review + test de imports |
| La curación oculta trabajo en silencio | `curation --report` (I3): todo hecho con decisión y `reason` en cada exclusión |
| El refactor cambia el render del default | Golden por tema (I1), bloqueante por PR; nunca se "actualiza el golden" en el mismo PR que refactoriza |
| Assets 404 en un subpath | `SITE_BASE` centralizado + smoke por tema (I6) |
| i18n se vuelve a desincronizar con N narrativas | Claves semánticas + test de completitud ES/EN (I4), sin walker por string exacto |

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
- **Temas:** leer `docs/CREAR-TEMA.md` antes de crear uno; el plan y los gates están en
  `docs/epics/temas-narrativas.md`. Un tema nuevo **no** toca `src/data/**`, la curación de
  otro tema, ni `src/ts/illusions/**`; las decisiones de modelo están en
  `docs/adr/ADR-001-temas-y-narrativas.md`.
