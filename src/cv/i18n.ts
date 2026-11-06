/**
 * i18n ES/EN — toggle por walker de nodos de texto (port fiel del script inline
 * de Fase 1 a módulo) + diccionario DERIVADO de las fuentes únicas.
 *
 * El MAP ya no se escribe a mano (#127): sale del pack de copy del tema
 * (`copyPairs`), de SALAS/render (`mapExtra`) y del SSOT (`profileI18nPairs`).
 * La estructura de salas (claves "SALA 0X", ROOM_EN, subtítulos) sigue en
 * `src/cv/salas.ts`. El index.html no tiene scripts inline — este módulo se
 * bundlea con Vite.
 *
 * El walker sigue keyeando por el texto EXACTO del nodo (no por atributo): el
 * golden del tema default es byte a byte y agregar `data-i18n` cambiaría el
 * render. Lo que cambió es la FUENTE del diccionario: las claves muertas ya no
 * se pueden escribir. La migración a nodos con clave llega con el registro de
 * narrativas (S3), que también re-renderiza y actualiza golden.
 */
import { mapExtra, roomEnList, syncNavLang } from "./render.ts";
import { profileI18nPairs } from "../content/cv/i18n.ts";
import { copyPairs } from "../content/copy.ts";

/**
 * Diccionario ES→EN del toggle.
 *
 * YA NO es una lista escrita a mano: se DERIVA de las fuentes únicas del texto
 * visible. Una clave escrita a mano en el MAP es imposible; eso NO significa
 * que todo par derivado lo consulte el walker:
 *   · `copyPairs()`   — pack de copy del tema (chrome + salas, #127);
 *   · `mapExtra()`    — numeración, subtítulos y funciones de SALAS;
 *   · `profileI18nPairs()` — pares derivados del SSOT (roles, highlights, …).
 * El walker recorre NODOS DE TEXTO: los pares `print.*` (salta `#print-cv`) y
 * los sólo-atributo (aria/alt/meta/caption) no los consulta, y un par derivado
 * de una rama del SSOT que los datos de hoy no renderizan queda sin nodo. Son
 * categorías declaradas, no claves muertas de mantenimiento (ver
 * `docs/CREAR-TEMA.md` §3.1 y el gate de categorías en el test).
 * Agregar copy = agregar una entrada al pack; el diccionario la ve solo.
 */
export function i18nDictionary(): Record<string, string> {
  return {
    ...copyPairs(),
    ...mapExtra(),
    ...profileI18nPairs()
  };
}

const MAP: Record<string, string> = i18nDictionary();

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const SKIP: Record<string, number> = { SCRIPT: 1, STYLE: 1, TITLE: 1 };

/** Monta el diccionario y el toggle ES/EN. Idempotente. */
export function initI18n(): void {
  if (typeof document === "undefined") return;

  // Claves de sala desde SALAS (idempotente) + pares ES/EN del SSOT (#109):
  // roles, highlights, descripciones y org entran traducidos sin diccionario manual.
  Object.assign(MAP, mapExtra(), profileI18nPairs());
  const roomTitlesEn = roomEnList();

  const printcv = document.getElementById("print-cv");
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n: Text) => {
      if (!n.nodeValue || !/\S/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      let p: Node | null = n.parentNode;
      while (p) {
        if (p.nodeType === 1) {
          const el = p as Element;
          if (SKIP[el.tagName]) return NodeFilter.FILTER_REJECT;
          if (p === printcv) return NodeFilter.FILTER_REJECT;
          if (el.id === "btn-lang") return NodeFilter.FILTER_REJECT;
        }
        p = p.parentNode;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes: Text[] = [];
  const orig: string[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    nodes.push(n as Text);
    orig.push(n.nodeValue ?? "");
  }
  let titles = Array.from(document.querySelectorAll(".room-title")) as HTMLElement[];
  let titlesOrig = titles.map((e) => e.innerHTML);

  function apply(lang: string) {
    const en = lang === "en";
    for (let i = 0; i < nodes.length; i++) {
      const o = orig[i];
      const k = norm(o);
      const tr = en && MAP[k];
      if (tr) {
        const lead = (o.match(/^\s*/) || [""])[0];
        const trail = (o.match(/\s*$/) || [""])[0];
        nodes[i].nodeValue = lead + tr + trail;
      } else {
        nodes[i].nodeValue = o;
      }
    }
    titles.forEach((e, i) => {
      e.innerHTML = en && roomTitlesEn[i] ? roomTitlesEn[i] : titlesOrig[i];
    });
    document.documentElement.lang = en ? "en" : "es";
    // aria-labels del HUD (marca + landmark) siguen el mismo ciclo ES/EN.
    document.querySelectorAll<HTMLElement>("[data-aria-es]").forEach((el) => {
      const label = en ? el.dataset.ariaEn : el.dataset.ariaEs;
      if (label) el.setAttribute("aria-label", label);
    });
    syncNavLang();
    const b = document.getElementById("btn-lang");
    if (b) b.textContent = en ? "ES" : "EN";
    try {
      localStorage.setItem("lang", lang);
    } catch {
      /* ignore */
    }
  }

  const b = document.getElementById("btn-lang");
  if (b) {
    b.addEventListener("click", () => {
      apply(document.documentElement.lang === "en" ? "es" : "en");
    });
  }
  let cur = "es";
  try {
    cur = localStorage.getItem("lang") || "es";
  } catch {
    /* ignore */
  }
  if (cur === "en") apply("en");

  /* SALAS montó (render.ts): refresca los títulos capturados y re-aplica el
     idioma actual — idempotente; en ES no cambia nada visible. */
  document.addEventListener("cv:salas-ready", () => {
    titles = Array.from(document.querySelectorAll(".room-title")) as HTMLElement[];
    titlesOrig = titles.map((e) => e.innerHTML);
    apply(cur);
  });
}
