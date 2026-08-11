/**
 * INTRO — animación de frases → nombre (port fiel del script inline de Fase 1).
 * El nombre queda en flujo del documento (hace scroll con la página); al
 * terminar se oculta el loader y se minimiza el fractal a la esquina.
 */

const FRASES = [
  "¿Pueden el Arte, la Ciencia y la Filosofía convivir en una persona?",
  "Distintas perspectivas de una misma realidad…",
  "Una<br><em>Instancia Humana</em>."
];

const FADE_IN = 1100; // ms
const HOLD = 1000; // ms (tiempo de lectura del texto)
const FADE_OUT = 1100; // ms
const STEP = 350; // espera entre transiciones

export function initIntro(): void {
  if (typeof document === "undefined") return;

  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    const ib = document.getElementById("intro-block");
    if (ib) ib.remove();
    return; // el loader lo oculta el fractal normalmente (minimizeDelayMs corto)
  }

  const loader = document.getElementById("loader");
  const fractal = document.getElementById("fractal-logo");
  const phrase = document.getElementById("intro-phrase");
  const nameEl = document.querySelector<HTMLElement>(".intro-name");
  const block = document.getElementById("intro-block");
  if (!loader || !block || !phrase) return;
  const loaderEl = loader;
  const phraseEl = phrase;

  // Frases en una sola línea: cada una aparece, se desvanece y la siguiente
  // ocupa la MISMA posición. Fade in/out más largo, mismo tiempo de lectura.
  let started = false;
  let idx = 0;

  function finish() {
    // La intro termina: se oculta el loader y se minimiza el fractal a la esquina.
    // El nombre grande queda en su posición natural dentro del hero (en flujo del
    // documento), de modo que hace scroll con la página y NO se superpone a las
    // demás secciones.
    loaderEl.classList.add("hidden");
    if (fractal) fractal.classList.add("minimized");
  }

  function showNext() {
    if (idx < FRASES.length) {
      phraseEl.innerHTML = FRASES[idx];
      phraseEl.classList.add("in");
      setTimeout(() => {
        phraseEl.classList.remove("in");
        phraseEl.classList.add("out");
        setTimeout(() => {
          phraseEl.classList.remove("out");
          idx++;
          setTimeout(showNext, STEP);
        }, FADE_OUT);
      }, FADE_IN + HOLD);
    } else {
      // Terminaron las frases: mostrar el nombre en la misma posición.
      phraseEl.style.display = "none";
      if (nameEl) nameEl.classList.add("in");
      setTimeout(finish, 1600);
    }
  }

  function start() {
    if (started) return;
    started = true;
    // Primera frase directa; el resto rota via showNext()
    idx = 0;
    phraseEl.innerHTML = FRASES[0];
    phraseEl.classList.add("in");
    setTimeout(() => {
      phraseEl.classList.remove("in");
      phraseEl.classList.add("out");
      setTimeout(() => {
        phraseEl.classList.remove("out");
        idx = 1;
        showNext();
      }, FADE_OUT);
    }, STEP + FADE_IN + HOLD);
  }

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });

  // Skip: un clic durante el intro salta directo al nombre y revela el hero.
  const skip = () => {
    if (!started) return;
    finish();
  };
  document.addEventListener("click", skip, { once: true });
}
