/**
 * GRAFO: mapa de conexiones (física de fuerzas en canvas) — port fiel del
 * script inline de Fase 1 a módulo. Sin efecto secundario a nivel de módulo:
 * main.ts llama mountGrafo() cuando el DOM está listo.
 */

interface GrafoNode {
  id: string;
  label: string;
  status: "raiz" | "area" | "pub" | "futuro";
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

// status: raiz | area | pub (publicado) | futuro (no publicado, dorado)
const NODOS: Omit<GrafoNode, "x" | "y" | "vx" | "vy" | "fx" | "fy" | "r">[] = [
  { id: "raiz", label: "Christian Luciani", status: "raiz" },
  { id: "fisica", label: "Física", status: "area" },
  { id: "ia", label: "IA Sintética · Agentes", status: "area" },
  { id: "sob", label: "Soberanía Tecnológica", status: "area" },
  { id: "oss", label: "Open Source", status: "area" },
  { id: "edu", label: "Educación", status: "area" },
  { id: "cog", label: "Cognición · Filosofía", status: "area" },
  { id: "kontablo", label: "Kontablo", status: "pub" },
  { id: "zentropy", label: "ZENTROPY", status: "pub" },
  { id: "drahma", label: "Drahma", status: "pub" },
  { id: "clapps", label: "CLAPPS · Noesis/Noetix", status: "pub" },
  { id: "estel", label: "Esteléctica", status: "pub" },
  { id: "erp", label: "ERPNext · Zanah", status: "pub" },
  { id: "topia", label: "Topia", status: "futuro" },
  { id: "nelson", label: "Nelson Companion", status: "futuro" }
];

const LINKS: [string, string][] = [
  ["raiz", "fisica"], ["raiz", "ia"], ["raiz", "sob"], ["raiz", "oss"], ["raiz", "edu"], ["raiz", "cog"],
  ["ia", "kontablo"], ["sob", "kontablo"], ["oss", "kontablo"],
  ["ia", "zentropy"], ["cog", "zentropy"],
  ["edu", "drahma"], ["ia", "drahma"],
  ["edu", "clapps"], ["ia", "clapps"], ["cog", "clapps"],
  ["cog", "estel"],
  ["sob", "erp"], ["oss", "erp"],
  ["oss", "topia"], ["cog", "topia"],
  ["edu", "nelson"]
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
    if (n.status === "futuro") return "#c9a84c";
    return n.status === "area" ? "#4aa8a4" : "#7fd6cc";
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
      ctxEl.font = (n.status === "raiz" ? "600 13px " : "11px ") + "'Playfair Display', serif";
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
            : n.status === "futuro"
              ? "no publicado"
              : n.status === "raiz"
                ? "raíz"
                : "área";
        tip.innerHTML =
          '<b style="color:' + col(n) + '">' + n.label + "</b><br><span style=\"color:var(--muted)\">" + stat + "</span>";
      } else tipEl.style.display = "none";
    }
    if (n) {
      tipEl.style.left = Math.min(mx + 14, W - 230) + "px";
      tipEl.style.top = my - 10 + "px";
    }
  });
  canvasEl.addEventListener("mouseleave", () => {
    hv = null;
    tipEl.style.display = "none";
  });

  loop();
}
