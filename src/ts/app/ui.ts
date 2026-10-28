/**
 * UI global (portado del script inline "utilidades" de Fase 1):
 * descarga CV, barra de progreso, scroll animations, parallax por sala y
 * navegación del HUD (delegada). Cursor nativo: el cursor personalizado se
 * retiró (riesgo de accesibilidad, no es lenguaje del laboratorio).
 * Todo se monta desde initUI() — sin efecto secundario a nivel de módulo.
 */

export function printCV(): void {
  const el = document.getElementById("print-cv");
  if (!el) return;
  el.style.display = "block";
  window.print();
  window.addEventListener(
    "afterprint",
    () => {
      el.style.display = "none";
    },
    { once: true }
  );
}

function initProgress(): void {
  const prog = document.getElementById("progress");
  if (!prog) return;
  window.addEventListener(
    "scroll",
    () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.width = (window.scrollY / h) * 100 + "%";
    },
    { passive: true }
  );
}

function initScrollAnimations(): void {
  const scrollEls = document.querySelectorAll("[data-scroll]");
  const seen = new WeakSet();
  const toggle = (el: Element, intersecting: boolean) => {
    if (intersecting) {
      el.classList.add("in-view");
      el.classList.remove("out-view-up", "out-view-down");
      seen.add(el);
    } else if (seen.has(el)) {
      const above = el.getBoundingClientRect().top < 0;
      el.classList.toggle("out-view-up", above);
      el.classList.toggle("out-view-down", !above);
      el.classList.remove("in-view");
    }
  };
  scrollEls.forEach((el) => {
    new IntersectionObserver((entries) => {
      const e = entries[0];
      toggle(el, e.isIntersecting);
    }, { threshold: 0.1 }).observe(el);
  });
}

function initParallax(): void {
  const rooms = document.querySelectorAll(".room");
  function updateParallax() {
    const vh = window.innerHeight;
    rooms.forEach((room) => {
      const rect = room.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - vh / 2;
      const p = center / vh;
      const scale = Math.max(0.96, 1 - Math.abs(p) * 0.04);
      const ty = p * 16;
      (room as HTMLElement).style.transform = `scale(${scale}) translateY(${ty}px)`;
    });
  }
  window.addEventListener("scroll", updateParallax, { passive: true });
  updateParallax();
}

/** Lleva el foco al destino del HUD (heading de la sala o el hero). */
function focusDestination(el: HTMLElement): void {
  const heading =
    el.querySelector<HTMLElement>(".room-title, .hero-name") ??
    el.querySelector<HTMLElement>("h1, h2") ??
    el;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}

function initNav(): void {
  /* Los .nav-dot los genera SALAS (render.ts); aquí solo la interacción:
     click por DELEGACIÓN y el estado activo lo gestiona render.ts. */
  const nav = document.getElementById("nav");
  if (nav) {
    nav.addEventListener("click", (e) => {
      const target = e.target as Element | null;
      const dot = target && target.closest ? target.closest(".nav-dot") : null;
      if (!dot) return;
      /* Click primario sin modificadores: interceptamos para hacer scroll suave
         y mover el foco. Ctrl/Cmd/Shift/Alt o botón no-primario conservan el
         comportamiento nativo (nueva pestaña, etc.). */
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const id = (dot as HTMLElement).dataset.target;
      const el = id && document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      history.pushState(null, "", `#${id}`);
      el.scrollIntoView({ behavior: "smooth" });
      focusDestination(el);
    });
  }

  /* Blueprint del museo → scroll suave (mismo comportamiento que el nav lateral) */
  document.querySelectorAll(".bp-room").forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = (a.getAttribute("href") || "").replace("#", "");
      const el = id && document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

/** Monta toda la UI global (progreso, scroll, parallax, nav, printCV). */
export function initUI(): void {
  if (typeof document === "undefined") return;
  const btn = document.getElementById("btn-download");
  if (btn) btn.addEventListener("click", printCV);
  initProgress();
  initScrollAnimations();
  initParallax();
  initNav();
}
