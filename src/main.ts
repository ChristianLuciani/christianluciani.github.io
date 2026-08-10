import { id as kochId, mountKochLogo } from "./ts/fractals/koch";
import { id as neckerBgId, mountNeckerBg } from "./ts/illusions/neckerBg";
import { id as neckerIllId, mountNeckerIll } from "./ts/illusions/neckerIll";
import { mountSalas } from "./cv/render";

type CanvasModule = {
  id: string;
  mount: (canvas: HTMLCanvasElement) => { stop(): void };
};

// La secuencia intro (frases bajo el fractal) controla el ocultado del loader
// vía el script inline; por eso el fractal no debe auto-ocultarse temprano.
// En prefers-reduced-motion se oculta casi de inmediato (la intro se omite).
const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const INTRO_MINIMIZE_DELAY_MS = 60000; // normal: lo resuelve la intro (~10s)
const REDUCED_MINIMIZE_DELAY_MS = 300; // reduced-motion: ocultar ya

const CANVAS_MODULES: CanvasModule[] = [
  {
    id: kochId,
    mount: (c) =>
      mountKochLogo(c, {
        minimizeDelayMs: reduceMotion
          ? REDUCED_MINIMIZE_DELAY_MS
          : INTRO_MINIMIZE_DELAY_MS
      })
  },
  { id: neckerBgId, mount: (c) => mountNeckerBg(c) },
  { id: neckerIllId, mount: (c) => mountNeckerIll(c) }
];

function init() {
  // Parametrización de salas: nav, numeración, títulos y i18n estructural se
  // derivan de SALAS (src/cv) — debe montarse antes que los canvas.
  mountSalas();
  for (const mod of CANVAS_MODULES) {
    const el = document.getElementById(mod.id);
    if (el instanceof HTMLCanvasElement) mod.mount(el);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
