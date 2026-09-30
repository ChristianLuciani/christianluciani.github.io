# 05-review.md — SOTA Review de "pulir la animación del logo" (issue #55)

> **Adaptación declarada** (misma que `.sota/logo-oficial-54/05-review.md`, el
> precedente de este repo): **no existe pipeline `.sota/`** — no hay
> `03-spec.md` ni `04-build.md` generados por `sota-swarm`. Los insumos de este
> review son: **contrato = issue #55** (§Esperado + §ADR-lite + §Archivos
> sospechosos) y **registro de build = body del PR #61** +
> `docs/brand/logo.md §11` + los gates. El PR #61 **ya existía** antes de invocar
> sota-review (abierto bajo `session-discipline`, que exige commit+push+PR como
> estado mínimo entregado); este phase apunta a ese PR — no se re-abre ni se
> re-pushea nada. Sin `03-spec.md`, los bloques de corrección se registran acá
> (`## Corrections round N`), como en el precedente.
>
> **Nota de routing honesta (precondición 2, no cumplida)**: la sesión corre en
> **`deepseek-flash`** — el MISMO tier que escribió el código, y no el tier más
> fuerte disponible. El skill exige que el reviewer outrankee al worker
> (`model-routing`: el review rutea hacia arriba, nunca al que escribió). Esta
> pasada in-session **no lo cumple estructuralmente**: vale como primer filtro
> del autor, **no como veredicto final**. El gate real es `premerge-review` en
> sesión fresca (bloque al final).

Branch revisado: `pi/cl/pulir-animacion-55` @ `1e39948` (head al abrir el
review) contra su base `main` @ `9892eda`; las correcciones del round 1 quedan en
`161a9c7`. Diff: 10 archivos, +1477/−36 (antes del round 1).

## Pass 1 — Spec fidelity (contrato = issue #55)

| Compromiso del issue | Evidencia | Estado |
|---|---|---|
| **Transición final sin destello**: la estrella de la punta se desvanece sin pico de brillo perceptible | Gate `verify-motion` congelando fotogramas: invariantes estructurales (opacidad monótona, escala que no crece, curva sin overshoot) + medición (52% / 18% / 8% a los 100 / 200 / 300ms, monótono a 0). Contra la v16 el gate falla con 4 violaciones | ✅ (con F5 abajo) |
| **Velocidades y easings afinados**: el arranque explosivo conserva su fuerza sin sentirse apurado; curvas de trazado y disolución **revisadas contra el manual** | `accelRamp` declarado (era `\|\| 3` implícito) y en 2,2; arranque 125/285ms; las 4 curvas (`easeDraw`/`easeDissolve`/`easePunta`/`easeGlow`) salen del código a `CONFIG.timing` y quedan tabuladas en `docs/brand/logo.md §11` — el manual que el issue pide usar de referencia | ✅ |
| **El settle (glow respirando) entra sin salto visible** | Medido: escalón a ±40ms del settle = **+0,0006** (≤0,004) y la respiración **existe** (0,2182 → 0,2270 = +0,0088; en v16: **0,0000** — era inerte) | ✅ |
| Mantener arrays `delays[]/durs[]` y **no tocar** `stagger`/`seg` finales | Siguen siendo arrays derivados del cronograma; 235/460 intactos (verificado en el gate: el ritmo final es el que gobierna la C) | ✅ |
| §Archivos sospechosos: `CONFIG.timing` (`staggerFast`, `segFast`, `accelRamp`, `hotFade`), `dissolve`, keyframes de disolución, `@keyframes breathe` | Los cinco revisados; `hotFade` **revisado sin cambio** (F6); `dissolve` = el fix; `breathe` pasó al trazo | ✅ |
| §ADR-lite: "probar **desacoplar** los 3 efectos (flash de disolución + arranque del breathe + fade del glow)" | Desacoplados: disolución sin pico, respiración arrancando exactamente en el valor de reposo del glow. La hipótesis, sin embargo, resultó **parcialmente falsa** por medición → **F5** | ⚠️ contrato corregido (comentario en el issue) |

## Pass 2 — Correctness (caza activa; lo que sobrevivió y lo que no)

Re-ejecutado en el head del branch:

- `npx vitest run` → **116 passed / 1 skipped** (13 archivos).
- `npm run logo:verify` → 🏆 `geometry.mjs ≡ DOM aprobado (PR #53)`.
- `npm run build` → ✓.
- `node tools/logo/verify-motion.mjs` → **exit 0**, sin hallazgos.
- el mismo gate contra la v16 de #53 → **exit 1**, 4 violaciones.
- Reproducción real (sin congelar): el settle entra, el glow respira (0,78), **0** restos de `dash` y **0** líneas de calor, replay limpio.

Sobrevivieron sin defecto: el decoder PNG (round-trip con los 5 filtros + RGBA), la política de umbrales (17 tests), las guardas de la sonda (`g.clock`, `cPath`), la agenda `requestAnimationFrame` (idempotente ante re-render: `jobs.length = 0` + guarda por generación), el desacoplamiento del titileo en el congelado, y el contrato de no tocar `main` (todo vive en el worktree W3).

**No sobrevivieron** → corregidos en round 1 (F1–F3).

## Pass 3 — Coherence

Un solo worker (no hay swarm paralelo): no hay *seams* de integración por
construcción. Reparto consistente en los 4 módulos — `chrome.mjs` (lanzar),
`png.mjs` (medir píxeles), `motion-analysis.mjs` (política pura), `verify-motion.mjs`
(adquirir + mostrar) — y naming alineado con `geometry.mjs`/`generate-logo.mjs`
del PR #58. Sin helpers duplicados **nuevos**; F4 anota la duplicación
preexistente de utilidades DOM entre los dos gates.

## Pass 4 — Anti-trim (criterio mecánico, superficie canónica)

Superficie resuelta en el canónico de skills-studio
(`registry/authored/premerge-review/SKILL.md`, §Anti-trim pass): la copia
proyectada hermana **no existe** en `.pi/skills/` de este repo, y el canónico sí
tiene la sección → se usó ese criterio, no memoria.

**Corrección del scan (F5 del review fresco):** mi primera pasada ancló el patrón
de payload (`^[a-z_]+ =`) y reportó 1 coincidencia. El criterio lo define **sin
anclar** — re-corrido con los regex exactos sobre el diff final
(`main...HEAD`, 60 líneas borradas) da **12 coincidencias**: 8 del patrón payload
(`timers =`, `anims =`, `len =`, `reduced =`, `args =`, `dump =`) y 4 de forma
env-var (`CONFIG` ×2, `CHROME_CANDIDATES` ×2, `CHROME_PATH`). **Cero** de palabra
normativa y **cero** de código `E_*`.

Resolución de cada token (trace 1 — "sobrevive en una superficie del repo",
verificado por grep):

| Token borrado | ¿Dónde sobrevive? |
|---|---|
| `CONFIG` | el artefacto y `motion-analysis.mjs` (5 archivos) — la línea del `\|\| 3` se eliminó justamente para que no haya default silencioso |
| `CHROME_CANDIDATES` / `process.env.CHROME_PATH` | `chrome.mjs` (renombrado `CANDIDATES`, misma lista + `CHROME_PATH`) y `generate-logo.mjs` |
| `reduced =` / `args =` / `dump =` | `chrome.mjs`: el `dumpDom` que el gate de fidelidad ahora **importa** (era la copia local que se borró) |
| `anims =` / `len =` | siguen vivos como identificadores en el arnés |
| `timers =` (×2) | **no sobrevive y es deliberado**: la agenda `setTimeout` fue reemplazada por la agenda sobre el reloj de animación (`jobs`/`tick`), declarado en `logo.md §11` y en el body del PR |

**Traces disponibles en este repo — declarado explícitamente**, como pide el
criterio: (1) *registry*: **no aplica** (este repo no es studio ni tiene
registry); (2) *sidecar de provenance*: **no existe** para `docs/brand/logo.md`
(sin ADR-011 → hatch no disponible); (3) *PR body*: disponible y **usado** — el
bloque `Trim:` del PR #61 lista las 12 coincidencias y las dos líneas de la
superficie documental.

Las dos únicas líneas de **superficie documental** borradas **sobreviven
reformuladas en el mismo archivo** (grep, no memoria): `docs/brand/logo.md:37`
(`#55 puede espejarlo` → `→ **Ya espejado**: …`) y `logo.md:216` (el párrafo de QA
visual, reubicado al mover §11).

**Veredicto del pass:** sin trims no declarados; 12 coincidencias mecánicas, todas
código o declaradas (no hay cláusula normativa entre ellas).

## Findings

| # | Severidad | Archivo:línea | Finding | Estado |
|---|---|---|---|---|
| F1 | MAJOR | `tools/logo/verify-motion.mjs` (CLI) | `--step` inválido (`--step abc`) producía **exit 1** ("violación") cuando el contrato documentado en `logo.md §11` dice **2** = no se pudo medir. Un argumento inválido no es un hallazgo del artefacto | ✅ round 1 |
| F2 | NIT | `tools/logo/verify-motion.mjs:landmarks` | Un artefacto sin animaciones de estrella hacía explotar `analyze` con un `TypeError` crudo (exit 2 con mensaje inútil) | ✅ round 1 |
| F3 | NIT | `tools/logo/verify-motion.mjs:measure` | Un plan sin fotogramas terminaba en `TypeError` al imprimir la respiración | ✅ round 1 |
| F4 | NIT | `verify-motion.mjs` vs `verify-dom-fidelity.mjs` | Los dos gates comparten necesidad (lanzar Chrome, parsear DOM) pero no un helper común; el de fidelidad tiene sus propios `round`/`parseAttrs`. Deuda **preexistente**, no de este branch: no se acoplan ahora (uno usa `--dump-dom`, el otro CDP) | sin acción (documentado) |
| F5 | Contrato | `docs/brand/logo.md §11` + issue #55 §ADR-lite | La hipótesis "el destello combina 3 efectos solapados" es **parcialmente falsa** por medición: **no había pico de brillo** (la luz sólo decrecía) y el `breathe` del grupo era **inerte**, no una fuente de salto. Causa medida: caída rápida del núcleo (32% en 100ms) + halo desprendido | ✅ contrato corregido (comentario en el issue + §11) |
| F5b | MAJOR (del review fresco) | Pass 4 de este archivo | El scan anti-trim estaba **anclado**: reportaba 1 coincidencia cuando el criterio (sin anclar) da **12**. Sub-reporte de evidencia en el reporte y en el PR | ✅ round 2 (Pass 4 reescrito + bloque `Trim:` corregido) |
| F6 | Ninguna (revisado sin cambio) | `CONFIG.timing.hotFade` | Nombrado como sospechoso por el issue: sus fades terminan **antes** de la ventana de la punta y la medición del tip es monótona ⇒ valor intacto (500ms). Lo que sí cambió: su curva salió del código a `CONFIG.timing.easeDissolve` | cerrado |

### Corrections round 1 (aplicado en esta sesión, sin swarm)

F1–F3 son del arnés, no del artefacto: se corrigieron directo en el branch
(guardas + validación de argumento) y se re-ejecutó la batería. Contrato de
salida verificado **después** del round: artefacto → `0` · `--step abc` → `2` ·
v16 → `1` · HTML inexistente → `2`.

## Riesgos aceptados (visibles para el operador)

- **R1 — `prefers-reduced-motion`**: el glow sigue respirando en modo reducido
  (preexistente; este PR lo reduce de amplitud: antes respiraba el grupo entero,
  ahora el trazo). El artefacto documenta "renderiza estado final". Decisión de
  marca: una línea (`@media (prefers-reduced-motion: reduce){ .c-glow path{animation:none} }`).
- **R2 — routing**: esta pasada corre en el tier que escribió el código
  (precondición 2 del skill no cumplida). El veredicto real es el fresco.
- **R3 — autor-revisor**: mismo contexto, mismos puntos ciegos. La revisión de
  autor publicada en el PR #61 encontró 5 bloqueantes y 2 agujeros de política,
  lo que indica que la pasada no fue ceremonial — pero no sustituye al fresco.
- **R4 — tag `v1.0.0`**: sigue pendiente del operador sobre main (heredado de
  #54; este PR no lo toca).

## Fresh-context reconcile (reporte del gate fresco)

El `premerge-review` en sesión fresca **corrió** y publicó su veredicto:
**PASS-CON-RIESGOS · 0 BLOCKER · 6 MAJOR · 3 NIT**, todo medido (reprodujo el gate,
mutó el artefacto para v16 y verificó que la política dispara). Re-leí el diff
contra cada finding antes de clasificar — ninguno se descartó de memoria.

### Bucket 1 — Contract misread

**Ninguno.** Los 9 hallazgos apuntan a código o a evidencia, no a una cláusula
ambigua del contrato. (El contrato *sí* tenía un error, pero no lo detectó este
reporte: lo detectó la medición — es F5.)

### Bucket 2 — Valid + actionable (10) → `## Corrections round 2` (`ced690f`)

| Finding | Qué era | Corrección |
|---|---|---|
| F1 MAJOR | 6 umbrales declarados y nunca leídos en el gate (el knob más visible no hacía nada) | umbrales sólo en `motion-analysis.mjs`; el gate importa `THRESHOLDS` |
| F2 MAJOR | **autocontrol de deriva vacuo**: al pausar, `startTime` queda null ⇒ el reloj devolvía null y la deriva siempre 0 ("aprobar en silencio") | se mide el `currentTime` efectivo contra el esperado de cada animación; si no es medible, **falla** |
| F3 MAJOR | la reproducción de la v16 exigía parchearla (el gate pedía `g.clock`) y el parche no estaba commiteado | sin reloj, el settle se aproxima con el fin de la última animación y el reporte **declara la fuente**; la v16 cruda de `main` se mide directo → **5 violaciones** |
| F4 MAJOR | `dumpDom`/`run`/`FRAME_ARGS` muertos y docblock que afirmaba una compartición inexistente | el gate de fidelidad **importa** el lanzador compartido (fidelidad sigue verde); `FRAME_ARGS` fuera (el congelado es `pause`+`currentTime`) |
| F5 MAJOR | scan anti-trim anclado: 1 coincidencia reportada vs **12** reales | Pass 4 reescrito + bloque `Trim:` del PR corregido, con resolución por token |
| F6 MAJOR | el criterio 2 del issue ("el arranque conserva su fuerza") se afirmaba **sin instrumento** | el artefacto publica su cronograma (`svg.dataset.schedule`) y el gate lo mide: piso objetivo (monotonía, concurrencia ≥2, contraste ≤60%, extremos == CONFIG) + perfil reportado |
| F7 NIT | `--step 5000` aprobaba con 5 fotogramas | piso de muestreo de la disolución → **exit 2** |
| F8 NIT | la figura comparaba instantes no equivalentes | regenerada **alineada por fase** (d0 / +200 / +400ms) con el rótulo explícito; la comparación matched confirma el hallazgo |
| F9 NIT | el `\|\| 3` de `accelRamp` seguía en el código | eliminado + guarda explícita (sin defaults silenciosos) |
| F5b | (derivado) evidencia sub-reportada en el PR | bloque `Trim:` corregido en el body del PR |

Verificación post-round: `npm test` **121 passed / 1 skipped** · `logo:verify` 🏆 ·
`build` ✓ · gate artefacto **exit 0** · gate v16 cruda **exit 1** (5 violaciones) ·
`--step 5000` **exit 2** · reproducción real limpia (respira, 0 restos).

Extra del round (no pedido por el review, sí necesario): la sesión CDP **reintenta
una vez**. Lo medí dos veces en esta sesión: Chrome se lanza sin abrir el puerto y
el gate quedaba en "CDP no responde" — un fallo transitorio de entorno no debe
leerse como "no se pudo medir".

### Bucket 3 — Valid trade-off (aceptados, visibles)

- **R5 — reproducibilidad *same-machine*.** El gate necesita Chrome: en CI no corre.
  Acepto el riesgo porque el veredicto *sí* está cubierto en CI (121 tests, de los
  cuales 34 son de la política y del decoder) y el wiring de Chrome en CI es #59.
- **R6 — el modo `prefers-reduced-motion` no publica `g.clock`**, así que el gate de
  movimiento no puede verlo (sale **exit 2**, no un aprobado silencioso — que es el
  comportamiento correcto). Ese modo lo cubre el gate de fidelidad
  (`--force-prefers-reduced-motion`: espiral y C exactos, sin hot-lines ni
  constelación). Se suma a R1 (el glow respira en modo reducido: decisión de marca).

### Bucket 4 — Noise

**Ninguno.** Dos notas informativas quedan registradas: (a) el `behind` stale de la
API (la base real era `main`); (b) al validar F8, el revisor midió instantes
*matched* con un mutante de la punta y el hallazgo se sostuvo (halo 6,2 vs 5,0) —
eso no fue ruido, fue evidencia a favor del fix y a la vez prueba de que la figura
rotulaba mal la fase.

### Guarda de "doubt theater"

Las dos pasadas encontraron cosas **accionables** y **disjuntas**: la del autor, 7
(5 bloqueantes del código + 2 agujeros de política); la fresca, 9 — y **6 de sus 6
MAJOR son del instrumento**, justo lo que el autor no puede ver desde su propio
contexto (el valor de la sesión limpia). 17 hallazgos accionables en total, 3
riesgos aceptados explícitos, 0 descartados por conveniencia.

## Veredicto

**PASS-CON-RIESGOS** — 0 BLOCKER · 0 MAJOR abierto (1 en round 1 + 6 del gate
fresco, todos cerrados) · 0 NIT abierto (3 + 3, cerrados o documentados) · 1
hallazgo de contrato corregido (F5) · 1 parámetro revisado sin cambio.
**Rounds: 2** (round 1 = correcciones del autor; round 2 = reconciliación del gate
fresco). Loop bound cumplido: no queda BLOCKER ni MAJOR, y no hace falta una
segunda invocación fresca (el skill la pide sólo si sobrevive un BLOCKER
sustantivo).

El `PASS` **no** está condicionado a los riesgos R1/R4 (decisiones del operador)
ni a R2/R3 (límites de esta pasada: los cubre el gate fresco, ya corrido) ni a
R5/R6 (aceptados y declarados).

## Fresh-context gate — YA CORRIDO (reporte reconciliado arriba)

`premerge-review` corrió en sesión fresca y publicó su veredicto como comentario
en el PR: **PASS-CON-RIESGOS · 6 MAJOR · 3 NIT**, todo medido. Los 10 findings
accionables se cerraron en round 2 (`ced690f`). La política de publicación se
cumplió: el reporte es un comentario del PR, no un texto pegado.

Si querés una **segunda** pasada fresca (opcional: el skill sólo la exige si
sobrevive un BLOCKER), este es el bloque; con la ronda 2 conviene apuntarla al
head nuevo (`ced690f`):

`premerge-review` es la pasada terminal de duda de este phase: READ-ONLY sobre
el código y **publica su veredicto como comentario en el PR**.

Verificación de proyección (paso 9 del skill): el skill proyectado en
`.pi/skills/` de este repo **no incluye `premerge-review`** (no está la carpeta
hermana) → la sesión fresca debe apuntar al **canónico**
`skills-studio/registry/authored/premerge-review/SKILL.md`, que sí tiene la
sección de anti-trim y la de publicación. Dicho explícitamente, no se saltea en
silencio.

```text
Pre-merge fresh-context review requested.
Open a new, clean session and paste:

  "Run premerge-review on https://github.com/ChristianLuciani/christianluciani.github.io/pull/61.
   The PR is not yet merged. Review READ-ONLY on the code — no worktree/branch/commit;
   publish your report as a comment on the PR. The skill's canonical copy lives at
   /Users/eva/PROJECTOS/GitHub/ChristianLuciani/skills-studio/registry/authored/premerge-review/SKILL.md
   (it is not projected in this repo's .pi/skills)."

The reviewer posts its report as a PR comment — read it from there; I (the
authoring session) will reconcile its findings and apply the fixes to the branch.
```

## Hand-off y re-entrada de feedback

- El PR **#61 ya está abierto y CI-verde** sobre `pi/cl/pulir-animacion-55`
  (base `main`): no hay comandos de push/PR pendientes de este phase. **El merge
  es del operador** (`repo-governance`: nunca merges por iniciativa del agente).
- Re-entrada de tu feedback post-prueba: **hallazgo chico** → bloque de
  corrección (como round 2, acá o en el PR); **cambio de criterio/diseño** →
  ronda nueva de `/sota-workflow` con el issue actualizado. Esta ruta queda
  declarada, como pide el skill.
- Después del merge: #56 (integración en el sitio) puede tomar este artefacto;
  #59 conviene que cablee **los dos** gates de Chrome.
