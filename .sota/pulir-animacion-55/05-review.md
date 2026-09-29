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
proyectada hermana **no existe** en `.pi/skills/` de este repo (no hay
`premerge-review/` proyectado acá), y el canónico sí tiene la sección → se usó
ese criterio, no memoria.

Scan sobre `git diff main...HEAD`: **36 líneas borradas**, **1 coincidencia de
marcador** — `[A-Z][A-Z_]{4,}` sobre `CONFIG` en la línea de código
`cGlowGroup.appendChild(el("path", { … CONFIG.cWidth + 6, opacity: .5 }))`,
donde el token **sobrevive** en la línea que la reemplaza
(`… CONFIG.cWidth + 6 }))` — el atributo redundante salió porque la opacidad de
reposo la fija el CSS). Cero coincidencias de palabras normativas
(`NUNCA|jamás|obligator|prohibid`), de códigos `E_*` o de claves de payload.

Las dos únicas líneas de **superficie documental** borradas **sobreviven
reformuladas en el mismo archivo** (verificado por grep, no por memoria):
`docs/brand/logo.md:37` (`#55 puede espejarlo` → `→ **Ya espejado**: …`) y
`docs/brand/logo.md:216` (el párrafo de QA visual, reubicado al mover §11).

**Traces disponibles en este repo — declarado explícitamente**, como pide el
criterio: (1) *registry*: **no aplica** — este repo no es studio ni tiene
registry; (2) *sidecar de provenance*: **no existe** para `docs/brand/logo.md`
(sin ADR-011 → hatch no disponible); (3) *PR body*: disponible y **usado** —
`Trim:` agregado al body del PR #61 con el puntero a las dos líneas.

**Veredicto del pass:** sin trims no declarados.

## Findings

| # | Severidad | Archivo:línea | Finding | Estado |
|---|---|---|---|---|
| F1 | MAJOR | `tools/logo/verify-motion.mjs` (CLI) | `--step` inválido (`--step abc`) producía **exit 1** ("violación") cuando el contrato documentado en `logo.md §11` dice **2** = no se pudo medir. Un argumento inválido no es un hallazgo del artefacto | ✅ round 1 |
| F2 | NIT | `tools/logo/verify-motion.mjs:landmarks` | Un artefacto sin animaciones de estrella hacía explotar `analyze` con un `TypeError` crudo (exit 2 con mensaje inútil) | ✅ round 1 |
| F3 | NIT | `tools/logo/verify-motion.mjs:measure` | Un plan sin fotogramas terminaba en `TypeError` al imprimir la respiración | ✅ round 1 |
| F4 | NIT | `verify-motion.mjs` vs `verify-dom-fidelity.mjs` | Los dos gates comparten necesidad (lanzar Chrome, parsear DOM) pero no un helper común; el de fidelidad tiene sus propios `round`/`parseAttrs`. Deuda **preexistente**, no de este branch: no se acoplan ahora (uno usa `--dump-dom`, el otro CDP) | sin acción (documentado) |
| F5 | Contrato | `docs/brand/logo.md §11` + issue #55 §ADR-lite | La hipótesis "el destello combina 3 efectos solapados" es **parcialmente falsa** por medición: **no había pico de brillo** (la luz sólo decrecía) y el `breathe` del grupo era **inerte**, no una fuente de salto. Causa medida: caída rápida del núcleo (32% en 100ms) + halo desprendido | ✅ contrato corregido (comentario en el issue + §11) |
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

## Veredicto

**PASS-CON-RIESGOS** — 0 BLOCKER · 1 MAJOR (F1, corregido en round 1) · 0 MAJOR
abierto · 3 NIT (2 corregidos, 1 documentado como deuda preexistente) · 1
hallazgo de contrato (F5, corregido en el issue) · 1 parámetro revisado sin
cambio (F6). **Rounds: 1** (ciclo de corrección dentro de la sesión; no hubo
rebuild por swarm porque no hubo swarm).

El `PASS` **no** está condicionado a los riesgos R1/R4 (decisiones del
operador) ni a R2/R3 (límites de esta pasada: los cubre el gate fresco).

## Fresh-context gate (lo pide el operador, no lo corre esta sesión)

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
