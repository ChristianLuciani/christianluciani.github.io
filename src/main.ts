/**
 * Entry de la app (bundle de Vite). Orquesta los módulos que antes vivían en
 * scripts inline del index.html (Fase 2 de docs/REFACTOR_PLAN.md): UI global,
 * i18n, intro, grafo y los canvas de ilusiones. El index.html ya no tiene
 * scripts inline — todo llega bundleado.
 */

import { initI18n } from "./cv/i18n";
import { initIntro } from "./cv/intro";
import { mountSalas } from "./cv/render";
import { installAssetFallback } from "./ts/assets/fallback";
import { initAmbientSound } from "./ts/app/ambient";
import { initUI } from "./ts/app/ui";
import { mountGrafo } from "./ts/graph/grafo";

import { mountBrandLogo } from "./ts/brand/logoAnim.js";
import { mountKochArt } from "./ts/fractals/koch";
import { id as neckerBgId, mountNeckerBg } from "./ts/illusions/neckerBg";
import { id as neckerIllId, mountNeckerIll } from "./ts/illusions/neckerIll";
import { id as heroCubesId, mount as mountHeroCubes } from "./ts/illusions/heroCubes";
import { id as stairsId, mount as mountStairs } from "./ts/illusions/stairs";
import { id as interferenceId, mount as mountInterference } from "./ts/illusions/interference";
import { id as snakesId, mount as mountRotatingSnakes } from "./ts/illusions/rotatingSnakes";
import { id as penroseId, mount as mountPenrose } from "./ts/illusions/penrose";
import { id as sierpinskiId, mount as mountSierpinski } from "./ts/illusions/sierpinski";
import { id as proyectosId, mount as mountProyectos } from "./ts/illusions/proyectos";

type CanvasModule = {
  id: string;
  mount: (canvas: HTMLCanvasElement) => void;
};

// La secuencia intro (frases bajo el fractal) controla el ocultado del loader
// vía intro.ts; por eso el fractal no debe auto-ocultarse temprano.
// En prefers-reduced-motion se oculta casi de inmediato (la intro se omite).
const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SAFETY_MINIMIZE_DELAY_MS = 60000; // red de seguridad: la intro lo resuelve (~10s)
const REDUCED_MINIMIZE_DELAY_MS = 300; // reduced-motion: ocultar ya

const CANVAS_MODULES: CanvasModule[] = [
  { id: neckerBgId, mount: (c) => mountNeckerBg(c) },
  { id: neckerIllId, mount: (c) => mountNeckerIll(c) },
  { id: heroCubesId, mount: mountHeroCubes },
  { id: stairsId, mount: mountStairs },
  { id: interferenceId, mount: mountInterference },
  { id: snakesId, mount: mountRotatingSnakes },
  { id: penroseId, mount: mountPenrose },
  { id: sierpinskiId, mount: mountSierpinski },
  { id: proyectosId, mount: mountProyectos },
  // El Bastidor reusa el campo fractal: otra sala, el mismo renderer.
  { id: "c-bastidor", mount: mountProyectos }
];

function init() {
  // Parametrización: nav, numeración, títulos e i18n estructural desde SALAS
  // (idempotente; en el HTML generado ya están alineados).
  mountSalas();
  // Mapa de conexiones (física de fuerzas).
  mountGrafo();
  // Canvas de ilusiones + mark de marca.
  for (const mod of CANVAS_MODULES) {
    const el = document.getElementById(mod.id);
    if (el instanceof HTMLCanvasElement) mod.mount(el);
  }
  // Mark animado de marca: loader y logo permanente (reemplaza el Koch).
  const brand = document.getElementById("brand-logo");
  if (brand) {
    mountBrandLogo(brand);
    brand.addEventListener("click", () => {
      document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
    });
    const minimize = () => {
      document.getElementById("loader")?.classList.add("hidden");
      brand.classList.add("minimized");
      if (brand instanceof HTMLButtonElement) brand.disabled = false;
    };
    window.setTimeout(minimize, reduceMotion ? REDUCED_MINIMIZE_DELAY_MS : SAFETY_MINIMIZE_DELAY_MS);
  }
  // Koch del Buzón: pieza visual de la sala de contacto.
  const kochBuzon = document.getElementById("c-koch-buzon");
  if (kochBuzon instanceof HTMLCanvasElement) mountKochArt(kochBuzon);
}

// Fallback de assets (ADR docs/cdn-decision.md): si la CDN no responde, el
// asset vuelve a la copia de Pages. No-op cuando VITE_ASSET_BASE_URL está vacía.
installAssetFallback();

// UI global, i18n e intro (el DOM ya está parseado: módulos = deferred).
initUI();
initI18n();
initIntro();
// Sonido ambiente (cantos de ballenas, volumen muy bajo): se activa con el
// primer gesto del usuario (autoplay policy) o en carga si el browser lo permite.
initAmbientSound();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
