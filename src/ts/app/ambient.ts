/**
 * AMBIENT — sonido de fondo por SALA (cantos de ballenas), volumen muy bajo y
 * con crossfade suave entre salas.
 *
 * Cada sala del museo tiene SU PROPIA pista de audio. Cuando una sala ocupa
 * ≥50% de la pantalla (viewport), el sonido transiciona de forma suave y
 * SUPERPUESTA hacia la pista de esa sala: la pista saliente baja de volumen
 * mientras la entrante sube (crossfade superpuesto), sin cortes secos.
 *
 * El autoplay con sonido exige un gesto del usuario (política del browser): se
 * intenta reproducir al cargar (puede fallar silenciosamente) y se asegura con
 * el PRIMER gesto (click / tecla / touch). Botón #btn-sound (arriba a la
 * derecha) para apagar/encender (fade out/in).
 *
 * Rendimiento / peso de la página:
 *  - SOLO se crean DOS elementos <audio> en total (pool fijo). Nunca uno por
 *    sala, así el coste de memoria y de decodeo es constante (≈2 pistas) y la
 *    página no se vuelve pesada por más salas que existan.
 *  - Las pistas se cargan BAJO DEMANDA (al entrar en la sala) y la pista que
 *    deja de oírse se pausa y libera. El cache HTTP hace instantánea la vuelta
 *    a una sala ya visitada.
 *
 * Fuente del audio: Wikimedia Commons — "Humpbackwhale2.ogg", canto de ballena
 * jorobada, autor Spyrogumas, licencia CC0 (dominio público) [pista por
 * defecto]. Las pistas por sala (room-*.mp3) son otros cantos de ballena
 * jorobada de Wikimedia Commons (CC0/CC-BY), convertidos a MP3 estéreo y
 * normalizados a ~20 dB para volumen consistente. public/audio/.
 */

const AUDIO_DIR = "/audio/";
/** Pista de la entrada (hero): olas del mar — claramente distinta de los cantos
 *  de ballena de las salas para que el cambio sea reconocible. */
const DEFAULT_AUDIO = AUDIO_DIR + "ocean-waves.mp3";

/** Pista por sala (id de <section> → archivo en public/audio/). */
const ROOM_AUDIO: Record<string, string> = {
  perfil: AUDIO_DIR + "room-sfx.mp3",
  proyectos: AUDIO_DIR + "room-akhumphi.mp3",
  experiencia: AUDIO_DIR + "room-moo.mp3",
  fisica: AUDIO_DIR + "room-s001.mp3",
  competencias: AUDIO_DIR + "room-wheezeblow.mp3",
  grafo: AUDIO_DIR + "room-s002.mp3"
  // contacto y hero (entrada) → pista por defecto (whale-song.mp3)
};

/** Orden de evaluación de secciones (hero = entrada del museo, luego salas). */
const SECTION_SELECTOR = "#hero, section.room";

const BASE_VOLUME = 0.04; // muy bajo: fondo ambiental, no intrusivo
const FADE_IN_MS = 2500; // fade in al iniciar / reanudar
const FADE_OUT_MS = 450; // fade out rápido al apagar (botón)
const CROSSFADE_MS = 2200; // duración del cruce superpuesto al cambiar de sala
const FADE_STEP_MS = 60;

/** Rampa de volumen pura (testeable): pasos lineales de `from` a `to`. */
export function fadeSteps(from: number, to: number, ms: number, stepMs: number): number[] {
  const delta = to - from;
  if (delta === 0) return [to];
  const steps = Math.max(1, Math.round(ms / stepMs));
  const out: number[] = [];
  for (let i = 1; i <= steps; i++) out.push(Number((from + delta * (i / steps)).toFixed(4)));
  return out;
}

/** Rect de una sección candidata (top/bottom relativos al viewport). */
export interface RoomRect {
  /** id de la sección: 'hero' | 'perfil' | 'proyectos' | ... */
  id: string;
  top: number;
  bottom: number;
}

/**
 * Elige la sección "activa": la que ocupa ≥50% de la altura del viewport
 * (paso 1). Si ninguna llega al 50% (entre salas o hero corto), cae a la que
 * tenga mayor área visible (paso 2). Puro y testeable.
 */
export function pickActive(rects: RoomRect[], vh: number): string | null {
  const half = vh * 0.5;
  // paso 1: preferir la sala que cubre ≥50% del viewport
  let best: string | null = null;
  let bestVisible = 0;
  for (const r of rects) {
    const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    if (visible >= half && visible > bestVisible) {
      bestVisible = visible;
      best = r.id;
    }
  }
  if (best) return best;
  // paso 2: fallback a la mayor área visible (transición entre salas)
  bestVisible = 0;
  for (const r of rects) {
    const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    if (visible > bestVisible) {
      bestVisible = visible;
      best = r.id;
    }
  }
  return best;
}

/** Pool FIJO de elementos de audio: como mucho 2 en memoria, siempre. */
const pool: HTMLAudioElement[] = [];
/** Timers de fade por elemento de audio (permite fades independientes). */
const fadeTimers = new Map<HTMLAudioElement, number>();
let activeIdx = 0; // índice del elemento que se está oyendo
let unlocked = false;
let userEnabled = true; // preferencia del usuario (botón #btn-sound)
let activeRoom: string | null = null; // id de la sección activa detectada
let initDone = false; // evita que el scroll interfiera durante la inicialización
let rafId: number | undefined; // throttle del scroll por rAF

function urlForRoom(id: string | null): string {
  return (id && ROOM_AUDIO[id]) || DEFAULT_AUDIO;
}

function getPoolElement(idx: number): HTMLAudioElement {
  if (!pool[idx]) {
    const el = new Audio();
    el.loop = true;
    el.volume = 0; // arranca en silencio; los fades lo suben
    el.preload = "auto";
    pool[idx] = el;
  }
  return pool[idx];
}

/** Fade de volumen de UN elemento (timer propio, re-entrante seguro). */
function fadeTo(el: HTMLAudioElement, target: number, ms: number, onDone?: () => void): void {
  const prev = fadeTimers.get(el);
  if (prev) window.clearInterval(prev);
  const from = el.volume;
  const values = fadeSteps(from, target, ms, FADE_STEP_MS);
  let i = 0;
  const timer = window.setInterval(() => {
    i++;
    const done = i >= values.length;
    el.volume = values[done ? values.length - 1 : i - 1];
    if (done) {
      window.clearInterval(timer);
      fadeTimers.delete(el);
      if (onDone) onDone();
    }
  }, FADE_STEP_MS);
  fadeTimers.set(el, timer);
}

/**
 * Cruce superpuesto hacia la pista de `url`: la pista entrante sube mientras
 * la saliente baja (ambas se oyen juntas durante CROSSFADE_MS), y al terminar
 * la saliente se pausa. Reutiliza el pool de 2 elementos.
 */
function transitionTo(url: string): void {
  if (pool[activeIdx] && pool[activeIdx].src.endsWith(url) && pool[activeIdx].volume > 0) {
    return; // ya estamos oyendo esa pista
  }
  const nextIdx = 1 - activeIdx;
  const outgoing = pool[activeIdx];
  const incoming = getPoolElement(nextIdx);
  incoming.src = url;
  incoming.volume = 0;
  incoming.loop = true;
  incoming
    .play()
    .then(() => {
      // Guarda contra races en scroll rápido: solo sube si sigue siendo la
      // pista activa (no fue reaprovechada como saliente por otra transición).
      if (pool[activeIdx] === incoming) fadeTo(incoming, BASE_VOLUME, CROSSFADE_MS);
    })
    .catch(() => {
      /* autoplay policy: el primer gesto (unlock) lo activa */
    });
  if (outgoing) {
    fadeTo(outgoing, 0, CROSSFADE_MS, () => outgoing.pause());
  }
  activeIdx = nextIdx;
}

function ensurePlaying(): void {
  if (!userEnabled || !unlocked) return;
  const url = urlForRoom(activeRoom);
  transitionTo(url);
}

function updateButton(): void {
  const b = document.getElementById("btn-sound");
  if (!b) return;
  b.classList.toggle("muted", !userEnabled);
  b.setAttribute("aria-pressed", String(userEnabled));
  b.setAttribute(
    "aria-label",
    userEnabled ? "Silenciar sonido de fondo" : "Activar sonido de fondo"
  );
}

/** Encender/apagar el sonido (desde el botón). Fade in/out suave. */
function setEnabled(on: boolean): void {
  userEnabled = on;
  const el = pool[activeIdx];
  if (on) {
    ensurePlaying();
  } else if (el) {
    fadeTo(el, 0, FADE_OUT_MS, () => el.pause());
  }
  updateButton();
}

function unlock(): void {
  if (unlocked) return;
  unlocked = true;
  document.removeEventListener("pointerdown", unlock);
  document.removeEventListener("keydown", unlock);
  document.removeEventListener("touchstart", unlock);
  if (userEnabled) ensurePlaying();
}

/** Detecta la sección activa en el DOM y cruza el audio si cambió.
 *  Durante la inicialización solo actualiza activeRoom sin disparar transiciones
 *  (evita el corte que ocurría cuando un scroll/resize temprano competía con el
 *  fade-in inicial). */
function updateActive(): void {
  const sections = Array.from(document.querySelectorAll(SECTION_SELECTOR));
  const rects: RoomRect[] = sections.map((s) => {
    const r = s.getBoundingClientRect();
    return { id: s.id.replace("room-", ""), top: r.top, bottom: r.bottom };
  });
  const next = pickActive(rects, window.innerHeight);
  if (next !== activeRoom) {
    activeRoom = next;
    if (initDone && userEnabled && unlocked) transitionTo(urlForRoom(activeRoom));
  }
}

/** Throttle por requestAnimationFrame: no disparar por cada pixel de scroll. */
function onScroll(): void {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = undefined;
    updateActive();
  });
}

/** Monta el sonido ambiente por sala y el botón de silencio. Idempotente. */
export function initAmbientSound(): void {
  if (typeof document === "undefined" || typeof Audio === "undefined") return;
  if (pool.length) return;

  const btn = document.getElementById("btn-sound");
  if (btn) {
    btn.addEventListener("click", () => setEnabled(!userEnabled));
    updateButton();
  }

  document.addEventListener("pointerdown", unlock);
  document.addEventListener("keydown", unlock);
  document.addEventListener("touchstart", unlock);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  // Arranque: detectar la sala inicial (hero) e intentar reproducir.
  // Se espera al evento 'canplaythrough' para que el audio esté realmente
  // listo antes del fade-in, y se marca initDone solo después para que
  // ningún scroll temprano interfiera con el arranque.
  updateActive();
  if (userEnabled) {
    const el = getPoolElement(0);
    el.src = urlForRoom(activeRoom);
    el.loop = true;
    el.volume = 0;
    const startFade = () => {
      if (initDone) return; // ya arrancó (canplaythrough o timeout)
      el.removeEventListener("canplaythrough", startFade);
      el.play()
        .then(() => {
          if (pool[activeIdx] === el) fadeTo(el, BASE_VOLUME, FADE_IN_MS);
        })
        .catch(() => {
          /* autoplay policy: el primer gesto lo activa (unlock) */
        });
      initDone = true;
    };
    el.addEventListener("canplaythrough", startFade, { once: true });
    // Fallback: si el evento no dispara en 3s (ya sea porque el navegador
    // lo disparó antes de registrar el listener, o porque la pista ya está
    // en caché), arranca igual.
    setTimeout(() => {
      if (!initDone) startFade();
    }, 3000);
    el.load();
  } else {
    initDone = true;
  }
}
