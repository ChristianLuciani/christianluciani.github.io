# 05-review.md — SOTA Review del logo oficial (issue #54)

> **Adaptación declarada**: este repo no tiene pipeline `.sota/` (sin
> 03-spec.md/04-build.md generados por sota-swarm). Los insumos del review
> fueron: **contrato = issue #54** (su lista de entregables es la spec) y
> **registro de build = body del PR #58** + `docs/brand/logo.md`. El PR #58
> existía ANTES de invocar sota-review (abierto bajo session-discipline, que
> exige commit+push+PR como mínimo entregado); el hand-off de este phase
> apunta a ese PR — no se re-abre ni se re-pushea nada nuevo.
>
> **Nota de routing honesta (precondición 2)**: la sesión corre en
> `glm-5.3-flash:cloud` — el MISMO tier que escribió el código. El skill
> exige que el reviewer outrankee al worker; esta pasada in-session no lo
> cumple estructuralmente. El gate real es el `premerge-review` en sesión
> fresca (paso 9 del skill), solicitado al operador al final de este
> reporte. Esta pasada in-session vale como primer filtro, no como veredicto
> final.

## Pass 1 — Spec fidelity (issue #54, entregables)

| Entregable del issue | Evidencia | Estado |
|---|---|---|
| Decisión de versión + ADR-lite | Ratificada por operador 2026-09-25 (áurea v16); asentada en `docs/brand/logo.md` §9 + comentario en el issue + `Closes #54` en body del PR | ✅ |
| Manual de estilo `docs/brand/logo.md` | Paleta exacta (teal/ora/espectro 5 estrellas/supernova/night), tipografía + tracking, construcción φ (radios/ángulos/twist), reglas de uso + tamaño mínimo + respiro, usos incorrectos | ✅ |
| SVG por capas | `logo-{aurea,base}-layers.svg` (background/constellation/spiral/c-triespiral) + lockup con typography; generados DESDE la misma geometría (`tools/logo/geometry.mjs`) con gate de fidelidad DOM | ✅ (1 NIT abajo) |
| PNG alta resolución | 512/1024/2048/4096 transparente + dark `#050810`; print 300dpi A4 (2480×3508) y A3 (3508×4961), transparente + dark | ✅ |
| Variantes | favicon 16/32, apple-touch 180, og-image 1200×630, settled para impresión | ✅ |
| Fuente versionada y taggeada (v1.0.0) | Pendiente post-merge — el tag debe apuntar al commit mergeado de main; documentado en PR body + issue | ⏳ abierto, esperado |
| Nota técnica: SVG desde la misma geometría | `geometry.mjs` puerto verbatim + `verify-dom-fidelity.mjs` ≡ DOM aprobado (PR #53), 80 tests | ✅ |
| Nota técnica: Chrome headless QA reutilizable | Reutilizado como rasterizador de los exports y QA visual | ✅ |
| Nota técnica: verificación C/φ reproducible | Ahora son TESTS permanentes (`geometry.test.mjs`), no script one-off | ✅ mejorado |

## Pass 2 — Correctness (caza activa de defectos)

Verificaciones re-ejecutadas en esta review:
- `npx vitest run` → 80 passed, 1 skipped.
- `node tools/logo/verify-dom-fidelity.mjs` → ≡ DOM aprobado, ambas versiones (espiral/C/constelación/cielo).
- **Determinismo byte a byte**: regeneración completa de ambas versiones → `git status` sobre `assets/` vacío (los 38 archivos reproducibles).

Sobrevivieron sin defecto: rampa de color/grosor/opacidad (validada contra DOM), extend de la punta (+1% testado), flare de supernova (peak .2 = hi del HTML), sky v10 vs sutil (puertos separados verificados), print A4/A3 composición centrada 8% margen (inspección visual), og 1200×630 (inspección visual), favicon 16 legible (inspección visual), boundary de config() con error explícito, tmp fuera del árbol commiteado.

## Pass 3 — Coherence

Un solo worker (sin seams de paralelismo). Naming consistente entre los 4 módulos (`geometry.mjs` → `generate-logo.mjs` → `verify-dom-fidelity.mjs` → tests). Sin duplicación de helpers.

## Findings

| # | Severidad | Archivo | Finding |
|---|---|---|---|
| F1 | NIT | `tools/logo/generate-logo.mjs` | La versión **base** dibuja su C como path único; el HTML base aprobado la dibuja como 2 líneas (caps montados en el vértice). Diferencia visual mínima en el join; irrelevante hoy (base = referencia comparativa tras D1). Si algún día la base vuelve a ser canónica, restaurar el render por líneas. |
| F2 | NIT | `tools/logo/verify-dom-fidelity.mjs:101-109` | El resumen `styleOk` no imprime nada cuando falla (el `fail()` de cada línea ya reporta) — doble canal menor. |
| F3 | NIT | `docs/brand/logo.md` §6 | La capa `typography` vive en el lockup (800×940), no en el master 800×800 — desvío documentado del layout del issue (el mark es cuadrado; meter el nombre adentro lo pisa). |
| — | Riesgo aceptado | PR #58 | Tag `v1.0.0` post-merge: el sha del merge no existe aún; lo crea el operador (o la próxima sesión al verificar el cierre) sobre main. |

## Veredicto

**PASS** — 0 BLOCKER, 0 MAJOR, 3 NIT (2 de ellos documentados como decisiones deliberadas). Rounds: 1 (sin ciclo de corrección necesario).

## Fresh-context gate (pendiente del operador)

El veredicto de esta sesión es in-session y del mismo tier que el autor. El gate terminal es el review fresco:

```text
Pre-merge fresh-context review requested.
Open a new, clean session and paste:
  "Run premerge-review on https://github.com/ChristianLuciani/christianluciani.github.io/pull/58.
   The PR is not yet merged.
   Review READ-ONLY on the code — no worktree/branch/commit;
   publish your report as a comment on the PR."
```

La proyección de `premerge-review` verifica publishing (no drift — confirmado). El review fresco NO recibe estos findings — solo el diff y el contrato (issue #54 + manual), para refutar independiente.

## Ruta de re-entrada del feedback post-testing

- Correcciones pequeñas → correction blocks en esta branch (el ciclo in-session de esta review).
- Hallazgos grandes (spec mal enfocada) → nueva ronda `/sota-workflow` con spec re-grillada.

## Fresh-context reconcile

Reporte fresco: [comentario en PR #58](https://github.com/ChristianLuciani/christianluciani.github.io/pull/58#issuecomment-5877163304) — veredicto **PASS-CON-RIESGOS** (0 blocker / 4 major / 7 nit), head `1c127eb`. Clasificación de cada finding (precedencia sota-review §10):

**Valid + actionable (4 major → fixeados en la ronda 1 de corrección):**

1. **`--out` documentado y no implementado** — verificado contra el código: el flag no se parseaba; `LOGO_OUT` env sí andaba. FIX: `--out` se parsea antes de fijar `OUT` (argv en scope módulo). Probado: `--out /tmp/x` crea el dir y escribe ahí.
2. **El gate no puede fallar el build** — real. FIX (2 mitades): (a) golden values congelados del gate DOM en `geometry.test.mjs` (3 tests nuevos: cielo áurea ambient[0]+galaxy[0], starSpec vértice 1 + punta, cielo v10 star[0]) — captan drift de `seeded(20260901)`/`seeded(5150)`/`starSpec` en CI sin Chrome; (b) cableado del gate completo en CI = **issue #59** (implementation-ready, 4 campos) — necesita Chrome en el runner linux, decisión de infra aparte.
3. **PNG dark planos** — verificado contra el HTML aprobado: body con `radial-gradient(#0b1120→#050810)` + halo teal `rgba(0,201,192,.07)`. FIX: `nightBody`/`nightHalo` en los wrappers (square/print/og/apple-touch), escalado al mark; ambiente documentado en manual §3 (antes no existía en ningún doc).
4. **Favicon 16 ilegible + contradicción del manual** — verificado visualmente (trazo 0.2px). FIX: variante **favicon simplificado** (`favicon-{ver}.svg` + PNG 16/32): sólo la C + supernova, viewBox cuadrado computado del bbox real (nada hardcodeado); manual §6 (tabla de variantes) y §7 (mínimo 24px aplica al mark completo; <24px usa el simplificado).

**Valid + actionable (nits fixeados en la misma ronda):** N1 medición del triángulo (lados 1.26/1.72/1.60 R, ángulos 44.6/72.9/62.6 — el claim “isósceles ~50°” era del comentario de la fuente, corregido en manual §4/§1) · N2 rewording de `settled` (conserva espiral+C+supernova+cielo, sin estrellas de vértices) · N5 overclaim del body (“todos los entregables” → excepto el tag) · N6 cross-link manual §3 → `docs/STYLE_GUIDE.md` · N7b línea `node_modules` del .gitignore declarada en el body del PR.

**Valid trade-off (riesgos aceptados explícitamente):**

- N3: la C de base como path único (el HTML la dibuja por líneas) — base quedó como referencia comparativa tras D1; si volviera a ser canónica, restaurar el render por líneas.
- N4: `dist/assets/brand/` no existe tras el build — es premisa de **#56** (integración): jsDelivr (#57) sirve del repo directo; Pages necesita que el build incluya los assets. Anotado como hand-off para #56, no fixeado acá.
- N7a: `.sota/logo-oficial-54/05-review.md` commiteado en repo público — la sección sin completar (la causa del flag) queda completa con este reconcile; los ids de sesión ya viven en los trailers de los commits. Riesgo aceptado: trazabilidad del pipeline > presentación pública; si public-readiness (community-first) lo pide, se slimmea después con OK del operador.

**Noise:** ninguno — los 11 findings del review fresco fueron verificados contra el diff y todos resultaron reales (0 falsos positivos). El gate fresco refutó más que el review in-session del autor, exactamente su función.

**Contrato mejorado para la próxima ronda:** la spec-issue #54 no pedía “los dark replican el ambiente del HTML” ni “el gate corre en CI” — ambas expectativas eran implícitas. En issues de brand futuros: declarar ambiente de fondo y superficie de enforcement del gate.

### Ronda 2 — observación visual del operador (2026-09-25, post-review-fresco)

Feedback: el halo era demasiado intenso; pedía más translúcidez, difusión
más rápida (caída pronunciada), radio aleatorizado por estrella/nodo (no
múltiplo fijo) y color del halo heredado del color característico del nodo
— nodo y estrella como una constelación real. También: lenguaje expansivo
en las descripciones (el símbolo nace y crece; nada de "gira y decrece").

FIX: tratamiento de halo como glifo de marca en `generate-logo.mjs`
(radialGradient + currentColor, radios con semilla fija 90210+j·977,
centro 0.28/0.16 de caída rápida; halo del oro 0.5→0.3); descripciones
expansivas en manual §1. La geometría sigue ≡ DOM (gate verde).

### Resultado de la ronda 1 de corrección

- `83 passed | 1 skipped` (19 en geometry.test: 16 + 3 golden) · CI `build-test` pass
- regeneración determinista re-verificada (los SVG masters y PNG transparentes quedaron byte-idénticos; sólo cambiaron dark y favicons, que es lo corregido)
- QA visual: favicon 32 legible (C + supernova), dark 1024 con gradiente + halo

Veredicto final de la sesión autora: **listo para merge** — los 4 major del review fresco quedaron resueltos en la branch; los trade-offs aceptados están declarados arriba y en el body del PR.