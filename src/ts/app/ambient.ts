/**
 * AMBIENT — canto de ballenas de fondo, volumen muy bajo y con fade.
 *
 * El autoplay con sonido exige un gesto del usuario (política del browser): se
 * intenta reproducir al cargar (puede fallar silenciosamente) y se asegura con
 * el PRIMER gesto (click / tecla / touch). El sonido arranca con un fade in
 * suave (2.5s) tanto si autoplay lo permite como tras el primer gesto.
 * Botón #btn-sound (arriba a la derecha) para apagar/encender (fade out/in).
 *
 * Fuente del audio: Wikimedia Commons — "Humpbackwhale2.ogg", canto de ballena
 * jorobada, autor Spyrogumas, licencia CC0 (dominio público). Convertido a MP3
 * y re-encodado con crossfade en el punto de loop (fin→inicio, 2.5s) para que
 * el bucle sea continuo sin clics. public/audio/whale-song.mp3.
 */

const AUDIO_URL = "/audio/whale-song.mp3";
const BASE_VOLUME = 0.04; // muy bajo: fondo ambiental, no intrusivo
const FADE_IN_MS = 2500; // fade in al iniciar / reanudar
const FADE_OUT_MS = 450; // fade out rápido al apagar
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

let audio: HTMLAudioElement | null = null;
let unlocked = false;
let userEnabled = true; // preferencia del usuario (botón #btn-sound)
let fadeTimer: number | undefined;

function fadeTo(target: number, ms: number, onDone?: () => void): void {
  if (fadeTimer) window.clearInterval(fadeTimer);
  const from = audio ? audio.volume : 0;
  const values = fadeSteps(from, target, ms, FADE_STEP_MS);
  let i = 0;
  fadeTimer = window.setInterval(() => {
    i++;
    const done = i >= values.length;
    if (audio) audio.volume = values[done ? values.length - 1 : i - 1];
    if (done) {
      if (fadeTimer) window.clearInterval(fadeTimer);
      fadeTimer = undefined;
      if (onDone) onDone();
    }
  }, FADE_STEP_MS);
}

function tryPlay(): void {
  if (!audio) return;
  audio
    .play()
    .then(() => fadeTo(BASE_VOLUME, FADE_IN_MS))
    .catch(() => {
      /* autoplay policy: el primer gesto lo activa (unlock) */
    });
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
  if (!audio) return;
  if (on) {
    tryPlay();
  } else {
    fadeTo(0, FADE_OUT_MS, () => audio?.pause());
  }
  updateButton();
}

function unlock(): void {
  if (unlocked) return;
  unlocked = true;
  document.removeEventListener("pointerdown", unlock);
  document.removeEventListener("keydown", unlock);
  document.removeEventListener("touchstart", unlock);
  if (userEnabled) tryPlay();
}

/** Monta el sonido ambiente y el botón de silencio. Idempotente. */
export function initAmbientSound(): void {
  if (typeof document === "undefined" || typeof Audio === "undefined") return;
  if (audio) return;
  audio = new Audio(AUDIO_URL);
  audio.loop = true;
  audio.volume = 0; // arranca en silencio; el fade in lo sube
  audio.preload = "auto";

  const btn = document.getElementById("btn-sound");
  if (btn) {
    btn.addEventListener("click", () => setEnabled(!userEnabled));
    updateButton();
  }

  document.addEventListener("pointerdown", unlock);
  document.addEventListener("keydown", unlock);
  document.addEventListener("touchstart", unlock);
  tryPlay();
}
