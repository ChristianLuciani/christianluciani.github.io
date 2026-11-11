/**
 * GRAFO: mapa de conexiones (física de fuerzas en canvas) — port fiel del
 * script inline de Fase 1 a módulo. Sin efecto secundario a nivel de módulo:
 * main.ts llama mountGrafo() cuando el DOM está listo.
 */

import { t } from "../../content/copy.ts";

interface GrafoNode {
  id: string;
  label: string;
  status: "raiz" | "area" | "pub" | "desarrollo" | "futuro";
  /** Repo/sitio del proyecto: los nodos `pub` con `href` abren pestaña nueva. */
  href?: string;
  /** Línea de descripción compacta de la tarjeta (tooltip). */
  desc: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  r: number;
}

interface GrafoEdge {
  a: GrafoNode;
  b: GrafoNode;
}

// status: raiz | area | pub (publicado, dorado) | desarrollo (teal) | futuro (idea, gris)
// COPY DE NODOS (#127): sólo los labels que el pack declara (`graph.node.*`)
// se piden con `t()`. El resto sigue literal acá porque es nombre propio
// estable (Christian Luciani, Kontablo, Drahma, …) o etiología de área sin
// traducción (Física, Educación, Open Source). No es una regla general: un
// label nuevo que sea copy de narrativa entra al pack.
// Exportados: `docs/SPEC.md` §4 los cita como fuente de los nodos/aristas y el
// chequeo de punteros (`tools/docs/doc-pointers.test.ts`) verifica el export.
export const NODOS: Omit<GrafoNode, "x" | "y" | "vx" | "vy" | "fx" | "fy" | "r">[] = [
  {
    id: "raiz", label: "Christian Luciani", status: "raiz",
    desc: t("graph.desc.raiz")
  },
  { id: "fisica", label: "Física", status: "area", desc: t("graph.desc.fisica") },
  { id: "ia", label: t("graph.node.ia"), status: "area", desc: t("graph.desc.ia") },
  { id: "sob", label: t("graph.node.soberania"), status: "area", desc: t("graph.desc.sob") },
  { id: "oss", label: "Open Source", status: "area", desc: t("graph.desc.oss") },
  { id: "edu", label: "Educación", status: "area", desc: t("graph.desc.edu") },
  { id: "cog", label: t("graph.node.cognicion"), status: "area", desc: t("graph.desc.cog") },
  {
    id: "kontablo", label: "Kontablo", status: "pub",
    href: "https://github.com/ChristianLuciani/accounting-esperanto",
    desc: t("graph.desc.kontablo")
  },
  {
    id: "drahma", label: "Drahma", status: "pub",
    href: "https://github.com/DRAHMAN-ORG/drahman-org",
    desc: t("graph.desc.drahma")
  },
  {
    id: "profile", label: "profile-as-code", status: "pub",
    href: "https://github.com/ChristianLuciani/profile-as-code",
    desc: t("graph.desc.profile")
  },
  {
    id: "now", label: "now", status: "pub",
    href: "https://github.com/ChristianLuciani/now",
    desc: t("graph.desc.now")
  },
  {
    id: "brandkit", label: "cluciani-brand-kit", status: "pub",
    href: "https://github.com/ChristianLuciani/cluciani-brand-kit",
    desc: t("graph.desc.brandkit")
  },
  {
    id: "pascotemplate", label: "profile-data-template", status: "pub",
    href: "https://github.com/ChristianLuciani/profile-data-template",
    desc: t("graph.desc.pascotemplate")
  },
  {
    id: "site", label: "christianluciani.github.io", status: "pub",
    href: "https://github.com/ChristianLuciani/christianluciani.github.io",
    desc: t("graph.desc.site")
  },
  {
    id: "profilereadme", label: t("graph.node.profilereadme"), status: "pub",
    href: "https://github.com/ChristianLuciani/ChristianLuciani",
    desc: t("graph.desc.profilereadme")
  },
  { id: "zentropy", label: "ZENTROPY", status: "desarrollo", desc: t("graph.desc.zentropy") },
  { id: "clapps", label: t("graph.node.clapps"), status: "desarrollo", desc: t("graph.desc.clapps") },
  { id: "estel", label: "Esteléctica", status: "desarrollo", desc: t("graph.desc.estel") },
  { id: "topia", label: "Topia", status: "desarrollo", desc: t("graph.desc.topia") },
  { id: "nelson", label: "Nelson Companion", status: "desarrollo", desc: t("graph.desc.nelson") },
  { id: "noos", label: t("graph.node.noos"), status: "desarrollo", desc: t("graph.desc.noos") },
  { id: "komuno", label: "Komuno", status: "desarrollo", desc: t("graph.desc.komuno") },
  { id: "noesis", label: "Noesis", status: "desarrollo", desc: t("graph.desc.noesis") },
  { id: "noetix", label: "Noetix", status: "desarrollo", desc: t("graph.desc.noetix") },
  { id: "infoniz", label: "Infoniz", status: "desarrollo", desc: t("graph.desc.infoniz") },
  { id: "taller", label: "Taller Editorial", status: "desarrollo", desc: t("graph.desc.taller") },
  { id: "identeco", label: "Identeco Cifereca", status: "desarrollo", desc: t("graph.desc.identeco") },
  {
    id: "internaltools", label: t("graph.node.internaltools"), status: "desarrollo",
    desc: t("graph.desc.internaltools")
  },
  { id: "estaseologia", label: "Estaseología", status: "futuro", desc: t("graph.desc.estaseologia") },
  {
    id: "sintergeticas", label: t("graph.node.sintergeticas"), status: "futuro",
    desc: t("graph.desc.sintergeticas")
  }
];

/** Aristas del grafo, por id de nodo (`[desde, hacia]`). */
export const LINKS: [string, string][] = [
  ["raiz", "fisica"], ["raiz", "ia"], ["raiz", "sob"], ["raiz", "oss"], ["raiz", "edu"], ["raiz", "cog"],
  ["ia", "kontablo"], ["sob", "kontablo"], ["oss", "kontablo"],
  ["ia", "zentropy"], ["cog", "zentropy"],
  ["edu", "drahma"], ["ia", "drahma"],
  ["edu", "clapps"], ["ia", "clapps"], ["cog", "clapps"],
  ["cog", "estel"],
  ["sob", "noos"], ["oss", "noos"], ["noos", "kontablo"], ["noos", "internaltools"],
  ["oss", "topia"], ["cog", "topia"],
  ["oss", "profile"], ["ia", "profile"], ["profile", "pascotemplate"], ["profile", "zentropy"],
  ["edu", "nelson"],
  ["raiz", "now"], ["now", "site"], ["now", "profilereadme"], ["now", "brandkit"],
  ["raiz", "brandkit"],
  ["sob", "komuno"], ["sob", "infoniz"], ["infoniz", "zentropy"], ["identeco", "infoniz"],
  ["sob", "identeco"],
  ["cog", "noesis"], ["estel", "noesis"],
  ["cog", "noetix"], ["noesis", "noetix"], ["estel", "noetix"],
  ["edu", "taller"], ["estel", "taller"],
  ["clapps", "drahma"], ["clapps", "taller"], ["clapps", "noesis"], ["clapps", "noetix"],
  ["fisica", "clapps"],
  ["cog", "estaseologia"], ["ia", "sintergeticas"]
];

export function mountGrafo(): void {
  const canvas = document.getElementById("c-graph");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const stage = document.getElementById("graph-stage");
  const tip = document.getElementById("graph-tip");
  if (!stage || !tip) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  // Shadows post-guard: TS no conserva el narrowing dentro de closures.
  const canvasEl = canvas;
  const stageEl = stage;
  const tipEl = tip;
  const ctxEl = ctx;

  let W = 0;
  let H = 0;
  const nodes: GrafoNode[] = NODOS.map((n) => ({
    ...n,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    fx: 0,
    fy: 0,
    r: n.status === "raiz" ? 15 : n.status === "area" ? 9 : 7
  }));
  const byId: Record<string, GrafoNode> = {};
  nodes.forEach((n) => {
    byId[n.id] = n;
  });
  const edges: GrafoEdge[] = LINKS.map((l) => ({
    a: byId[l[0]],
    b: byId[l[1]]
  }));

  function seed() {
    nodes.forEach((n) => {
      if (n.status === "raiz") {
        n.x = W / 2;
        n.y = H / 2;
        return;
      }
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * Math.min(W, H) * 0.42;
      n.x = W / 2 + Math.cos(a) * r;
      n.y = H / 2 + Math.sin(a) * r;
    });
  }
  function resize() {
    W = canvasEl.width = stageEl.clientWidth;
    H = canvasEl.height = stageEl.clientHeight;
    seed();
  }
  resize();
  window.addEventListener("resize", resize);

  const REP = 9000;
  const SPR = 0.02;
  const REST = 120;
  const CTR = 0.0025;
  const DAMP = 0.85;
  function step() {
    nodes.forEach((n) => {
      n.fx = 0;
      n.fy = 0;
    });
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy + 1e-6;
        const d = Math.sqrt(d2);
        const f = REP / d2;
        a.fx -= (dx / d) * f;
        a.fy -= (dy / d) * f;
        b.fx += (dx / d) * f;
        b.fy += (dy / d) * f;
      }
    edges.forEach((e) => {
      const dx = e.b.x - e.a.x;
      const dy = e.b.y - e.a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - REST) * SPR;
      e.a.fx += (dx / d) * f;
      e.a.fy += (dy / d) * f;
      e.b.fx -= (dx / d) * f;
      e.b.fy -= (dy / d) * f;
    });
    nodes.forEach((n) => {
      if (n.status === "raiz") {
        n.x = W / 2;
        n.y = H / 2;
        n.vx = 0;
        n.vy = 0;
        return;
      }
      n.x += (W / 2 - n.x) * CTR;
      n.y += (H / 2 - n.y) * CTR;
      n.vx = (n.vx + n.fx) * DAMP;
      n.vy = (n.vy + n.fy) * DAMP;
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 12) n.x = 12;
      if (n.x > W - 12) n.x = W - 12;
      if (n.y < 12) n.y = 12;
      if (n.y > H - 12) n.y = H - 12;
    });
  }
  function col(n: GrafoNode): string {
    if (n.status === "raiz") return "#00c9c0";
    if (n.status === "futuro") return "#8892a0";
    if (n.status === "desarrollo") return "#00c9c0";
    return n.status === "area" ? "#4aa8a4" : "#c9a84c";
  }

  let hv: GrafoNode | null = null;
  function hit(x: number, y: number): GrafoNode | null {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (Math.hypot(n.x - x, n.y - y) <= n.r + 6) return n;
    }
    return null;
  }

  function draw() {
    ctxEl.clearRect(0, 0, W, H);
    // aristas
    edges.forEach((e) => {
      const active = hv && (e.a === hv || e.b === hv);
      ctxEl.beginPath();
      ctxEl.moveTo(e.a.x, e.a.y);
      ctxEl.lineTo(e.b.x, e.b.y);
      ctxEl.strokeStyle = active ? "rgba(0,201,192,.65)" : "rgba(0,201,192,.15)";
      ctxEl.lineWidth = active ? 1.6 : 1;
      ctxEl.stroke();
    });
    // nodos
    const neigh: GrafoNode[] = [];
    if (hv) {
      edges.forEach((e) => {
        if (e.a === hv) neigh.push(e.b);
        else if (e.b === hv) neigh.push(e.a);
      });
    }
    nodes.forEach((n) => {
      const act = hv && (n === hv || neigh.indexOf(n) !== -1);
      ctxEl.globalAlpha = hv ? (act ? 1 : 0.16) : 1;
      ctxEl.beginPath();
      ctxEl.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctxEl.fillStyle = col(n);
      // halo sutil
      if (n === hv) {
        ctxEl.shadowColor = col(n);
        ctxEl.shadowBlur = 18;
      }
      ctxEl.fill();
      ctxEl.shadowBlur = 0;
      // label
      ctxEl.fillStyle =
        act || !hv ? (n.status === "raiz" ? "#ffffff" : "#d6dde8") : "rgba(130,140,155,.6)";
      ctxEl.font =
        (n.status === "raiz" ? "600 13px " : "11px ") +
        "ui-sans-serif, system-ui, -apple-system, sans-serif";
      ctxEl.textAlign = "center";
      const ly = n.y + n.r + 14;
      ctxEl.fillText(n.label, n.x, ly);
      ctxEl.globalAlpha = 1;
    });
  }

  function loop() {
    step();
    draw();
    requestAnimationFrame(loop);
  }

  // interacción
  canvasEl.addEventListener("mousemove", (e) => {
    const r = canvasEl.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const n = hit(mx, my);
    if (n !== hv) {
      hv = n;
      if (n) {
        tipEl.style.display = "block";
        const stat =
          n.status === "pub"
            ? "publicado/activo"
            : n.status === "desarrollo"
              ? "en desarrollo"
              : n.status === "futuro"
                ? "idea"
                : n.status === "raiz"
                  ? "raíz"
                  : "área";
        tip.innerHTML =
          '<b style="color:' + col(n) + '">' + n.label + (n.href ? " ↗" : "") + "</b><br><span style=\"color:var(--muted)\">" + stat +
          (n.status !== "raiz" && n.status !== "area" ? " · " + t("graph.tip.author") : "") +
          "</span><br><span style=\"color:var(--muted)\">" + n.desc + "</span>";
      } else tipEl.style.display = "none";
    }
    canvasEl.style.cursor = n && n.href ? "pointer" : "default";
    if (n) {
      tipEl.style.left = Math.min(mx + 14, W - 230) + "px";
      tipEl.style.top = my - 10 + "px";
    }
  });
  canvasEl.addEventListener("mouseleave", () => {
    hv = null;
    tipEl.style.display = "none";
    canvasEl.style.cursor = "default";
  });
  canvasEl.addEventListener("click", () => {
    if (hv && hv.href) window.open(hv.href, "_blank", "noopener");
  });

  loop();
}
