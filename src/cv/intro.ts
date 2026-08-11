/**
 * INTRO — animación de frases → nombre (port fiel del script inline de Fase 1).
 * Al terminar, el nombre del intro VUELA a la posición del nombre del hero
 * (un solo objeto en movimiento) y el loader se oculta dejándolo en su lugar.
 */

const FRASES = [
  "¿Pueden el Arte, la Ciencia y la Filosofía convivir en una persona?",
  "Distintas perspectivas de una misma realidad…",
  "<span>Una<br><em>Instancia Humana</em>.</span>"
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
    // Un solo movimiento: el nombre del intro vuela hasta la posición del
    // nombre del hero (rect exacto) y, al aterrizar, el loader se oculta y el
    // hero queda revelado en la MISMA posición → continuidad visual.
    const heroName = document.querySelector<HTMLElement>(".hero-name");
    if (nameEl && heroName) {
      const from = nameEl.getBoundingClientRect();
      const to = heroName.getBoundingClientRect();
      // Fija el nombre sobre el loader (z-index por encima) en su rect actual.
      nameEl.style.position = "fixed";
      nameEl.style.left = from.left + "px";
      nameEl.style.top = from.top + "px";
      nameEl.style.width = from.width + "px";
      nameEl.style.margin = "0";
      nameEl.style.zIndex = "1002";
      nameEl.style.pointerEvents = "none";
      nameEl.style.transformOrigin = "top left";
      void nameEl.offsetWidth; // reflow: aplica la posición antes de transicionar
      const sx = to.width / from.width;
      const sy = to.height / from.height;
      nameEl.style.transition = "transform 1s cubic-bezier(.16,1,.3,1)";
      nameEl.style.transform =
        `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${sx}, ${sy})`;
      let landed = false;
      const land = () => {
        if (landed) return;
        landed = true;
        loaderEl.classList.add("hidden");
        if (fractal) fractal.classList.add("minimized");
        nameEl.remove(); // el nombre del hero (su propio contenido) queda revelado
      };
      nameEl.addEventListener("transitionend", land, { once: true });
      setTimeout(land, 1700); // fallback si transitionend no dispara
    } else {
      loaderEl.classList.add("hidden");
      if (fractal) fractal.classList.add("minimized");
    }
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
