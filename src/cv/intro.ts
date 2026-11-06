/**
 * INTRO — tres frases con UNA coreografía acompasada al Espirángulo
 * (`espirangulo:tick`): cada palabra entra en gris, después pulsa a teal y
 * asienta en blanco. Cada frase conserva su alineación original:
 *   · «Arte / Ciencias Filosofía» en triángulo;
 *   · «Perspectivas / del / Universo» en tres líneas centradas;
 *   · «Una / Instancia Humana» en dos filas, «Una» centrada sobre el hueco:
 *     la U cae sobre la última «a» de «Instancia» y la «a» sobre la H de «Humana».
 * Sin traza de oro: el texto se sostiene solo.
 * Al terminar, el `.hero-name` aparece donde terminó la última frase y vuela a
 * su posición natural; al aterrizar vuelve a flow y el loader se oculta.
 *
 * La intro es opcional: `#btn-skip-intro` la cancela y revela la página de
 * inmediato. El botón está disponible desde el primer frame y el skip limpia
 * timers, coreografía y estilos inline. No hay atajo de clic global: competía
 * con los controles que viven sobre el loader (`.skip-link`, nav) y les robaba
 * el foco.
 */

const FRASES = [
  "Arte Ciencias Filosofía",
  "Perspectivas del Universo",
  "Una Instancia Humana"
];

const FADE_OUT = 1100; // ms
const STEP = 350; // espera entre transiciones
const START_DELAY = 700; // ms de negro antes de la primera frase (parsimonia)

/** Hold de la frase ya coreografiada, antes del fade-out. */
const PHRASE_HOLD = 1200; // ms
/** Duración del pulso teal de cada palabra. */
const PULSE_MS = 520; // ms
/** Si el clock no late, cuánto esperar antes de caer a cadencia fija. */
const TICK_FALLBACK_MS = 700; // ms
/** Cadencia de respaldo (sin Espirángulo) y separación mínima entre pasos. */
const WORD_FALLBACK_MS = 420; // ms
const WORD_MIN_GAP = 260; // ms — un tick sí, dos también: nunca a ráfaga
/** Techo duro: la intro jamás se cuelga esperando un tick que no llega. */
const CHOREO_MAX_WAIT = 12000; // ms

interface Choreo {
  done: Promise<void>;
  cancel: () => void;
}

/**
 * Coreografía ÚNICA de las tres frases, acompasada al Espirángulo — cada paso
 * ocurre en un `espirangulo:tick` (el choque link-nodo del logo, ver
 * `ts/app/tempo.ts`):
 *
 *   ronda 1 · cada palabra aparece en gris (`--ink-dim`), una por tick;
 *   ronda 2 · cada palabra pulsa a teal, una por tick, y vuelve al blanco.
 *
 * `WORD_MIN_GAP` impide que un tempo rápido arme la frase de golpe. Si el clock
 * no emite (logo ausente, cronograma que no llegó), cae a cadencia fija; el
 * techo duro garantiza que la intro nunca se cuelgue.
 *
 * `cancel()` la detiene sin resolver el flujo de frases (el skip lo usa): la
 * promesa `done` resuelve igual, pero quien la consume comprueba el estado.
 */
function choreograph(words: HTMLElement[]): Choreo {
  let cancel = () => {};
  const done = new Promise<void>((resolve) => {
    const steps: Array<() => void> = [
      ...words.map((w) => () => w.classList.add("p-word--on")),
      ...words.map((w) => () => {
        w.classList.add("p-word--pulse");
        window.setTimeout(() => {
          w.classList.remove("p-word--pulse");
          w.classList.add("p-word--lit");
        }, PULSE_MS);
      }),
    ];

    let next = 0;
    let lastAt = 0;
    let stopped = false;
    let wait: number | undefined;
    let fallback: number | undefined;
    let hard: number | undefined;

    const settle = () => {
      if (stopped) return;
      stopped = true;
      if (wait) window.clearTimeout(wait);
      if (fallback) window.clearInterval(fallback);
      if (hard) window.clearTimeout(hard);
      window.removeEventListener("espirangulo:tick", onTick);
      wait = fallback = hard = undefined;
      resolve();
    };
    cancel = settle;

    const stepOnce = () => {
      if (stopped) return;
      steps[next]?.();
      next++;
      if (next >= steps.length) {
        // La frase no está "terminada" hasta que el último pulso asienta: el
        // fade-out arranca recién ahí.
        window.setTimeout(settle, PULSE_MS);
      }
    };

    const onTick = (event: Event) => {
      const detail = (event as CustomEvent<{ at?: number }>).detail;
      const at = detail?.at ?? performance.now();
      if (at - lastAt < WORD_MIN_GAP) return;
      lastAt = at;
      if (wait) {
        window.clearTimeout(wait);
        wait = undefined;
      }
      stepOnce();
    };

    window.addEventListener("espirangulo:tick", onTick);
    // Ningún paso ocurre por reloj propio: todo espera su tick (incluida la
    // primera palabra). El respaldo y el techo son la red, no el camino.
    wait = window.setTimeout(() => {
      fallback = window.setInterval(stepOnce, WORD_FALLBACK_MS);
    }, TICK_FALLBACK_MS);
    hard = window.setTimeout(() => {
      while (next < steps.length) {
        steps[next]();
        next++;
      }
      settle();
    }, CHOREO_MAX_WAIT);
  });
  return { done, cancel };
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

/** Devuelve `.hero-name` a su posición natural y lo deja visible. */
function releaseHeroName(heroName: HTMLElement): void {
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
}

export function initIntro(): void {
  if (typeof document === "undefined") return;

  const skipBtn = document.getElementById("btn-skip-intro");

  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    const ib = document.getElementById("intro-block");
    if (ib) ib.remove();
    skipBtn?.remove();
    return; // el loader lo oculta el logo en reduced-motion (delay corto en main.ts)
  }

  const loader = document.getElementById("loader");
  const brand = document.getElementById("brand-logo");
  const phrase = document.getElementById("intro-phrase");
  const block = document.getElementById("intro-block");
  if (!loader || !block || !phrase) {
    skipBtn?.remove();
    return;
  }
  const loaderEl = loader;
  const blockEl = block;
  const phraseEl = phrase;

  let started = false;
  /** La intro se saltó o ya terminó: ningún timer pendiente debe revivirla. */
  let skipped = false;
  let finishing = false;
  /** El foco estaba en el botón de skip cuando se removió: hay que entregarlo. */
  let focusAfterIntro = false;
  const timers = new Set<number>();
  let activeChoreo: Choreo | null = null;

  /** setTimeout cancelable: el skip limpia todo de una sola vez. */
  function later(fn: () => void, ms: number): number {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (!skipped) fn();
    }, ms);
    timers.add(id);
    return id;
  }

  function clearTimers(): void {
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
  }

  function hideSkip(): void {
    // Si el foco estaba en el botón que se va, hay que entregarlo: el skip es
    // el foco inicial y removerlo sin handoff lo deja en <body>.
    if (skipBtn && document.activeElement === skipBtn) focusAfterIntro = true;
    skipBtn?.remove();
  }

  /** Entrega el foco a la entrada cuando la intro termina. */
  function focusHero(): void {
    const heroName = document.querySelector<HTMLElement>(".hero-name");
    if (!heroName) return;
    heroName.tabIndex = -1;
    heroName.focus({ preventScroll: true });
  }

  function hideLoader(): void {
    hideSkip();
    loaderEl.classList.add("hidden");
    if (brand) {
      brand.classList.add("minimized");
      if (brand instanceof HTMLButtonElement) brand.disabled = false;
    }
    if (focusAfterIntro) {
      focusAfterIntro = false;
      focusHero();
    }
  }

  /**
   * Revela el nombre como continuación del texto: el propio .hero-name aparece
   * (fade in) en el lugar de la última frase y vuela a su posición natural vía
   * transform; al aterrizar vuelve a flow y el loader se oculta.
   */
  function finish(revealRect?: DOMRect) {
    if (finishing || skipped) return;
    finishing = true;
    hideSkip();
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
    later(() => {
      let landed = false;
      const land = () => {
        if (landed) return;
        landed = true;
        // Libera el elemento: vuelve a flow en .hero-content (misma posición).
        // opacity queda en 1 inline: la base CSS es opacity:0 (fadeUp desactivado).
        releaseHeroName(heroName);
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
      later(land, 1800); // fallback si transitionend no dispara
    }, 900);
  }

  function showPhrase(i: number) {
    if (skipped) return;
    // Misma coreografía para las tres frases; cada una conserva su alineación
    // original (triángulo, tres líneas centradas, dos filas).
    phraseEl.classList.toggle("intro-phrase--triangle", i === 0);
    phraseEl.classList.toggle("intro-phrase--stack", i === 1);
    phraseEl.classList.toggle("intro-phrase--signature", i === 2);
    phraseEl.innerHTML = renderPhraseWords(FRASES[i]);
    phraseEl.classList.add("in");
    const words = Array.from(phraseEl.querySelectorAll<HTMLElement>(".p-word"));

    const leave = () => {
      if (skipped) return;
      phraseEl.classList.remove("in");
      phraseEl.classList.add("out");
      later(() => {
        if (skipped) return;
        phraseEl.classList.remove("out");
        if (i + 1 < FRASES.length) {
          later(() => showPhrase(i + 1), STEP);
        } else {
          // Continuación: el nombre aparece en el lugar de la última frase.
          const reveal = phraseEl.getBoundingClientRect();
          phraseEl.style.display = "none";
          finish(reveal);
        }
      }, FADE_OUT);
    };

    activeChoreo = choreograph(words);
    void activeChoreo.done.then(() => {
      if (skipped) return;
      later(() => {
        if (skipped) return;
        leave();
      }, PHRASE_HOLD);
    });
  }

  /** Cancela la intro y revela la página en el acto (no hay vuelo). */
  /** Cancela la intro y revela la página en el acto (no hay vuelo). */
  function skipToPage() {
    if (skipped) return;
    // La red de seguridad de main.ts puede ocultar el loader sin pasar por
    // acá: un clic posterior no debe tocar el hero ni el foco.
    if (loaderEl.classList.contains("hidden")) return;
    skipped = true;
    clearTimers();
    activeChoreo?.cancel();
    activeChoreo = null;
    blockEl.style.display = "none";
    const heroName = document.querySelector<HTMLElement>(".hero-name");
    if (heroName) {
      heroName.style.animation = "none";
      releaseHeroName(heroName);
    }
    // hideLoader hace el handoff de foco (el botón venía enfocado).
    hideLoader();
  }

  function start() {
    if (started || skipped) return;
    started = true;
    // 0.7s de negro (loader con el fractal) antes de la primera frase.
    later(() => showPhrase(0), START_DELAY);
  }

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });

  // Skip explícito y único: un listener global de click competía con los
  // controles que viven sobre el loader (.skip-link, nav) y les robaba el foco.
  if (skipBtn) {
    skipBtn.addEventListener("click", skipToPage);
    // El loader es opaco y tapa la HUD: el foco arranca en el único control
    // visible en vez de recorrer los focusables ocultos que haya antes.
    skipBtn.focus({ preventScroll: true });
  }
}
