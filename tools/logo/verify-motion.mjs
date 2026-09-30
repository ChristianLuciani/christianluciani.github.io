/**
 * verify-motion.mjs — gate de MOVIMIENTO de la animación del logo (issue #55).
 *
 * Por qué existe: el gate de fidelidad (`verify-dom-fidelity.mjs`) prueba que la
 * geometría del DOM no divergió; no ve el MOVIMIENTO. Los defectos de #55
 * (destello sobre la punta durante la disolución de la estrella y entrada del
 * settle del glow) viven en el render compuesto y en el cronograma, así que este
 * gate mira las dos cosas: el cronograma real del artefacto y el fotograma real.
 *
 * Cómo mide:
 *  1. Cronograma REAL — `document.getAnimations()` del artefacto vivo: keyframes,
 *     easings, ventanas de disolución. Nada de un puerto que pueda divergir.
 *  2. Fotogramas EXACTOS — una sesión CDP carga la página una vez y congela el
 *     estado con `pause()` + `currentTime = T` (seek). Para que eso sea posible
 *     el artefacto agenda sus efectos sobre el reloj de ANIMACIÓN (no setTimeout,
 *     ver `aurea7.html`) y el gate congela el titileo del cielo, que es un loop
 *     decorativo ajeno al cronograma del espiral.
 *  3. Regiones — la punta de la C (donde se disuelve la estrella) y un punto del
 *     cuerpo del trazo (donde respira el glow), con la línea dorada enmascarada
 *     para medir SÓLO el glow que se abre fuera del trazo.
 *
 * Qué verifica:
 *  · SIN DESTELLO (estructural, determinista): la disolución de la punta no puede
 *    tener un pico de brillo — su opacidad no puede subir, su escala no puede
 *    crecer (el glow escalado es el bloom que se veía) y su curva no puede tener
 *    overshoot (y > 1 ⇒ el valor intermedio supera el inicial).
 *  · SIN DESTELLO (medido): la luz propia de la estrella y el glow fuera del
 *    trazo nunca suben mientras la punta se apaga.
 *  · SETTLE SIN SALTO (medido): al entrar la respiración, el cuerpo de la C no
 *    pega escalón, y el glow efectivamente respira (en v16 la respiración vivía
 *    en el grupo que una animación de script fijaba en 1: nunca respiraba).
 *  · AUTOQUECHEOS: la punta ve la estrella antes y no después, hay píxel brillante
 *    en el settled, y el congelado no deriva. Si fallan, el gate FALLA en vez de
 *    aprobar en silencio.
 *
 * Uso:
 *   node tools/logo/verify-motion.mjs             # gate (exit 1 si viola)
 *   node tools/logo/verify-motion.mjs --report     # curva, sin veredicto
 *   --html <path> --frames <dir> --step <ms>
 *
 * Salida: 0 sin hallazgos · 1 violaciones · 2 no se pudo medir (Chrome, artefacto
 * o sonda) — el 2 existe para que un fallo de entorno no se lea como "limpio".
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { session } from "./chrome.mjs";
import { decodePng, sampleRegion, differenceStats, redness } from "./png.mjs";
/* la política (umbrales y veredicto) vive en un módulo puro y testeado en CI;
   acá sólo se adquiere (CDP + fotogramas) y se muestra */
import { THRESHOLDS, analyze } from "./motion-analysis.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const WIN = { width: 800, height: 800 };

/* Los umbrales viven en `motion-analysis.mjs` (THRESHOLDS): acá había copias que
   nadie leía — el knobs más visible del gate no hacía nada. Una sola fuente. */

/* La sonda no toca el artefacto: lo lee (cronograma, geometría, respiración). */
const PROBE = `(() => {
  const cls = (a) => (a.effect && a.effect.target && a.effect.target.getAttribute
    && a.effect.target.getAttribute('class')) || '';
  const anims = document.getAnimations().map((a) => {
    const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : {};
    const kf = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : [];
    const tg = a.effect && a.effect.target;
    return { cls: cls(a), tag: tg && tg.tagName, delay: t.delay, duration: t.duration,
      easing: t.easing, kf: kf.map((k) => ({ offset: k.computedOffset, opacity: k.opacity, transform: k.transform })) };
  });
  const svg = document.getElementById('logo');
  const cpath = [...document.querySelectorAll('path.seg')].find((p) => p.getAttribute('stroke'));
  const cGlowPath = document.querySelector('.c-glow path');
  const breathe = (() => {
    const rules = [...document.styleSheets].flatMap((sh) => { try { return [...sh.cssRules]; } catch { return []; } });
    const kf = rules.find((r) => r.type === CSSRule.KEYFRAMES_RULE && r.name === 'breathe');
    if (!kf) return null;
    return {
      frames: [...kf.cssRules].map((k) => ({ key: k.keyText, opacity: k.style.opacity })),
      rest: cGlowPath ? getComputedStyle(cGlowPath).opacity : null,
      targets: rules.filter((r) => r.selectorText && /breathe/.test(String(r.style.animationName || r.style.animation || '')))
        .map((r) => r.selectorText),
    };
  })();
  /* sólo lo que el gate lee: animaciones, respiración, la C, el cronograma
     declarado (delays[]/durs[] → perfil del arranque) y los parámetros */
  return JSON.stringify({ anims, breathe, cPath: cpath ? cpath.getAttribute('d') : null,
    schedule: svg.dataset.schedule ? JSON.parse(svg.dataset.schedule) : null
  , timing: CONFIG.timing });
})()`;

/** congelador: mueve el cronograma al tiempo T (función del tiempo, no del reloj) */
const LZ = (settleAt) => `(() => {
  window.__lz = {
    settleAt: ${settleAt},
    clock: () => {
      const list = document.getAnimations()
        .filter((a) => /(^|\\s)(seg|star|clock|c-glow)(\\s|$)/.test((a.effect && a.effect.target
          && a.effect.target.getAttribute && a.effect.target.getAttribute('class')) || ''))
        .map((a) => a.startTime).filter((v) => typeof v === 'number');
      return list.length ? document.timeline.currentTime - Math.max(...list) : null;
    },
    seek: (T) => {
      const deviation = [];
      for (const a of document.getAnimations()) {
        a.pause();
        const css = a.animationName;
        /* valor ESPERADO de cada animación en el instante T. El titileo y el fade
           de entrada son loops decorativos (se congelan en un punto fijo); la
           respiración nace con el settle, así que su tiempo es T - settleAt. */
        let want;
        if (css === 'twinkle') {
          /* en su PICO (mitad del período propio de cada estrella): así todas las
             estrellas están a su máximo y estables, en vez de apagadas en fase 0 */
          const d = a.effect.getComputedTiming().duration;
          want = typeof d === 'number' ? d / 2 : 0;
        } else if (css === 'fadeIn') want = 1e6; // cielo ya visible (y no vuelve a latir)
        else if (css === 'breathe') want = Math.max(0, T - window.__lz.settleAt);
        else want = T;
        a.currentTime = want;
        /* verificación del congelado: al pausar, startTime queda null, así que la
           deriva NO se puede calcular con el reloj — se mide sobre el currentTime
           efectivo contra el esperado (null = no quedó congelada) */
        deviation.push(a.currentTime == null ? Infinity : Math.abs(a.currentTime - want));
      }
      return deviation.length ? Math.max(...deviation) : Infinity;
    },
  };
  return true;
})()`;

/**
 * Máscara del área alrededor de la punta EXCLUYENDO la línea dorada: ahí el único
 * resplandor posible es el de la estrella. Sin enmascarar el trazo, el oro domina
 * la medición y esconde el halo (fue el error de la primera versión del gate).
 */
function outsideStrokeMask(img, b, tip, r, strokeR = 7) {
  const mask = new Uint8Array(img.width * img.height);
  const dx = tip.x - b.x, dy = tip.y - b.y;
  const len2 = dx * dx + dy * dy || 1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const px = x - tip.x, py = y - tip.y;
      if (px * px + py * py > r * r) continue;
      const t = Math.min(Math.max(((x - b.x) * dx + (y - b.y) * dy) / len2, 0), 1);
      const ox = x - (b.x + t * dx), oy = y - (b.y + t * dy);
      if (ox * ox + oy * oy < strokeR * strokeR) continue; // sobre el trazo
      mask[y * img.width + x] = 1;
    }
  }
  return mask;
}

/** suma del glow propio (luminancia en exceso sobre la referencia) fuera del trazo */
function haloOutside(img, ref, mask) {
  let sum = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const p = i * 4;
    const d = (0.2126 * (img.rgba[p] - ref.rgba[p]) + 0.7152 * (img.rgba[p + 1] - ref.rgba[p + 1])
      + 0.0722 * (img.rgba[p + 2] - ref.rgba[p + 2])) / 255;
    if (d > 0) sum += d;
  }
  return sum;
}

/**
 * Mapa SVG (0..800) → píxeles del fotograma, con el rectángulo MEDIDO en la
 * misma sesión CDP que produce los fotogramas. Antes se derivaba de la regla de
 * layout del artefacto (92vmin, tope 620px): funcionaba, pero duplicaba una
 * constante ajena — si el artefacto cambia su stage, el muestreo se corre en
 * silencio. El rect y el PNG comparten viewport, así que la medición manda.
 */
function mapper(rect) {
  const s = rect.width / 800;
  return (x, y) => ({ x: rect.left + x * s, y: rect.top + y * s });
}

function landmarks(probe) {
  const m = probe.cPath.match(/M\s*([\d.-]+)\s+([\d.-]+)\s*L\s*([\d.-]+)\s+([\d.-]+)\s*L\s*([\d.-]+)\s+([\d.-]+)/);
  if (!m) throw new Error("no pude leer el path de la C del DOM");
  const [, ax, ay, bx, by, tx, ty] = m.map(Number);
  const stars = probe.anims.filter((a) => a.cls === "star" && a.tag === "g");
  const punta = stars.reduce((best, a) => (best && best.delay > a.delay ? best : a), null);
  const clock = probe.anims.find((a) => a.cls === "clock");
  if (!punta) throw new Error("el artefacto no tiene la disolución de la estrella de la punta (¿sin constelación?)");
  /* El reloj (`g.clock`) publica el fin exacto del cronograma. Sin él —versiones
     anteriores a #55— se aproxima con el fin de la última animación: el gate sigue
     midiendo esa versión, pero el reporte dice de dónde salió el settle. */
  const lastEnd = probe.anims.reduce((max, a) => Math.max(max, a.delay + a.duration), 0);
  const drawEnd = probe.anims.filter((a) => a.tag === "path" && a.cls === "seg")
    .reduce((max, a) => Math.max(max, a.delay + a.duration), 0);
  return {
    C: { a: { x: ax, y: ay }, b: { x: bx, y: by }, tip: { x: tx, y: ty } },
    punta, drawEnd, timing: probe.timing ?? null,
    settle: clock ? clock.delay + clock.duration : lastEnd,
    settleSource: clock ? "g.clock" : `fin de la última animación (${Math.round(lastEnd)}ms): el artefacto no publica g.clock`,
    /* dos discos: el ajustado mide la intensidad de la estrella, el amplio mide
       el HALO — el destello de #55 es el glow que se agranda al apagarse, y eso
       se ve en la luz total del halo, no en el pico del centro */
    r: 26, rHalo: 70,
  };
}

async function measure(html, plan, framesDir) {
  const s = await session(html, WIN);
  try {
    const probe = JSON.parse(await s.eval(PROBE));
    const L = landmarks(probe);
    /* el stage: mismo viewport que los fotogramas (misma sesión) */
    const stage = await s.eval(`(() => { const r = document.getElementById('logo').getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height }; })()`);
    if (!(stage.width > 0)) throw new Error(`el SVG del logo mide ${stage.width}px: no puedo encuadrar la punta`);
    const times = plan(L);
    await s.eval(LZ(L.settle));
    const rows = [];
    /* se retienen los fotogramas decodificados para la pasada de diferencia: la
       cantidad está acotada por el plan (~15-40 fotogramas) */
    const frames = [];
    let px = null;
    for (const T of times) {
      await s.eval(`__lz.seek(${T})`);
      /* el settle aplica la clase desde el fin del reloj: un frame para que
         corran los microtasks y aparezca la respiración, y re-seek con ella */
      await s.eval(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(1))))`);
      const drift = await s.eval(`__lz.seek(${T})`);
      const png = await s.capture();
      if (framesDir) writeFileSync(join(framesDir, `frame-${String(T).padStart(5, "0")}.png`), png);
      const img = decodePng(png);
      px ??= mapper(stage);
      const tipRed = sampleRegion(img, { ...px(L.C.tip.x, L.C.tip.y), r: L.r, metric: redness });
      const tipLum = sampleRegion(img, { ...px(L.C.tip.x, L.C.tip.y), r: L.r });
      const glow = sampleRegion(img, { ...px((L.C.a.x + L.C.b.x) / 2, (L.C.a.y + L.C.b.y) / 2), r: L.r });
      frames.push(img);
      rows.push({ T, drift, tipRed: tipRed.mean, tipRedMax: tipRed.max, tipMax: tipLum.max,
        tip: tipLum.mean, body: glow.mean });
    }
    if (!rows.length) throw new Error(`el plan no produjo fotogramas (¿--step=${stepMs}?)`);
    /* La referencia es el último fotograma: la pieza settled, sin la estrella de
       la punta. Restarla deja SÓLO la luz de esa estrella (cancela el cielo, las
       estrellas de fondo y el oro de la C, que no tienen canal estrella). */
    const ref = frames.at(-1);
    const outside = outsideStrokeMask(ref, px(L.C.b), px(L.C.tip), L.rHalo);
    for (let i = 0; i < rows.length; i++) {
      const halo = differenceStats(frames[i], ref, { ...px(L.C.tip.x, L.C.tip.y), r: L.rHalo, metric: redness });
      rows[i].light = halo.light;   // luz propia de la estrella (canal estrella)
      rows[i].halo = haloOutside(frames[i], ref, outside); // glow que se abre fuera del trazo
    }
    return { probe, L, rows, stage };
  } finally {
    s.close();
  }
}

/* ─────────────────────────────── presentación ─────────────────────────
   El veredicto vive en motion-analysis.mjs (puro, testeado en CI). Acá sólo se
   imprime: primero la curva, después las métricas con sus umbrales, y al final
   los hallazgos. La tabla tiene que alcanzar para auditar a mano sin volver a
   correr nada. */
function printReport({ probe, L, rows }, out, framesDir) {
  const { from, to, peak } = out;
  console.log(`artefacto: ${probe.anims.length} animaciones · C = 1 path · respiración en ${probe.breathe?.targets?.join(" / ")}`);
  console.log(`punta se apaga ${out.d0.toFixed(0)}→${out.d1.toFixed(0)}ms (${L.punta.duration}ms, ${L.punta.easing})`);
  console.log(`C trazada hasta ${L.drawEnd.toFixed(0)}ms · settle ${L.settle.toFixed(0)}ms (${L.settleSource}) · deriva del congelado ${Number.isFinite(out.drift) ? `≤${out.drift.toFixed(0)}ms` : "NO MEDIBLE"}`);
  console.log("");
  console.log("    t(ms)   luz estrella   glow fuera   rojoMax   punta   glow");
  for (const r of rows) {
    const inWin = r.T >= from && r.T <= to;
    const rel = inWin && peak > 0 ? ` (${((r.light / peak) * 100).toFixed(0)}%)` : "";
    console.log(`${String(r.T).padStart(9)}  ${r.light.toFixed(2).padStart(8)}${rel.padEnd(7)}  ${r.halo.toFixed(1).padStart(9)}   ${r.tipRedMax.toFixed(3)}    ${r.tip.toFixed(4)}  ${r.body.toFixed(4)}`);
  }
  console.log("");
  console.log(`ventana del destello: ${from.toFixed(0)}→${to.toFixed(0)}ms`);
  console.log(`autochequeo punta: rojoMax antes=${rows.filter((r) => r.T <= out.d0).at(-1)?.tipRedMax.toFixed(3)}`
    + ` vs settled=${rows.at(-1).tipRedMax.toFixed(3)} (Δ=${out.starSeen.toFixed(3)})`
    + ` · píxel más brillante settled=${out.tipMaxSettled.toFixed(3)}`);
  console.log(`destello — luz de la estrella: suba máx ${sign(out.flash.delta, 3)} (máx ${THRESHOLDS.flash})`
    + ` · bloom ${sign(out.bloom.delta, 3)} · sostenida ${sign(out.sustain.delta, 3)}`
    + ` · glow fuera del trazo: suba máx ${sign(out.haloUp.delta, 2)} (máx ${THRESHOLDS.halo})`);
  if (out.settle)
    console.log(`settle (${L.settle.toFixed(0)}ms): cuerpo ${out.settle.before.body.toFixed(4)} → ${out.settle.after.body.toFixed(4)}`
      + ` = ${sign(out.settle.delta, 4)} (máx ${THRESHOLDS.settle})`);
  if (out.startup) {
    const s = out.startup;
    console.log(`arranque: pico ${s.peakConcurrency.n} tramo(s) trazando a la vez en ${Math.round(s.peakConcurrency.t)}ms`
      + ` · stagger ${s.firstStagger.toFixed(0)}→${s.lastStagger.toFixed(0)}ms${s.monotone ? " (monótono)" : " (NO monótono)"}`
      + ` · aterrizados ${Object.entries(s.landed).map(([k, v]) => `${v}@${k}`).join(" ")}`);
  }
  console.log(`respiración: glow ${out.breathe.a.body.toFixed(4)} → ${out.breathe.b.body.toFixed(4)}`
    + ` = ${sign(out.breathe.delta, 4)} (mín ${THRESHOLDS.breathe})`);
  if (framesDir) console.log(`fotogramas: ${framesDir}`);
}

const sign = (v, digits) => `${v >= 0 ? "+" : ""}${v.toFixed(digits)}`;

function printVerdict(out, verdict) {
  if (!verdict) return;
  if (!out.fails.length) {
    console.log("🏆 MOVIMIENTO: la punta se apaga sin pico de brillo, el glow respira y el settle no pega salto");
    return;
  }
  for (const f of out.fails) console.error(`❌ MOVIMIENTO: ${f}`);
  process.exitCode = 1;
}

/* ─────────────────────────────── CLI ────────────────────────────────── */
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
};
const html = resolve(arg("html", join(ROOT, "proposals/logo-triangulo-espiral/aurea7.html")));
const stepMs = Number(arg("step", 100));
const framesDir = arg("frames", null);
const verdict = !process.argv.includes("--report");

/** instantes a muestrear, derivados del cronograma real del artefacto */
function plan(L) {
  const d0 = L.punta.delay, d1 = L.punta.delay + L.punta.duration;
  const times = [];
  for (let t = d0 - 200; t <= d1 + 150; t += stepMs) times.push(Math.round(t));
  /* el settle se mide a ±40ms (y un punto más allá, ya estabilizado) */
  for (const t of [L.settle - 40, L.settle + 40, L.settle + 900]) times.push(Math.round(t));
  /* autocontrol: la estrella de la punta existe al arrancar la pieza */
  times.push(Math.round(d0 - 800));
  /* el arranque (criterio 2 de #55) se MIRA, no sólo se computa: fotogramas del
     estallido para el strip de --frames */
  if (L.timing?.start != null) for (const dt of [200, 800, 1400]) times.push(Math.round(L.timing.start + dt));
  return [...new Set(times)].sort((a, b) => a - b);
}

/** el plan tiene que muestrear la disolución: con un paso enorme "no mide" (exit 2) */
function planQuality(L, times) {
  const inWindow = times.filter((t) => t >= L.punta.delay - 100 && t <= L.punta.delay + L.punta.duration + 150).length;
  return inWindow >= 5 ? null : `el plan muestrea ${inWindow} fotograma(s) de la disolución: --step ${stepMs} es demasiado grueso`;
}

if (!Number.isFinite(stepMs) || stepMs <= 0) {
  /* el contrato dice: 2 = no pude medir. Un argumento inválido no es una violación */
  console.error(`❌ MOVIMIENTO: no pude medir — --step inválido: ${JSON.stringify(arg("step"))} (espero ms > 0)`);
  process.exit(2);
}

try {
  if (framesDir) mkdirSync(framesDir, { recursive: true });
  console.log("midiendo fotogramas congelados…");
  const data = await measure(html, (L) => {
    const times = plan(L);
    const bad = planQuality(L, times);
    if (bad) throw new Error(bad);
    console.log(`${times.length} fotogramas: ${times[0]}→${times.at(-1)}ms (paso ${stepMs})`);
    return times;
  }, framesDir);
  const out = analyze(data, { stepMs });
  printReport(data, out, framesDir);
  printVerdict(out, verdict);
} catch (err) {
  /* 2 = no se pudo medir: sin Chrome (o sin artefacto/sonda) el gate NO pasa */
  console.error(`❌ MOVIMIENTO: no pude medir — ${err.message}`);
  process.exitCode = 2;
}
