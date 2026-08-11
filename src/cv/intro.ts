/**
 * INTRO — frases con LECTURA GUIADA (foco palabra a palabra) y continuación
 * hacia el nombre: el propio `.hero-name` (un solo objeto, el del hero-content)
 * aparece en el lugar donde terminó la última frase y vuela a su posición
 * natural; al aterrizar vuelve a flow y el loader se oculta.
 */

const FRASES = [
  "¿Pueden el Arte, la Ciencia y la Filosofía convivir en una persona?",
  "Distintas perspectivas de una misma realidad…",
  "<span>Una<br><em>Instancia Humana</em>.</span>"
];

const FADE_IN = 1100; // ms
const HOLD = 1000; // ms base (tiempo de lectura del texto)
const FADE_OUT = 1100; // ms
const STEP = 350; // espera entre transiciones
const START_DELAY = 700; // ms de negro antes de la primera frase (parsimonia)

/** Intervalo del foco de lectura guiada: lento (~2× más lento que antes). */
function wordInterval(count: number): number {
  return Math.min(700, Math.max(300, Math.round(3600 / Math.max(1, count))));
}

/** Tiempo visible de la frase: la lectura guiada debe completarse antes del fade-out. */
function phraseDisplay(count: number): number {
  return FADE_IN + Math.max(1000, count * wordInterval(count) + 400);
}

/**
 * Envuelve cada palabra en `<span class="p-word">` (preservando tags como
 * `<em>`/`<span>`/`<br>`). El espaciado lo da el margin de .p-word: se quitan
 * los espacios del texto para que el flujo (flex o inline) quede uniforme.
 */
function renderPhraseWords(html: string): string {
  const tokens = html.split(/(<[^>]+>)/g);
  let out = "";
  for (const tok of tokens) {
    if (tok.startsWith("<")) {
      out += tok;
    } else {
      // Envuelve cada palabra y elimina SOLO los espacios entre spans: el
      // espaciado visual lo da el margin de .p-word (uniforme en flex e inline).
      out += tok
        .replace(/([^\s<]+)/g, '<span class="p-word">$1</span>')
        .replace(/<\/span>\s+<span class="p-word">/g, '</span><span class="p-word">');
    }
  }
  return out;
}

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

  let started = false;
  let wordTimer: number | undefined;

  function hideLoader() {
    loaderEl.classList.add("hidden");
    if (fractal) fractal.classList.add("minimized");
  }

  /** Lectura guiada: enfoca una palabra a la vez (intervalo según longitud, lento). */
  function startWordReading() {
    if (wordTimer) window.clearTimeout(wordTimer);
    wordTimer = undefined;
    const words = phraseEl.querySelectorAll<HTMLElement>(".p-word");
    if (!words.length) return;
    const interval = wordInterval(words.length);
    words.forEach((w, i) => w.classList.toggle("p-word--focus", i === 0));
    let wi = 0;
    const tick = () => {
      wi++;
      if (wi >= words.length) {
        wordTimer = undefined;
        return;
      }
      words.forEach((w, i) => w.classList.toggle("p-word--focus", i === wi));
      wordTimer = window.setTimeout(tick, interval);
    };
    wordTimer = window.setTimeout(tick, interval);
  }

  /**
   * Revela el nombre como continuación del texto: el propio .hero-name aparece
   * (fade in) en el lugar de la última frase y vuela a su posición natural vía
   * transform; al aterrizar vuelve a flow y el loader se oculta.
   */
  function finish(revealRect?: DOMRect) {
    const heroName = document.querySelector<HTMLElement>(".hero-name");
    if (!heroName) {
      hideLoader();
      return;
    }
    heroName.style.animation = "none"; // el fadeUp (fill both) pisaría el vuelo
    const natural = heroName.getBoundingClientRect();
    // Posición de revelado: CENTRADO en el recuadro donde terminó la última
    // frase (misma posición, tanto en X como en Y).
    const revealLeft = revealRect
      ? revealRect.left + revealRect.width / 2 - natural.width / 2
      : (window.innerWidth - natural.width) / 2;
    const revealTop = revealRect
      ? revealRect.top + revealRect.height / 2 - natural.height / 2
      : window.innerHeight / 2 - natural.height / 2;
    const dx0 = revealLeft - natural.left;
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

    heroName.style.transition = "opacity .4s ease";
    heroName.style.opacity = "1"; // fade in en el lugar de la frase
    setTimeout(() => {
      let landed = false;
      const land = () => {
        if (landed) return;
        landed = true;
        // Libera el elemento: vuelve a flow en .hero-content (misma posición).
        // opacity queda en 1 inline: la base CSS es opacity:0 (fadeUp desactivado).
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
      heroName.style.transform = "translate(0, 0)"; // vuela a su lugar en el hero
      setTimeout(land, 1800); // fallback si transitionend no dispara
    }, 900);
  }

  function showPhrase(i: number) {
    if (wordTimer) window.clearTimeout(wordTimer);
    phraseEl.innerHTML = renderPhraseWords(FRASES[i]);
    phraseEl.classList.add("in");
    const count = phraseEl.querySelectorAll(".p-word").length;
    startWordReading();
    setTimeout(() => {
      phraseEl.classList.remove("in");
      phraseEl.classList.add("out");
      setTimeout(() => {
        phraseEl.classList.remove("out");
        if (i + 1 < FRASES.length) {
          setTimeout(() => showPhrase(i + 1), STEP);
        } else {
          // Continuación: el nombre aparece en el lugar de la última frase.
          const reveal = phraseEl.getBoundingClientRect();
          phraseEl.style.display = "none";
          finish(reveal);
        }
      }, FADE_OUT);
    }, phraseDisplay(count));
  }

  function start() {
    if (started) return;
    started = true;
    // 0.7s de negro (loader con el fractal) antes de la primera frase.
    window.setTimeout(() => showPhrase(0), START_DELAY);
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
