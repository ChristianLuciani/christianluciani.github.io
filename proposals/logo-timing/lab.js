/* ─────────────────────────────────────────────────────────────────────
   timing-lab — motor del experimento temporal (vanilla, sin build).
   Requiere window.LAB_GEO (geometry.data.js) y <body data-criterion="1|2|3">.

   El reloj es único y determinista: `clock` en ms sobre el cronograma
   horneado. Todo el render (líneas, nodos, estela, timeline, gráfico) se
   deriva de ese reloj, así que pausar, scrubear o congelar por URL no
   introduce estado paralelo.
   ───────────────────────────────────────────────────────────────────── */
(() => {
  "use strict";

  const G = window.LAB_GEO;
  if (!G) throw new Error("timing-lab: falta geometry.data.js");

  const CRITERION = Number(document.body.dataset.criterion || 1);
  const META = {
    1: { accent: "#00c9c0", name: "Intervalo constante" },
    2: { accent: "#7ad7ff", name: "Velocidad constante" },
    3: { accent: "#ff8a70", name: "Aceleración constante" },
  }[CRITERION];
  if (!META) throw new Error(`timing-lab: criterio desconocido ${CRITERION}`);

  document.documentElement.style.setProperty("--accent", META.accent);

  const NS = "http://www.w3.org/2000/svg";
  const REF_KEY = document.body.dataset.tref || String(G.tRefs[0]);
  const REF = G.refs[REF_KEY];
  if (!REF) throw new Error(`timing-lab: referencia desconocida ${REF_KEY}`);
  const T = REF.timing[CRITERION];
  const DUR = T.durations;
  const STARTS = T.starts;
  const ENDS = T.ends;
  const LEAD = REF.leadMs;
  const TOTAL = T.total;
  const HOLD = G.holdMs;
  const SEGS = G.segs;
  const NODES = G.nodes;
  const REF_I = G.refIndex;
  const LAST = SEGS.length - 1;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (id) => document.getElementById(id);
  const fmt = (v, d = 2) => Number(v).toFixed(d).replace(".", ",");
  const fmtInt = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const pad = (n) => String(n).padStart(2, "0");
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const E = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };

  /* ── estado ───────────────────────────────────────────────────────── */
  let clock = 0;
  let playing = !reduced;
  let rate = 1;
  let loop = true;
  let lastFrame = performance.now();
  let active = -1;
  let lastActiveRow = -1;

  const freeze = new URLSearchParams(location.hash.replace(/^#/, ""));
  if (freeze.has("t")) {
    const t = Number(freeze.get("t"));
    if (Number.isFinite(t)) {
      clock = clamp(t * 1000, 0, TOTAL);
      playing = false;
    }
  }
  if (reduced) {
    document.body.classList.add("reduced");
    clock = TOTAL;
    playing = false;
  }


  /* ── SVG del logo ─────────────────────────────────────────────────── */
  const svg = $("lab-svg");
  svg.setAttribute("viewBox", `${G.viewBox.x} ${G.viewBox.y} ${G.viewBox.w} ${G.viewBox.h}`);

  const defs = E("defs", {}, svg);
  const soft = E("filter", { id: "lab-soft", x: "-80%", y: "-80%", width: "260%", height: "260%" }, defs);
  E("feGaussianBlur", { stdDeviation: "3" }, soft);
  const glow = E("filter", { id: "lab-glow", x: "-140%", y: "-140%", width: "380%", height: "380%" }, defs);
  E("feGaussianBlur", { stdDeviation: "2.6" }, glow);

  const skyG = E("g", { class: "sky" }, svg);
  G.sky.forEach((s, i) => {
    const c = E("circle", {
      class: "sky-dot",
      cx: s.x, cy: s.y, r: s.r,
      fill: s.color,
      style: `--o:${s.opacity};--tw:${s.twinkle}s;--td:-${(i * 0.37 % s.twinkle).toFixed(2)}s`,
    }, skyG);
    c.style.opacity = s.opacity;
  });

  E("polygon", {
    class: "ghost",
    points: G.ghost.map((p) => `${p.x},${p.y}`).join(" "),
  }, svg);

  const skelG = E("g", { class: "skeletons" }, svg);
  SEGS.forEach((s) => {
    E("line", {
      class: "skeleton",
      x1: s.a.x, y1: s.a.y, x2: s.b.x, y2: s.b.y,
      stroke: s.color, "stroke-width": s.width,
    }, skelG);
  });

  /* la referencia se marca ANTES del trazado: es el ancla del cálculo */
  const ref = SEGS[REF_I];
  E("line", {
    class: "ref-guide",
    x1: ref.a.x, y1: ref.a.y, x2: ref.b.x, y2: ref.b.y,
  }, svg);

  const lines = SEGS.map((s) => E("line", {
    class: "seg",
    x1: s.a.x, y1: s.a.y, x2: s.b.x, y2: s.b.y,
    stroke: s.color,
    "stroke-width": s.width,
    opacity: s.opacity,
    "stroke-dasharray": s.len,
    "stroke-dashoffset": s.len,
  }, svg));

  /* etiqueta de la referencia, girada sobre el tramo */
  {
    const mx = (ref.a.x + ref.b.x) / 2;
    const my = (ref.a.y + ref.b.y) / 2;
    const deg = (Math.atan2(ref.b.y - ref.a.y, ref.b.x - ref.a.x) * 180) / Math.PI;
    const g = E("g", { transform: `translate(${mx} ${my}) rotate(${deg})` }, svg);
    const label = `REF · ${fmt(REF.tRefMs / 1000, 2)} s`;
    E("text", {
      class: "ref-text",
      x: 0, y: -15,
      "text-anchor": "middle",
      "paint-order": "stroke",
      stroke: "#050810",
      "stroke-width": 4,
      "stroke-linejoin": "round",
    }, g).textContent = label;
  }

  const nodeEls = NODES.map((n, j) => {
    const g = E("g", {}, svg);
    const pulse = E("circle", {
      class: "node-pulse",
      cx: n.x, cy: n.y, r: 8,
      stroke: n.color,
    }, g);
    const halo = E("circle", {
      class: "node-glow",
      cx: n.x, cy: n.y, r: n.glowR,
      fill: n.color, opacity: 0.12,
    }, g);
    const core = E("circle", {
      class: "node-core",
      cx: n.x, cy: n.y, r: n.coreR,
      fill: n.color, opacity: 0.38,
    }, g);
    return { g, pulse, halo, core, base: n.coreR, center: j === 0 };
  });

  const head = E("g", { class: "draw-head", visibility: "hidden" }, svg);
  const headHalo = E("circle", { r: 13, fill: META.accent, opacity: 0.3 }, head);
  const headCore = E("circle", { r: 3.4, fill: "#ffffff" }, head);

  /* ── gráfico distancia–tiempo ─────────────────────────────────────── */
  const CW = 340, CH = 150, ML = 26, MR = 8, MT = 10, MB = 20;
  const MAX_T = Math.max(...[1, 2, 3].map((k) => REF.timing[k].total));
  const chart = $("chart-svg");
  chart.setAttribute("viewBox", `0 0 ${CW} ${CH}`);
  const xAt = (t) => ML + (t / MAX_T) * (CW - ML - MR);
  const yAt = (d) => CH - MB - (d / G.totalLen) * (CH - MT - MB);

  const cg = E("g", {}, chart);
  for (const f of [0, 0.5, 1]) {
    E("line", { class: "grid", x1: ML, y1: yAt(f * G.totalLen), x2: CW - MR, y2: yAt(f * G.totalLen) }, cg);
  }
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    E("line", { class: "grid", x1: xAt(f * MAX_T), y1: MT, x2: xAt(f * MAX_T), y2: CH - MB, opacity: 0.5 }, cg);
  }
  E("line", { class: "axis", x1: ML, y1: CH - MB, x2: CW - MR, y2: CH - MB }, cg);
  E("line", { class: "axis", x1: ML, y1: MT, x2: ML, y2: CH - MB }, cg);
  E("text", { class: "tick", x: ML, y: CH - 7, "text-anchor": "middle" }, cg).textContent = "0";
  E("text", { class: "tick", x: CW - MR, y: CH - 7, "text-anchor": "end" }, cg).textContent = `${fmt(MAX_T / 1000, 1)} s`;
  E("text", { class: "tick", x: ML - 3, y: CH - MB + 2, "text-anchor": "end" }, cg).textContent = "0";
  E("text", { class: "tick", x: ML - 3, y: MT + 4, "text-anchor": "end" }, cg).textContent = `${fmt(G.totalLen / 1000, 1)}k`;

  const lawColors = { 1: "#00c9c0", 2: "#7ad7ff", 3: "#ff8a70" };
  const lawPaths = {};
  for (const k of [1, 2, 3]) {
    const tk = REF.timing[k];
    let d = `M ${xAt(0)} ${yAt(0)} L ${xAt(tk.starts[0])} ${yAt(0)}`;
    let cum = 0;
    for (let i = 0; i < SEGS.length; i++) {
      const len = SEGS[i].len;
      const start = tk.starts[i];
      const dur = tk.durations[i];
      if (k === 3) {
        for (let s = 1; s <= 6; s++) {
          const u = s / 6;
          d += ` L ${xAt(start + dur * u)} ${yAt(cum + len * u * u)}`;
        }
      } else {
        d += ` L ${xAt(tk.ends[i])} ${yAt(cum + len)}`;
      }
      cum += len;
    }
    const path = E("path", {
      class: `law ${k === CRITERION ? "is-active" : "is-ghost"}`,
      d,
      stroke: lawColors[k],
    }, cg);
    lawPaths[k] = path;
  }
  const chartV = E("line", { class: "chart-vline", x1: 0, y1: MT, x2: 0, y2: CH - MB }, cg);
  const chartDot = E("circle", { class: "chart-dot", r: 3.1 }, cg);

  /* ── timeline de conexiones ───────────────────────────────────────── */
  const track = $("track");
  E("div", { class: "lead", style: `width:${(LEAD / TOTAL) * 100}%` }, track);
  const blocks = SEGS.map((s, i) => {
    const b = document.createElement("div");
    b.className = "block" + (s.isC ? " isC" : "");
    b.style.left = `${(STARTS[i] / TOTAL) * 100}%`;
    b.style.width = `${(DUR[i] / TOTAL) * 100}%`;
    b.style.background = s.color;
    b.title = `Conexión ${pad(i + 1)} · ${fmt(s.len, 1)} px · ${fmt(DUR[i] / 1000, 3)} s`;
    track.appendChild(b);
    return b;
  });
  ENDS.forEach((end, i) => {
    E("div", { class: "tick", style: `left:${(end / TOTAL) * 100}%` }, track);
  });
  const playhead = E("div", { class: "playhead" }, track);

  /* ── tabla de detalle ─────────────────────────────────────────────── */
  const tbody = $("link-rows");
  const rows = SEGS.map((s, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${pad(i + 1)}${i === REF_I ? '<span class="ref">REF</span>' : ""}</td>` +
      `<td>${i + 1}→${i + 2}</td>` +
      `<td>${fmt(s.len, 1)}</td>` +
      `<td>${fmt(DUR[i] / 1000, 3)}</td>` +
      `<td>${fmt(s.len / (DUR[i] / 1000), 1)}</td>`;
    tbody.appendChild(tr);
    return tr;
  });
  $("table-count").textContent = `${SEGS.length} conexiones · v media = L / t`;

  /* ── métricas estáticas ───────────────────────────────────────────── */
  const dursMin = Math.min(...DUR);
  const dursMax = Math.max(...DUR);
  const vMean = SEGS.map((s, i) => s.len / (DUR[i] / 1000));
  $("stat-total").innerHTML = `${fmt(T.connectTotal / 1000, 2)}<small>s</small>`;
  $("stat-link").innerHTML =
    dursMin === dursMax
      ? `${fmt(dursMin / 1000, 3)}<small>s</small>`
      : `${fmt(dursMin / 1000, 3)}–${fmt(dursMax / 1000, 3)}<small>s</small>`;
  const ratio = Math.max(...SEGS.map((s) => s.len)) / Math.min(...SEGS.map((s) => s.len));
  if (CRITERION === 1) {
    $("stat-speed").innerHTML = `${fmtInt(Math.min(...vMean))}–${fmtInt(Math.max(...vMean))}<small>px/s</small>`;
    $("stat-extra").innerHTML = `${fmt(ratio, 1)}<small>× de rango</small>`;
  } else if (CRITERION === 2) {
    $("stat-speed").innerHTML = `${fmtInt(REF.metrics[2].v)}<small>px/s</small>`;
    $("stat-extra").innerHTML = `${fmt(ratio, 1)}<small>× entre extremos</small>`;
  } else {
    $("stat-speed").innerHTML = `${fmtInt(REF.metrics[3].a)}<small>px/s²</small>`;
    $("stat-extra").innerHTML = `${fmtInt(REF.metrics[3].vTip)}<small>px/s al llegar</small>`;
  }
  $("stat-total-note").textContent = `+ ${fmt(LEAD / 1000, 2)} s de entrada`;
  $("ref-note").textContent = `REF = último tramo de la C · ${fmt(REF.tRefMs / 1000, 2)} s`;
  $("timeline-total").textContent = `${fmt(TOTAL / 1000, 2)} s`;
  track.setAttribute("aria-valuemax", (TOTAL / 1000).toFixed(2));

  /* ── render ───────────────────────────────────────────────────────── */
  function cumulativeAt(t) {
    if (t <= LEAD) return 0;
    let cum = 0;
    for (let i = 0; i < SEGS.length; i++) {
      if (t >= ENDS[i]) {
        cum += SEGS[i].len;
      } else if (t > STARTS[i]) {
        const u = (t - STARTS[i]) / DUR[i];
        const p = CRITERION === 3 ? u * u : u;
        cum += SEGS[i].len * p;
        break;
      } else break;
    }
    return cum;
  }

  function setStatus() {
    const phase = $("phase");
    const segLabel = $("seg-label");
    const now = $("timeline-now");
    const status = $("timeline-status");
    const t = Math.min(clock, TOTAL);
    now.innerHTML = `t <b>${fmt(t / 1000, 2)}</b> s / ${fmt(TOTAL / 1000, 2)} s`;
    track.setAttribute("aria-valuenow", (t / 1000).toFixed(2));
    track.setAttribute("aria-valuetext", `${fmt(t / 1000, 2)} de ${fmt(TOTAL / 1000, 2)} segundos`);

    if (clock < LEAD) {
      phase.textContent = "Entrada";
      segLabel.textContent = `constelación · ${fmt(REF.tRefMs / 1000, 2)} s`;
      status.textContent = "Constelación de entrada";
    } else if (active >= 0) {
      phase.textContent = "Trazando";
      segLabel.textContent = `${pad(active + 1)}/${SEGS.length} · ${fmt(SEGS[active].len, 1)} px · ${fmt(DUR[active] / 1000, 3)} s`;
      status.textContent = `Conexión ${pad(active + 1)}/${SEGS.length} · ${fmt(SEGS[active].len, 1)} px · ${fmt(DUR[active] / 1000, 3)} s`;
    } else {
      phase.textContent = "Completo";
      segLabel.textContent = `${SEGS.length}/${SEGS.length} · ${fmt(G.totalLen, 0)} px`;
      status.textContent = `Recorrido completo · ${fmt(T.connectTotal / 1000, 2)} s de conexiones`;
    }
  }

  function render() {
    active = -1;
    let activeP = 0;

    for (let i = 0; i < SEGS.length; i++) {
      let offset = SEGS[i].len;
      if (clock >= ENDS[i]) {
        offset = 0;
      } else if (clock >= STARTS[i]) {
        const u = (clock - STARTS[i]) / DUR[i];
        activeP = CRITERION === 3 ? u * u : u;
        offset = SEGS[i].len * (1 - activeP);
        active = i;
      }
      lines[i].setAttribute("stroke-dashoffset", offset);
    }

    /* nodos: flash de llegada + titileo tenue de los que faltan */
    for (let j = 0; j < NODES.length; j++) {
      const arrival = j === 0 ? 0 : ENDS[j - 1];
      const el = nodeEls[j];
      const dt = clock - arrival;
      if (dt >= 0) {
        const flash = Math.exp(-dt / 190);
        const pulse = Math.exp(-dt / 330);
        el.core.setAttribute("r", (el.base * (1 + 0.5 * flash)).toFixed(2));
        el.core.setAttribute("opacity", (0.82 + 0.18 * flash).toFixed(3));
        el.halo.setAttribute("opacity", (0.16 + 0.2 * flash).toFixed(3));
        if (j > 0) {
          el.pulse.setAttribute("r", (8 + 34 * (1 - pulse)).toFixed(2));
          el.pulse.setAttribute("opacity", (0.55 * pulse).toFixed(3));
        }
      } else {
        const tw = 0.3 + 0.08 * Math.sin((clock + j * 420) / 620);
        el.core.setAttribute("r", el.base.toFixed(2));
        el.core.setAttribute("opacity", tw.toFixed(3));
        el.halo.setAttribute("opacity", 0.08);
        el.pulse.setAttribute("opacity", 0);
      }
    }

    /* estela del trazo */
    if (active >= 0) {
      const seg = SEGS[active];
      const x = seg.a.x + (seg.b.x - seg.a.x) * activeP;
      const y = seg.a.y + (seg.b.y - seg.a.y) * activeP;
      head.setAttribute("visibility", "visible");
      head.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      headHalo.setAttribute("fill", seg.color);
      headCore.setAttribute("fill", seg.color === "#c9a84c" ? "#fffbe6" : "#ffffff");
    } else {
      head.setAttribute("visibility", "hidden");
    }

    /* timeline */
    const pct = clamp((Math.min(clock, TOTAL) / TOTAL) * 100, 0, 100);
    playhead.style.left = `${pct}%`;
    blocks.forEach((b, i) => {
      b.classList.toggle("is-done", clock >= ENDS[i]);
      b.classList.toggle("is-active", i === active);
    });

    /* gráfico */
    const cum = cumulativeAt(Math.min(clock, TOTAL));
    const x = xAt(Math.min(clock, TOTAL));
    const y = yAt(cum);
    chartDot.setAttribute("cx", x.toFixed(2));
    chartDot.setAttribute("cy", y.toFixed(2));
    chartV.setAttribute("x1", x.toFixed(2));
    chartV.setAttribute("x2", x.toFixed(2));

    /* tabla */
    if (active !== lastActiveRow) {
      rows.forEach((r, i) => r.classList.toggle("is-active", i === active));
      if (active >= 0 && $("details").open) {
        rows[active].scrollIntoView({ block: "nearest" });
      }
      lastActiveRow = active;
    }
    rows.forEach((r, i) => r.classList.toggle("is-done", clock >= ENDS[i]));

    setStatus();
  }

  /* ── reloj ────────────────────────────────────────────────────────── */
  function tick(now) {
    const dt = Math.min(now - lastFrame, 100);
    lastFrame = now;
    if (playing && !reduced) {
      clock += dt * rate;
      if (clock >= TOTAL + HOLD) {
        if (loop) {
          clock = 0;
        } else {
          clock = TOTAL;
          playing = false;
          syncPlay();
        }
      }
    }
    render();
    requestAnimationFrame(tick);
  }

  /* ── controles ────────────────────────────────────────────────────── */
  const playBtn = $("play");
  function syncPlay() {
    playBtn.textContent = playing ? "❚❚ Pausa" : "▶ Reproducir";
    playBtn.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
  }
  playBtn.addEventListener("click", () => {
    if (!playing && clock >= TOTAL) clock = 0;
    playing = !playing;
    lastFrame = performance.now();
    syncPlay();
  });
  $("replay").addEventListener("click", () => {
    clock = 0;
    playing = true;
    lastFrame = performance.now();
    syncPlay();
    render();
  });
  document.querySelectorAll("[data-rate]").forEach((b) => {
    b.addEventListener("click", () => {
      rate = Number(b.dataset.rate);
      document.querySelectorAll("[data-rate]").forEach((x) => {
        x.setAttribute("aria-pressed", String(x === b));
      });
    });
  });
  $("loop").addEventListener("change", (e) => { loop = e.target.checked; });
  $("structure").addEventListener("change", (e) => {
    document.body.classList.toggle("structure", e.target.checked);
  });

  /* scrub: click y arrastre sobre el track */
  function seekFromEvent(e) {
    const r = track.getBoundingClientRect();
    const x = clamp(e.clientX - r.left, 0, r.width);
    clock = (x / r.width) * TOTAL;
    lastFrame = performance.now();
    render();
  }
  let dragging = false;
  track.addEventListener("pointerdown", (e) => {
    dragging = true;
    playing = false;
    syncPlay();
    track.setPointerCapture(e.pointerId);
    seekFromEvent(e);
  });
  track.addEventListener("pointermove", (e) => { if (dragging) seekFromEvent(e); });
  const endDrag = () => { dragging = false; };
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  /* teclado */
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (["input", "textarea", "select", "button", "a", "summary"].includes(tag)) return;
    if (e.code === "Space") {
      e.preventDefault();
      if (!playing && clock >= TOTAL) clock = 0;
      playing = !playing;
      lastFrame = performance.now();
      syncPlay();
    } else if (e.key === "r" || e.key === "R") {
      clock = 0;
      playing = true;
      lastFrame = performance.now();
      syncPlay();
    } else if (e.key === "ArrowRight") {
      clock = clamp(clock + 500, 0, TOTAL);
      playing = false;
      syncPlay();
      render();
    } else if (e.key === "ArrowLeft") {
      clock = clamp(clock - 500, 0, TOTAL);
      playing = false;
      syncPlay();
      render();
    }
  });

  /* ── arranque ─────────────────────────────────────────────────────── */
  const structureBox = $("structure");
  document.body.classList.toggle("structure", structureBox.checked);
  syncPlay();
  render();
  lastFrame = performance.now();
  if (!reduced) requestAnimationFrame(tick);
})();
