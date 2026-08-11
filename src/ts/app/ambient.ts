/**
 * AMBIENT — canto de ballenas de fondo, volumen muy bajo.
 *
 * El autoplay con sonido exige un gesto del usuario (política del browser):
 * se intenta reproducir al cargar (puede fallar silenciosamente) y se asegura
 * con el PRIMER gesto (click / tecla / touch). Loop infinito a volumen bajo.
 *
 * Fuente del audio: Wikimedia Commons — "Humpbackwhale2.ogg", canto de ballena
 * jorobada, autor Spyrogumas, licencia CC0 (dominio público, sin atribución
 * requerida). Convertido a MP3 (112 kbps, 38 s) en public/audio/.
 */

const AUDIO_URL = "/audio/whale-song.mp3";
const VOLUME = 0.06; // muy bajo: fondo ambiental, no intrusivo

let audio: HTMLAudioElement | null = null;
let unlocked = false;

function tryPlay(): void {
  if (!audio) return;
  audio.play().catch(() => {
    /* autoplay policy: espera al primer gesto del usuario */
  });
}

function unlock(): void {
  if (unlocked) return;
  unlocked = true;
  document.removeEventListener("pointerdown", unlock);
  document.removeEventListener("keydown", unlock);
  document.removeEventListener("touchstart", unlock);
  tryPlay();
}

/** Monta el sonido ambiente. Idempotente; sin efecto en node (tests). */
export function initAmbientSound(): void {
  if (typeof document === "undefined" || typeof Audio === "undefined") return;
  if (audio) return;
  audio = new Audio(AUDIO_URL);
  audio.loop = true;
  audio.volume = VOLUME;
  audio.preload = "auto";
  document.addEventListener("pointerdown", unlock);
  document.addEventListener("keydown", unlock);
  document.addEventListener("touchstart", unlock);
  tryPlay();
}
