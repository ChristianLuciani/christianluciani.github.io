/**
 * UI global (portado del script inline "utilidades" de Fase 1):
 * descarga CV, cursor personalizado, barra de progreso, scroll animations,
 * parallax por sala y navegación lateral (delegada). Todo se monta desde
 * initUI() — sin efecto secundario a nivel de módulo.
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

function initCursor(): void {
  const cur = document.getElementById("cursor");
  const ring = document.getElementById("cursorRing");
  if (!cur || !ring) return;

  /* Touch devices: hide custom cursor, restore system cursor */
  if (window.matchMedia("(pointer: coarse)").matches) {
    document.body.style.cursor = "auto";
    cur.style.display = "none";
    ring.style.display = "none";
    return;
  }
  let mx = 0;
  let my = 0;
  let rx = 0;
  let ry = 0;

  document.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
  });

  (function animCursor() {
    cur.style.left = mx + "px";
    cur.style.top = my + "px";
    rx += (mx - rx) * 0.1;
    ry += (my - ry) * 0.1;
    ring.style.left = rx + "px";
    ring.style.top = ry + "px";
    requestAnimationFrame(animCursor);
  })();

  /* Delegado: cubre también elementos generados luego (nav-dots desde SALAS) */
  const growSel =
    "a, button, .nav-dot, .drahma-cell, .pub-item, .skill-block, .gallery-slot, .project-card, .illusion-frame";
  const grow = () => {
    ring.style.width = "58px";
    ring.style.height = "58px";
    cur.style.background = "var(--gold)";
  };
  const shrink = () => {
    ring.style.width = "36px";
    ring.style.height = "36px";
    cur.style.background = "var(--teal)";
  };
  let hovering = false;
  document.addEventListener("mouseover", (e) => {
    if (e.target instanceof Element && e.target.closest(growSel)) {
      if (!hovering) {
        hovering = true;
        grow();
      }
    }
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target instanceof Element && !e.target.closest(growSel)) {
      if (hovering) {
        hovering = false;
        shrink();
      }
    }
  });
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

function initNav(): void {
  /* Los .nav-dot los genera SALAS (render.ts); aquí solo la interacción:
     click por DELEGACIÓN y el estado activo lo gestiona render.ts. */
  const nav = document.getElementById("nav");
  if (nav) {
    nav.addEventListener("click", (e) => {
      const target = e.target as Element | null;
      const dot = target && target.closest ? target.closest(".nav-dot") : null;
      if (!dot) return;
      const id = (dot as HTMLElement).dataset.target;
      const el = id && document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
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

/** Monta toda la UI global (cursor, progreso, scroll, parallax, nav, printCV). */
export function initUI(): void {
  if (typeof document === "undefined") return;
  const btn = document.getElementById("btn-download");
  if (btn) btn.addEventListener("click", printCV);
  initCursor();
  initProgress();
  initScrollAnimations();
  initParallax();
  initNav();
}
