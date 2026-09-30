/**
 * motion-analysis.mjs — política del gate de movimiento (issue #55), en funciones puras.
 *
 * Por qué está separado de `verify-motion.mjs`: la adquisición (sesión CDP,
 * fotogramas, máscaras) necesita Chrome y no corre en CI; la POLÍTICA (qué se
 * considera un destello, un salto de settle o una respiración inerte) es aritmética
 * sobre series y tiene que estar testeada siempre, en cualquier máquina.
 * `verify-motion.mjs` adquiere y muestra; acá vive el veredicto.
 *
 * Los umbrales están calibrados contra la medición antes/después del fix (v16 vs
 * fix #55, fotogramas congelados): el ruido entre corridas es ≤0.001 y los
 * defectos medidos son de otro orden, así que hay margen para los dos lados.
 * Ver `docs/brand/logo.md` §Movimiento.
 */

export const THRESHOLDS = {
  /* arranque (criterio 2 de #55): piso objetivo de "sigue siendo un estallido" */
  burstFloor: 2,      // tramos trazando a la vez en el pico del arranque
  burstContrast: 0.6, // el primer stagger tiene que ser ≤ 60% del final (hay contraste)
  flash: 1.0,      // suba máxima tolerada de la luz de la estrella por paso (suma en el halo)
  bloom: 2.0,      // suba máxima tolerada sobre el mínimo previo
  halo: 1.0,       // suba máxima tolerada del glow fuera del trazo por paso
  settle: 0.004,   // escalón máximo tolerado al entrar el settle (luminancia del cuerpo de la C)
  breathe: 0.004,  // cambio mínimo del glow para considerar que respira
  drift: 5,        // ms de deriva máxima del congelado respecto del instante pedido
  starSeen: 0.002, // la punta tiene que ver la estrella antes y no verla después (canal rojo)
  tipBright: 0.3,  // píxel más brillante exigido en la punta settled (la C tiene que estar ahí)
};

const EPS = 1e-6;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/**
 * mayor suba entre pasos consecutivos, con el paso evaluado por su EXTREMO:
 * cuenta el salto que entra a la ventana (una suba que arranca en el paso
 * anterior se pierde si se exige que el fotograma previo también esté dentro).
 */
export function maxRise(rows, key, from, to, { stepMs } = {}) {
  let best = { delta: -Infinity, t: null };
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].T < from || rows[i].T > to) continue;
    /* no comparar entre ventanas: el plan salta de la disolución al settle */
    if (stepMs != null && rows[i].T - rows[i - 1].T > stepMs * 2) continue;
    const delta = rows[i][key] - rows[i - 1][key];
    if (delta > best.delta) best = { delta, t: rows[i].T };
  }
  return best;
}

/** suba sobre el mínimo previo: una luz que se apaga nunca debería subir */
export function bloomOver(rows, key, from, to) {
  let min = Infinity, best = { delta: -Infinity, t: null };
  for (const r of rows) {
    if (r.T < from) { min = Math.min(min, r[key]); continue; }
    if (r.T > to) continue;
    /* si el plan no trae fotogramas previos a la ventana, el mínimo arranca en el
       primero de adentro: sin esto `min` queda en Infinity y el veredicto sale
       -Infinity, que se lee como "sin bloom" — un falso aprobado */
    if (min === Infinity) min = r[key];
    else min = Math.min(min, r[key]);
    if (r[key] - min > best.delta) best = { delta: r[key] - min, t: r.T };
  }
  return best;
}

/** suba sostenida: mediana del último tercio menos mediana del primero */
export function sustainedRise(rows, key, from, to) {
  const inWin = rows.filter((r) => r.T >= from && r.T <= to);
  const k = Math.max(1, Math.floor(inWin.length / 3));
  const head = median(inWin.slice(0, k).map((r) => r[key]));
  const tail = median(inWin.slice(-k).map((r) => r[key]));
  return { head, tail, delta: tail - head };
}

/** escalón al cruzar el settle: fotograma inmediatamente anterior vs posterior */
export function settleStep(rows, settle) {
  const before = rows.filter((r) => r.T < settle).reduce((best, r) => (best == null || r.T > best.T ? r : best), null);
  const after = rows.filter((r) => r.T > settle).reduce((best, r) => (best == null || r.T < best.T ? r : best), null);
  return before && after ? { before, after, delta: after.body - before.body } : null;
}

/** fotogramas de la respiración (los más cercanos al settle pedido) y su cambio */
export function breatheFrames(rows, settle, { stepMs } = {}) {
  const nearest = (t) => rows.reduce((best, r) => (Math.abs(r.T - t) < Math.abs(best.T - t) ? r : best), rows[0]);
  const a = nearest(settle + 40), b = nearest(settle + 900);
  const ok = stepMs == null
    || (Math.abs(a.T - (settle + 40)) <= stepMs && Math.abs(b.T - (settle + 900)) <= stepMs);
  return { a, b, delta: b.body - a.body, ok };
}

/** escala de un `transform: scale(x)` serializado; 1 si no hay transform */
export function scaleOf(transform) {
  if (!transform || transform === "none") return 1;
  const m = /scale\(([-\d.]+)(?:,\s*([-\d.]+))?\)/.exec(transform);
  return m ? Number(m[1]) : 1;
}

/** controles verticales de una cubic-bezier: y1 e y2 (overshoot si > 1) */
export function bezierY(easing) {
  const m = /cubic-bezier\(([^)]+)\)/.exec(easing ?? "");
  if (!m) return null;
  const n = m[1].split(",").map((v) => Number(v.trim()));
  return n.length === 4 ? [n[1], n[3]] : null;
}

/**
 * Invariantes del cronograma: son las que hacen imposible un pico de brillo.
 * Deterministas, sin píxeles — se leen del artefacto vivo.
 */
export function checkStructure(probe, L) {
  const fails = [];
  const punta = L.punta;

  /* 1. opacidad monótona y escala que no crece en la disolución de la punta */
  if (!punta) fails.push("no encontré la animación de disolución de la punta");
  else {
    let last = Infinity;
    for (const k of punta.kf) {
      const o = Number(k.opacity);
      if (o > last + EPS) fails.push(`la punta se re-enciende: opacidad ${last} → ${o} en la disolución (un pico de brillo)`);
      last = o;
    }
    const scales = punta.kf.map((k) => scaleOf(k.transform));
    if (Math.max(...scales) > scales[0] + EPS)
      fails.push(`el glow de la punta se agranda al apagarse (escala ${scales.join(" → ")}): el bloom era el destello`);
  }

  /* 2. la curva de la punta no puede tener overshoot (y > 1) */
  const ys = bezierY(punta?.easing);
  if (ys && Math.max(...ys) > 1 + EPS)
    fails.push(`la curva de la punta (${punta.easing}) tiene overshoot: el valor intermedio supera el inicial`);

  /* 3. la respiración tiene que vivir en el TRAZO y arrancar en su valor de reposo */
  const b = probe.breathe;
  if (!b) fails.push("no encontré @keyframes breathe en el artefacto");
  else {
    /* Chrome fusiona los keyframes con la misma declaración: "0%, 100%" */
    const hasKey = (frame, wanted) => frame.key.split(",")
      .some((k) => { const v = k.trim(); return wanted.includes(v); });
    const rest = Number(b.rest);
    for (const [label, wanted] of [["inicial", ["0%", "from"]], ["final", ["100%", "to"]]]) {
      const frame = b.frames.find((f) => hasKey(f, wanted));
      if (!frame) fails.push(`la respiración no declara su fotograma ${label}`);
      else if (Number(frame.opacity) !== rest)
        fails.push(`la respiración ${label === "inicial" ? "arranca" : "termina"} en ${frame.opacity} y el trazo descansa en ${rest}: eso ES el escalón del settle`);
    }
    const targets = b.targets ?? [];
    if (!targets.length) fails.push("ninguna regla aplica la respiración");
    for (const sel of targets)
      if (!/path\s*$/.test(sel.trim()))
        fails.push(`la respiración se aplica a "${sel}" y no al TRAZO: sobre el grupo la tapa la animación del trazado (en v16 nunca respiraba)`);
  }
  return fails;
}

/**
 * analyze({ probe, L, rows }, { stepMs, thresholds }) → métricas + veredicto.
 * La ventana del destello es la disolución completa de la punta (el canal
 * estrella la aísla del oro de la C, que no lo tiene).
 */
export function analyze({ probe, L, rows }, { stepMs, thresholds = THRESHOLDS } = {}) {
  const d0 = L.punta.delay, d1 = L.punta.delay + L.punta.duration;
  const from = d0 - 100, to = d1 + 150;
  const flash = maxRise(rows, "light", from, to, { stepMs });
  const bloom = bloomOver(rows, "light", from, to);
  const sustain = sustainedRise(rows, "light", from, to);
  const haloUp = maxRise(rows, "halo", from, to, { stepMs });
  const settle = settleStep(rows, L.settle);
  const breathe = breatheFrames(rows, L.settle, { stepMs });
  /* arranque (criterio 2 de #55): sin cronograma publicado no hay instrumento */
  const startup = probe.schedule?.delays?.length
    ? startupProfile(probe.schedule.delays, probe.schedule.durs)
    : null;
  const starBefore = rows.filter((r) => r.T <= d0).at(-1);
  const starAfter = rows.at(-1);
  const starSeen = starBefore ? starBefore.tipRedMax - starAfter.tipRedMax : NaN;
  const tipMaxSettled = starAfter.tipMax;
  /* deriva REAL del congelado: cada fila trae cuánto se desvió cada animación del
     instante pedido al fijarle `currentTime` (null ⇒ no se pudo verificar) */
  const drift = rows.some((r) => !Number.isFinite(r.drift)) ? Infinity : Math.max(...rows.map((r) => r.drift));
  const peak = Math.max(...rows.filter((r) => r.T >= from && r.T <= to).map((r) => r.light));

  const fails = [...checkStructure(probe, L)];
  if (flash.delta > thresholds.flash)
    fails.push(`destello: la luz de la estrella sube +${flash.delta.toFixed(3)} en ${flash.t}ms mientras se apaga (máx ${thresholds.flash})`);
  if (bloom.delta > thresholds.bloom)
    fails.push(`bloom: la luz de la estrella sube +${bloom.delta.toFixed(3)} sobre el mínimo previo en ${bloom.t}ms (máx ${thresholds.bloom})`);
  if (sustain.delta > thresholds.flash)
    fails.push(`suba sostenida de la estrella de +${sustain.delta.toFixed(3)} mientras se apaga (máx ${thresholds.flash})`);
  if (haloUp.delta > thresholds.halo)
    fails.push(`el glow fuera del trazo sube +${haloUp.delta.toFixed(2)} en ${haloUp.t}ms mientras la punta se apaga (máx ${thresholds.halo})`);
  if (settle && Math.abs(settle.delta) > thresholds.settle)
    fails.push(`salto al entrar el settle: ${settle.delta.toFixed(4)} (máx ${thresholds.settle})`);
  if (!breathe.ok)
    fails.push(`no hay fotogramas en el settle para medir la respiración (settle=${L.settle.toFixed(0)}ms, paso=${stepMs}ms)`);
  else if (Math.abs(breathe.delta) < thresholds.breathe)
    fails.push(`el glow no respira: entre ${breathe.a.T}ms y ${breathe.b.T}ms cambia ${breathe.delta.toFixed(4)} (mín ${thresholds.breathe})`);
  if (!(starSeen > thresholds.starSeen))
    fails.push(`autochequeo: la estrella de la punta no se ve antes y no se apaga después (Δ=${starSeen.toFixed(3)})`);
  if (!(tipMaxSettled >= thresholds.tipBright))
    fails.push(`autochequeo: la punta settled no tiene píxel brillante (máx=${tipMaxSettled.toFixed(3)})`);
  if (!Number.isFinite(drift))
    fails.push("el congelado no pudo verificar el instante de algún fotograma (drift no medible)");
  else if (drift > thresholds.drift)
    fails.push(`el congelado deriva ${drift.toFixed(0)}ms del tiempo pedido`);
  if (!startup) fails.push("el artefacto no publica su cronograma (svg.dataset.schedule): no puedo medir el arranque (criterio 2 de #55)");
  else fails.push(...checkStartup(startup, { timing: probe.timing, thresholds }));

  return { from, to, d0, d1, peak, flash, bloom, sustain, haloUp, settle, breathe,
    startup, starSeen, tipMaxSettled, drift, fails };
}


/* ───────────────────────── arranque (criterio 2 de #55) ─────────────────────
   El gate nació mirando sólo la punta, así que "el arranque explosivo conserva
   su fuerza sin sentirse apurado" quedaba AFIRMADO sin instrumento. Acá se
   computa del cronograma real (las mismas delays/durs que dibuja el artefacto):
   cuántos tramos se trazan a la vez, cuántos aterrizaron por tramo de tiempo y
   la forma de la rampa. "Apurado" es juicio del ojo ⇒ el gate fija el piso
   objetivo (sigue habiendo estallido, el tempo camina hacia el ritmo final y el
   ritmo final declarado no se altera) y REPORTA el perfil para comparar versiones.
────────────────────────────────────────────────────────────────────────────── */

/** perfil del arranque desde las delays/durs por tramo */
export function startupProfile(delays, durs, { windowMs = 2500, stepMs = 10 } = {}) {
  if (!delays.length || delays.length !== durs.length)
    return { n: delays.length, staggers: [], peakConcurrency: { n: 0, t: null }, monotone: true, landed: {} };
  const staggers = delays.slice(1).map((d, i) => d - delays[i]);
  const concurrencyAt = (t) => durs.reduce((c, dur, i) => c + (delays[i] <= t && t < delays[i] + dur ? 1 : 0), 0);
  const peak = { n: 0, t: null };
  for (let t = delays[0]; t <= delays[0] + windowMs; t += stepMs) {
    const c = concurrencyAt(t);
    if (c > peak.n) { peak.n = c; peak.t = t; }
  }
  const landedBy = (t) => delays.filter((d, i) => d + durs[i] <= t).length;
  const t0 = delays[0];
  return {
    n: delays.length, staggers, t0,
    firstStagger: staggers[0] ?? NaN, lastStagger: staggers.at(-1) ?? NaN,
    peakConcurrency: peak, monotone: staggers.every((v, i) => i === 0 || v >= staggers[i - 1] - 1e-6),
    landed: { "1.0s": landedBy(t0 + 1000), "1.5s": landedBy(t0 + 1500), "2.0s": landedBy(t0 + 2000) },
    windowMs,
  };
}

/** invariantes del arranque: fuerza conservada + endpoints declarados respetados */
export function checkStartup(profile, { timing, thresholds = THRESHOLDS } = {}) {
  const fails = [];
  const { firstStagger, lastStagger, peakConcurrency, monotone } = profile;
  if (!Number.isFinite(firstStagger) || !Number.isFinite(lastStagger))
    return ["el arranque no tiene tramos medibles (¿sin cronograma?)"];
  if (!monotone) fails.push("el tempo del arranque no es monótono: la rampa vuelve a acelerar (el contraste se lee brusco)");
  if (peakConcurrency.n < thresholds.burstFloor)
    fails.push(`el arranque perdió el estallido: ${peakConcurrency.n} tramo(s) trazando a la vez en el pico (piso ${thresholds.burstFloor})`);
  if (!(firstStagger <= lastStagger * thresholds.burstContrast))
    fails.push(`el arranque perdió el contraste: primer stagger ${firstStagger.toFixed(0)}ms vs ${lastStagger.toFixed(0)}ms final (tiene que ser ≤ ${(thresholds.burstContrast * 100).toFixed(0)}%)`);
  if (timing) {
    /* los extremos declarados en CONFIG son el contrato del artefacto: si la rampa
       no llega al ritmo final declarado (o no arranca en el rápido), algo se movió */
    if (Math.abs(lastStagger - timing.stagger) > 1)
      fails.push(`la rampa no termina en el ritmo final declarado: ${lastStagger.toFixed(0)}ms vs CONFIG ${timing.stagger}ms`);
    if (Math.abs(firstStagger - timing.staggerFast) > 1)
      fails.push(`la rampa no arranca en el stagger rápido declarado: ${firstStagger.toFixed(0)}ms vs CONFIG ${timing.staggerFast}ms`);
  }
  return fails;
}
