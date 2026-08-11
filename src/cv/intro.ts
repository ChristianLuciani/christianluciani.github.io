/**
 * INTRO — animación de frases → nombre. El nombre ES el propio `.hero-name`
 * (un solo objeto, el del hero-content): al terminar las frases se muestra
 * centrado sobre el loader y VUELA a su posición natural; al aterrizar se
 * libera (vuelve a flow) y el loader se oculta. No hay nombre duplicado.
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
  const block = document.getElementById("intro-block");
  if (!loader || !block || !phrase) return;
  const loaderEl = loader;
  const phraseEl = phrase;

  // Frases en una sola línea: cada una aparece, se desvanece y la siguiente
  // ocupa la MISMA posición. Fade in/out más largo, mismo tiempo de lectura.
  let started = false;
  let idx = 0;

  function hideLoader() {
    loaderEl.classList.add("hidden");
    if (fractal) fractal.classList.add("minimized");
  }

  function finish() {
    // UN SOLO OBJETO: el propio .hero-name (elemento del hero-content) aparece
    // centrado sobre el loader (fade in) y vuela a su posición natural vía
    // transform; al aterrizar se libera (vuelve a flow en la misma posición)
    // y el loader se oculta. El elemento nunca se mueve en el DOM.
    const heroName = document.querySelector<HTMLElement>(".hero-name");
    if (!heroName) {
      hideLoader();
      return;
    }
    const natural = heroName.getBoundingClientRect();
    // La animación CSS fadeUp (fill both) pisa los estilos inline para siempre;
    // se desactiva para que el transform/opacity del vuelo manden.
    heroName.style.animation = "none";
    // Aparece centrado, un poco por debajo del centro (bajo el fractal).
    const revealTop = window.innerHeight / 2 - natural.height / 2 + window.innerHeight * 0.09;
    const dx0 = (window.innerWidth - natural.width) / 2 - natural.left;
    const dy0 = revealTop - natural.top;

    heroName.style.position = "fixed";
    heroName.style.left = natural.left + "px";
    heroName.style.top = natural.top + "px";
    heroName.style.width = natural.width + "px";
    heroName.style.margin = "0";
    heroName.style.zIndex = "1002";
    heroName.style.pointerEvents = "none";
    heroName.style.transformOrigin = "top left";
    heroName.style.opacity = "0";
    heroName.style.transform = `translate(${dx0}px, ${dy0}px)`;
    void heroName.offsetWidth; // reflow: aplica la posición antes de transicionar

    // Fade in en la posición centrada, luego vuelo a la posición natural.
    heroName.style.transition = "opacity .5s ease";
    heroName.style.opacity = "1";
    setTimeout(() => {
      let landed = false;
      const land = () => {
        if (landed) return;
        landed = true;
        // Libera el elemento: vuelve a flow en .hero-content (misma posición).
        // opacity queda en 1 inline: la base CSS es opacity:0 (el fadeUp está
        // desactivado) y sin esto el nombre quedaría invisible.
        heroName.style.position = "";
        heroName.style.left = "";
        heroName.style.top = "";
        heroName.style.width = "";
        heroName.style.margin = "";
        heroName.style.zIndex = "";
        heroName.style.pointerEvents = "";
        heroName.style.transformOrigin = "";
        heroName.style.transform = "";
        heroName.style.transition = "";
        heroName.style.opacity = "1";
        hideLoader();
      };
      heroName.style.transition = "transform 1s cubic-bezier(.16,1,.3,1)";
      heroName.addEventListener(
        "transitionend",
        (e) => {
          if (e.propertyName === "transform") land();
        },
        { once: true }
      );
      heroName.style.transform = "translate(0, 0)"; // vuela a su lugar
      setTimeout(land, 1800); // fallback si transitionend no dispara
    }, 800);
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
      // Terminaron las frases: el nombre (el propio .hero-name) aparece centrado
      // sobre el loader y vuela a su lugar — lo gestiona finish().
      phraseEl.style.display = "none";
      setTimeout(finish, 1400);
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
