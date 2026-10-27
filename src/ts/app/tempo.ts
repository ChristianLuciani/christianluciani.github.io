/**
 * tempo.ts — clock paramétrico y asimétrico del Espirángulo.
 *
 * El logo publica su cronograma (evento `espirangulo:tempo`): una secuencia de
 * intervalos de nodo, NO uniformes (la 07 global acelera desde la supernova y
 * frena hacia la C). Este módulo:
 *
 *   · emite un `espirangulo:tick` en cada choque link-nodo;
 *   · mantiene el tempo VIVO después del settle, repitiendo la secuencia;
 *   · expone `tempoStep()`, el multiplicador de avance por frame que consumen
 *     las ilusiones/fractales;
 *   · pulsa el mark en cada tick (clase `is-tick`), para que el reloj se vea
 *     aun cuando la animación ya está en reposo.
 *
 * Tiempo paramétrico: el ritmo no es constante; cada intervalo define una tasa
 * `rate = BASE / interval` (clamped). Tiempo asimétrico: la secuencia de tasas
 * repite la asimetría del trazado (rápido en el centro, lento en la C).
 *
 * Sin cronograma (o con reduced-motion), `tempoStep()` devuelve 1: la página
 * conserva su velocidad nativa.
 */
export interface TempoSchedule {
  mode?: string;
  tRef?: number;
  lead?: number;
  intervals: number[];
  arrivals?: number[];
  total?: number;
  a?: number;
}

export interface TempoState {
  tick: number;
  interval: number;
  rate: number;
  loop: boolean;
  running: boolean;
}

const BASE_MS = 180; // intervalo de referencia: tasa 1
const MIN_RATE = 0.6;
const MAX_RATE = 1.8;
const PULSE_MS = 80; // < intervalo mínimo (101 ms): el pulso no queda encendido

let schedule: TempoSchedule | null = null;
let startAt = 0;
let nextAt = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let pulseTimer: ReturnType<typeof setTimeout> | undefined;
let tick = 0;
let interval = BASE_MS;
let rate = 1;
let loop = false;
let reduced = false;
let initialized = false;
const listeners = new Set<(state: TempoState) => void>();

function state(): TempoState {
  return { tick, interval, rate, loop, running: !!schedule };
}

function rateFor(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 1;
  return Math.min(MAX_RATE, Math.max(MIN_RATE, BASE_MS / ms));
}

function notify(): void {
  const s = state();
  for (const fn of listeners) fn(s);
}

/** Pulsa el mark en cada tick; el tempo se ve aunque el logo ya esté settled. */
function pulseLogo(): void {
  if (typeof document === "undefined") return;
  const logo = document.getElementById("brand-logo");
  if (!logo) return;
  logo.classList.add("is-tick");
  if (pulseTimer) clearTimeout(pulseTimer);
  pulseTimer = setTimeout(() => logo.classList.remove("is-tick"), PULSE_MS);
}

function scheduleNext(): void {
  if (timer) clearTimeout(timer);
  const wait = Math.max(0, nextAt - performance.now());
  timer = setTimeout(onTick, wait);
}

function onTick(): void {
  if (!schedule) return;
  const count = schedule.intervals.length;
  tick += 1;
  if (tick > count) {
    tick = 1;
    loop = true;
  }
  /* El gap que empieza en este tick es intervals[tick] (0-based); al cerrar
     la vuelta, el gap al primer tick es intervals[0]. */
  interval = schedule.intervals[tick] ?? schedule.intervals[0] ?? BASE_MS;
  rate = rateFor(interval);
  nextAt += interval;
  notify();
  pulseLogo();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("espirangulo:tick", {
        detail: { ...state(), at: performance.now() },
      })
    );
  }
  scheduleNext();
}

function start(next: TempoSchedule): void {
  if (reduced || !next || !Array.isArray(next.intervals) || !next.intervals.length) return;
  schedule = next;
  if (timer) clearTimeout(timer);
  startAt = performance.now();
  tick = 0;
  loop = false;
  interval = next.intervals[0] ?? BASE_MS;
  rate = rateFor(interval);
  const firstArrival = next.arrivals?.[0] ?? (next.lead ?? 0) + interval;
  nextAt = startAt + firstArrival;
  notify();
  scheduleNext();
}

/** Enciende el listener del cronograma que publica el logo. Idempotente. */
export function initTempo(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  window.addEventListener("espirangulo:tempo", (event) => {
    const detail = (event as CustomEvent<TempoSchedule>).detail;
    if (detail) start(detail);
  });
}

/** Multiplicador de avance por frame: 1 = velocidad nativa. */
export function tempoStep(): number {
  if (reduced || !schedule) return 1;
  return rate;
}

/** Suscripción a los ticks (para futuros gestos visuales). */
export function onTempoTick(fn: (state: TempoState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Lectura del estado (debug/UI). */
export function getTempo(): TempoState {
  return state();
}
