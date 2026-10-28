/**
 * INTRO — tres frases con UNA coreografía acompasada al Espirángulo
 * (`espirangulo:tick`): cada palabra entra en gris, después pulsa a teal y
 * asienta en blanco. La primera frase se arma en triángulo; la última cierra
 * con la traza de oro de los dos últimos trazos del logo (la C).
 * Al terminar, el `.hero-name` aparece donde terminó la última frase y vuela a
 * su posición natural; al aterrizar vuelve a flow y el loader se oculta.
 */

const FRASES = [
  "Arte, Ciencia, Filosofía.",
  "Perspectivas del Universo…",
  "<span>Instancia Humana</span>"
];

const FADE_OUT = 1100; // ms
const STEP = 350; // espera entre transiciones
const START_DELAY = 700; // ms de negro antes de la primera frase (parsimonia)

/** Hold de la frase ya coreografiada, antes del fade-out. */
const PHRASE_HOLD = 1200; // ms
/** Duración del pulso teal de cada palabra. */
const PULSE_MS = 520; // ms
/** Traza de oro: cuándo arranca y cuánto tarda en dibujarse. */
const TRACE_DELAY = 220; // ms
const TRACE_MS = 900; // ms
/** Si el clock no late, cuánto esperar antes de caer a cadencia fija. */
const TICK_FALLBACK_MS = 700; // ms
/** Cadencia de respaldo (sin Espirángulo) y separación mínima entre pasos. */
const WORD_FALLBACK_MS = 420; // ms
const WORD_MIN_GAP = 260; // ms — un tick sí, dos también: nunca a ráfaga
/** Techo duro: la intro jamás se cuelga esperando un tick que no llega. */
const CHOREO_MAX_WAIT = 12000; // ms

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
 */
function choreograph(words: HTMLElement[]): Promise<void> {
  return new Promise<void>((resolve) => {
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
    let done = false;
    let wait: number | undefined;
    let fallback: number | undefined;
    let hard: number | undefined;

    const cleanup = () => {
      done = true;
      if (wait) window.clearTimeout(wait);
      if (fallback) window.clearInterval(fallback);
      if (hard) window.clearTimeout(hard);
      window.removeEventListener("espirangulo:tick", onTick);
      wait = fallback = hard = undefined;
    };

    const stepOnce = () => {
      if (done) return;
      steps[next]?.();
      next++;
      if (next >= steps.length) {
        // La frase no está "terminada" hasta que el último pulso asienta: la
        // traza de oro (o el fade-out) arranca recién ahí.
        window.setTimeout(() => {
          cleanup();
          resolve();
        }, PULSE_MS);
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
      cleanup();
      resolve();
    }, CHOREO_MAX_WAIT);
  });
}

/**
 * Traza de los DOS ÚLTIMOS trazos del Espirángulo — la C. El logo publica sus
 * tres puntos en `svg.dataset.c` ({a, b, tip}), así que la traza usa la
 * geometría real de la marca y no una imitación. Se dibuja en oro con
 * terminales redondeados, bajo las dos palabras, como último compás.
 * Sin logo montado no dibuja nada: la frase se sostiene igual.
 */
function drawGoldTrace(target: HTMLElement): Promise<void> {
  return new Promise<void>((resolve) => {
    const svg = document.querySelector<SVGSVGElement>("#brand-logo svg");
    const raw = svg?.dataset.c;
    if (!raw) {
      resolve();
      return;
    }
    let pts: Array<{ x: number; y: number }>;
    try {
      const { a, b, tip } = JSON.parse(raw) as Record<string, { x: number; y: number }>;
      pts = [a, b, tip];
    } catch {
      resolve();
      return;
    }
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const pad = 6;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const w = Math.max(...xs) - minX + pad;
    const h = Math.max(...ys) - minY + pad;

    const ns = "http://www.w3.org/2000/svg";
    const trace = document.createElementNS(ns, "svg");
    trace.setAttribute("class", "intro-trace");
    trace.setAttribute("viewBox", `${minX} ${minY} ${w} ${h}`);
    trace.setAttribute("aria-hidden", "true");
    trace.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y} L ${pts[2].x} ${pts[2].y}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "var(--gold)");
    path.setAttribute("stroke-width", String(Math.max(3, Math.min(w, h) * 0.07)));
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("pathLength", "1");
    path.setAttribute("stroke-dasharray", "1");
    path.setAttribute("stroke-dashoffset", "1");
    trace.appendChild(path);
    target.appendChild(trace);

    void trace.getBoundingClientRect(); // reflow: el dashoffset inicial se aplica
    path.style.transition = `stroke-dashoffset ${TRACE_MS}ms cubic-bezier(.16,1,.3,1)`;
    path.setAttribute("stroke-dashoffset", "0");
    window.setTimeout(resolve, TRACE_MS);
  });
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
    return; // el loader lo oculta el logo en reduced-motion (delay corto en main.ts)
  }

  const loader = document.getElementById("loader");
  const brand = document.getElementById("brand-logo");
  const phrase = document.getElementById("intro-phrase");
  const block = document.getElementById("intro-block");
  if (!loader || !block || !phrase) return;
  const loaderEl = loader;
  const phraseEl = phrase;

  let started = false;

  function hideLoader() {
    loaderEl.classList.add("hidden");
    if (brand) {
      brand.classList.add("minimized");
      if (brand instanceof HTMLButtonElement) brand.disabled = false;
    }
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
    // Misma coreografía para las tres frases; la primera se arma en triángulo
    // y la última cierra con la traza de oro de los dos últimos trazos.
    const triangle = i === 0;
    const last = i === FRASES.length - 1;
    phraseEl.classList.toggle("intro-phrase--triangle", triangle);
    phraseEl.classList.toggle("intro-phrase--final", last);
    phraseEl.innerHTML = renderPhraseWords(FRASES[i]);
    phraseEl.classList.add("in");
    const words = Array.from(phraseEl.querySelectorAll<HTMLElement>(".p-word"));

    const leave = () => {
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
    };

    void choreograph(words)
      .then(() => {
        if (!last) return Promise.resolve();
        // Último compás: la traza de los dos últimos trazos del Espirángulo.
        return new Promise<void>((r) => setTimeout(r, TRACE_DELAY)).then(() => drawGoldTrace(phraseEl));
      })
      .then(() => {
        setTimeout(leave, PHRASE_HOLD);
      });
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
