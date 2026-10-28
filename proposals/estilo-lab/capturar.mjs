#!/usr/bin/env node
/**
 * capturar.mjs — evidencia del prototipo A/B del issue #89.
 *
 * Levanta un servidor estático con tres montajes y captura, con Chrome headless
 * por CDP, el sitio actual (`dist/`, el build real) y el prototipo
 * (`proposals/estilo-lab/`):
 *
 *   /            → dist/            (sitio actual, build de `npm run build`)
 *   /lab/        → proposals/estilo-lab/
 *   /laboratorio/→ proposals/logo-timing/
 *
 * Salida:
 *   capturas/actual-hero-{desktop,mobile}.png
 *   capturas/lab-hero-{desktop,mobile}.png
 *   capturas/actual-sala01-{desktop,mobile}.png
 *   capturas/lab-sala01-{desktop,mobile}.png
 *   capturas/mediciones.json     (peso, requests, fuentes, timings)
 *
 * Sin dependencias: Chrome directo (mismo criterio que tools/logo/chrome.mjs,
 * que no sirve acá porque sólo acepta `file://` y no permite emular viewport).
 *
 * Uso:  node proposals/estilo-lab/capturar.mjs [--only=hero|sala01]
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { createReadStream, existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(HERE, "../..");
const OUT = join(HERE, "capturas");

const CHROME =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

/* ── servidor estático con montajes ─────────────────────────────────── */
const mounts = [
  ["/laboratorio/", join(ROOT, "proposals/logo-timing")],
  ["/lab/", join(HERE)],
  ["/", join(ROOT, "dist")],
];

function resolvePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  for (const [prefix, dir] of mounts) {
    if (!clean.startsWith(prefix)) continue;
    let rel = clean.slice(prefix.length);
    if (rel === "" || rel.endsWith("/")) rel += "index.html";
    const abs = resolve(dir, rel);
    if (!abs.startsWith(resolve(dir))) return null; // fuera del montaje
    return abs;
  }
  return null;
}

const server = createServer(async (req, res) => {
  const abs = resolvePath(req.url || "/");
  if (!abs || !existsSync(abs) || !(await stat(abs)).isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("404");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(abs)] || "application/octet-stream" });
  createReadStream(abs).pipe(res);
});

const freePort = () =>
  new Promise((res, rej) => {
    const s = createNetServer();
    s.on("error", rej);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdp(port) {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* todavía no levantó */ }
    await sleep(100);
  }
  throw new Error("CDP no responde");
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", () => rej(new Error("CDP: websocket")), { once: true });
  });
  let id = 0;
  const pending = new Map();
  /* Network: los recursos cross-origin (Google Fonts) llegan con
   * transferSize=0 en Resource Timing (sin Timing-Allow-Origin), así que el
   * peso real sólo se mide por eventos de red — encodedDataLength sí lo trae. */
  const reqs = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === "Network.requestWillBeSent") {
      reqs.set(msg.params.requestId, { url: msg.params.request.url, tipo: msg.params.type, bytes: 0 });
      return;
    }
    if (msg.method === "Network.loadingFinished") {
      const r = reqs.get(msg.params.requestId);
      if (r) r.bytes = msg.params.encodedDataLength;
      return;
    }
    const slot = pending.get(msg.id);
    if (!slot) return;
    pending.delete(msg.id);
    msg.error ? slot.rej(new Error(`CDP ${msg.error.message}`)) : slot.res(msg.result);
  });
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const myId = ++id;
      const timer = setTimeout(() => {
        pending.delete(myId);
        rej(new Error(`CDP ${method}: timeout`));
      }, 45_000);
      pending.set(myId, {
        res: (v) => { clearTimeout(timer); res(v); },
        rej: (e) => { clearTimeout(timer); rej(e); },
      });
      ws.send(JSON.stringify({ id: myId, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  /* Cada corrida se mide en frío: sin esto la segunda pasada (móvil) lee del
   * caché del browser y reporta 0 bytes de fuentes, incomparable. */
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  /* El audio ambiente se descarga bajo demanda (al ocupar el hero ≥50% del
   * viewport) y su carga NO es determinista entre corridas: una medía 476 KB y
   * otra 0. Se bloquea para que el peso de la portada sea comparable y se
   * reporta aparte en `audioAmbiente` (F4 del pase del PR #92). */
  await send("Network.setBlockedURLs", { urls: ["*audio*"] });

  const evaluate = async (expression) => {
    const out = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (out.exceptionDetails) {
      throw new Error(`evaluate: ${out.exceptionDetails.exception?.description ?? out.exceptionDetails.text}`);
    }
    return out.result.value;
  };

  /* La portada tiene una intro de ~16 s (frases + vuelo del nombre). Para
   * fotografiar el estado ASENTADO sin esperarla se emula
   * prefers-reduced-motion: el sitio oculta el loader a los 300 ms y omite la
   * intro (src/main.ts + src/cv/intro.ts). No cambia HTML, CSS ni assets. */
  const reduceMotion = (on) =>
    send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: on ? "reduce" : "no-preference" }],
    });

  const viewport = (width, height, mobile) =>
    send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
      screenWidth: width,
      screenHeight: height,
    });

  const goto = async (url) => {
    await send("Page.navigate", { url });
    for (let i = 0; i < 200; i++) {
      const ready = await evaluate("document.readyState");
      if (ready === "complete") return;
      await sleep(100);
    }
    throw new Error(`no cargó: ${url}`);
  };

  const shot = async (file) => {
    const { data } = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    await writeFile(join(OUT, file), Buffer.from(data, "base64"));
    return file;
  };

  const netReset = () => reqs.clear();
  const network = () => {
    const list = [...reqs.values()];
    const sum = (xs) => xs.reduce((a, e) => a + e.bytes, 0);
    const host = (u) => { try { return new URL(u).host; } catch { return ""; } };
    return {
      requests: list.length,
      bytes: sum(list),
      porTipo: list.reduce((acc, r) => {
        acc[r.tipo] = (acc[r.tipo] || 0) + r.bytes;
        return acc;
      }, {}),
      fuentes: list.filter((r) => r.tipo === "Font").map((r) => ({ host: host(r.url), bytes: r.bytes })),
      hosts: [...new Set(list.map((r) => host(r.url)))],
      mayores: list.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 6)
        .map((r) => ({ url: r.url.replace(/^https?:\/\/[^/]+/, ""), bytes: r.bytes })),
    };
  };

  return { send, evaluate, reduceMotion, viewport, goto, shot, netReset, network, close: () => ws.close() };
}

/* ── mediciones ───────────────────────────────────────────────────────
 *
 * Regla de oro de este bloque: UNA fuente por métrica.
 *   · bytes / requests / fuentes  → `red` (eventos Network de CDP). Resource
 *     Timing NO sirve para bytes: los recursos cross-origin llegan con
 *     transferSize=0 sin Timing-Allow-Origin, y por eso Google Fonts pesaba "0".
 *   · tiempos                     → `nav` (PerformanceNavigationTiming).
 *   · tamaño del DOM              → `dom`.
 * Cualquier campo de peso calculado con Resource Timing se eliminó: dos
 * fuentes para el mismo número es cómo un consumidor termina leyendo "0 fuentes"
 * con 5 woff2 descargados (F3 del pase fresco del PR #92).
 */
const NAV = `(() => {
  const nav = performance.getEntriesByType('navigation')[0] || {};
  return {
    domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd || 0),
    loadEventMs: Math.round(nav.loadEventEnd || 0),
    nodes: document.getElementsByTagName('*').length,
  };
})()`;


/* Sonda de DOM: la captura es un PNG opaco para el revisor; esto deja escrito
 * QUÉ se estaba viendo cuando se tomó (elemento visible, tamaño, color, fuentes). */
const PROBE = `(() => {
  const one = (sel) => document.querySelector(sel);
  const all = (sel) => document.querySelectorAll(sel).length;
  const box = (sel) => {
    const e = one(sel);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
             opacity: cs.opacity, display: cs.display, color: cs.color, font: cs.fontFamily.slice(0, 48) };
  };
  return {
    title: document.title,
    loaderOculto: !one('#loader') || one('#loader').classList.contains('hidden'),
    heroName: box('.hero-name') || box('#hero-name'),
    heroLabel: box('.hero-label') || box('.eyebrow'),
    canvas: (() => {
      const c = one('#hero-canvas');
      if (!(c instanceof HTMLCanvasElement) || !c.width) return null;
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let a = 0;
      for (let i = 3; i < d.length; i += 4 * 97) a += d[i];
      return { w: c.width, h: c.height, cssW: c.offsetWidth, cssH: c.offsetHeight, alfaMedio: Math.round(a / (d.length / (4 * 97))) };
    })(),
    navItems: all('#nav > *') || all('.hud-nav > *'),
    tarjetas: all('.project-card') || all('.card'),
    fuentes: document.fonts ? { status: document.fonts.status, cargadas: document.fonts.size,
      playfair: document.fonts.check('16px "Playfair Display"'),
      fira: document.fonts.check('16px "Fira Code"'),
      cormorant: document.fonts.check('16px "Cormorant Garamond"') } : null,
    externas: performance.getEntriesByType('resource').filter((e) => /^https?:..(fonts\.|christianluciani)/.test(e.name) === false && /^https?:/.test(e.name)).map((e) => e.name.split('/')[2]).filter((v, i, a) => a.indexOf(v) === i),
    canvases: [...document.querySelectorAll('canvas')].slice(0, 12).map((c) => ({ id: c.id || c.className, w: c.width, h: c.height, cssW: c.offsetWidth, cssH: c.offsetHeight })),
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    imgsRotos: [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.getAttribute('src')),
    scrollY: Math.round(window.scrollY),
    viewport: window.innerWidth + 'x' + window.innerHeight
  };
})()`;

const waitLoaderGone = `(async () => {
  const t0 = performance.now();
  while (performance.now() - t0 < 6000) {
    const l = document.getElementById('loader');
    if (!l || l.classList.contains('hidden')) return Math.round(performance.now() - t0);
    await new Promise((r) => setTimeout(r, 100));
  }
  return -1;
})()`;

/* ── modo tabla ────────────────────────────────────────────────────────
 * La tabla de §5 de la NOTA sale de mediciones.json, no de copiar números a
 * mano: `--tabla` la imprime para pegarla, y así no hay dos verdades (F1/F4
 * del pase del PR #92). */
async function tabla() {
  const doc = JSON.parse(await readFile(join(OUT, "mediciones.json"), "utf8"));
  const c = doc.capturas;
  const keys = [
    ["Documento", "Document"],
    ["CSS", "Stylesheet"],
    ["JS", "Script"],
    ["Imágenes", "Image"],
    ["Fuentes web", "Font"],
    ["Otros", "Other"],
  ];
  const cols = ["actual-hero-desktop", "actual-hero-mobile", "lab-hero-desktop", "lab-hero-mobile"];
  /* Agrupación manual: es-ES no agrupa números de 4 dígitos (minGroupingDigits=2)
   * y la tabla quedaba con 133.913 al lado de 9853. */
  const n = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const b = (k, t) => n(c[k]?.red.porTipo[t] ?? 0);
  console.log("| Componente (bytes) | Actual desktop | Actual móvil | Prototipo desktop | Prototipo móvil |");
  console.log("|---|---|---|---|---|");
  for (const [label, type] of keys) {
    console.log(`| ${label} | ${cols.map((k) => b(k, type)).join(" | ")} |`);
  }
  console.log(`| **Total** | ${cols.map((k) => n(c[k].red.bytes)).join(" | ")} |`);
  console.log(`| En kB | ${cols.map((k) => (c[k].red.bytes / 1000).toFixed(1).replace(".", ",")).join(" | ")} |`);
  console.log(`| Requests | ${cols.map((k) => c[k].red.requests).join(" | ")} |`);
  console.log(`| Nodos DOM | ${cols.map((k) => c[k].dom.nodes).join(" | ")} |`);
  console.log(`| DCL / load (ms) | ${cols.map((k) => `${c[k].nav.domContentLoadedMs} / ${c[k].nav.loadEventMs}`).join(" | ")} |`);
  console.log(`\nAudio ambiente (fuera de la tabla): ${n(doc.audioAmbiente.bytes)} B — ${doc.audioAmbiente.nota}`);
  console.log(`Total con audio (desktop): ${n(c["actual-hero-desktop"].red.bytes + doc.audioAmbiente.bytes)} B`);
}

async function main() {
  if (process.argv.includes("--tabla")) return tabla();
  const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
  if (!existsSync(join(ROOT, "dist", "index.html"))) {
    throw new Error("falta dist/ — corré `npm run build` antes de capturar");
  }
  await mkdir(OUT, { recursive: true });

  const port = await freePort();
  await new Promise((res) => server.listen(port, "127.0.0.1", res));
  const base = `http://127.0.0.1:${port}`;

  const profile = mkdtempSync(join(tmpdir(), "estilo-lab-"));
  const cdpPort = await freePort();
  const chrome = spawn(CHROME, [
    "--headless",
    // El sandbox de Chrome no arranca bajo el sandbox de archivos de la sesión
    // (crashpad no puede escribir en ~/Library): --no-sandbox es la única vía
    // verificada en esta máquina, igual que en el runner de linux (chrome.mjs).
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--no-first-run",
    "--force-device-scale-factor=1",
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${cdpPort}`,
    "about:blank",
  ], { stdio: ["ignore", "ignore", "ignore"] });

  const cleanup = () => {
    try { chrome.kill("SIGKILL"); } catch { /* ya murió */ }
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); } catch { /* tmp */ }
    server.close();
  };

  const mediciones = {};
  const verificacion = {};
  let page;
  try {
    page = await connect(await cdp(cdpPort));

    const VIEWPORTS = {
      desktop: { width: 1440, height: 900, mobile: false },
      mobile: { width: 390, height: 844, mobile: true },
    };

    const CASES = [
      { key: "actual-hero", url: "/", anchor: null, site: "actual", mide: true },
      /* Hallazgo lateral (no se corrige en el repo): `#hero-canvas` es un
       * elemento reemplazado con `inset:0` y `width:auto` ⇒ se queda en su
       * tamaño intrínseco 300×150 en la esquina; el hallazgo viaja en la NOTA.
       * Esta captura corrige SOLO en el navegador de captura (style tag
       * inyectado) para que el A/B no compare contra una portada rota. */
      { key: "actual-hero-canvasfull", url: "/", anchor: null, site: "actual", fixCanvas: true },
      { key: "lab-hero", url: "/lab/", anchor: null, site: "lab", mide: true },
      { key: "actual-sala01", url: "/", anchor: "#room-proyectos", site: "actual" },
      { key: "actual-sala01-canvasfull", url: "/", anchor: "#room-proyectos", site: "actual", fixCanvas: true },
      { key: "lab-sala01", url: "/lab/", anchor: "#sala-01", site: "lab" },
      /* La página de comparación también se captura: es el entregable que el
       * operador mira primero. */
      { key: "comparar", url: "/lab/comparar.html", anchor: null, site: "lab" },
    ];

    for (const vp of ["desktop", "mobile"]) {
      await page.viewport(VIEWPORTS[vp].width, VIEWPORTS[vp].height, VIEWPORTS[vp].mobile);
      for (const c of CASES) {
        if (only && !c.key.includes(only)) continue;
        await page.reduceMotion(c.site === "actual");
        await page.netReset();
        await page.goto(base + c.url);

        await page.evaluate("document.fonts ? document.fonts.ready.then(() => true) : true");

        if (c.site === "actual") {
          const waited = await page.evaluate(waitLoaderGone);
          if (waited < 0) console.warn(`  ! ${c.key}/${vp}: el loader no se ocultó en 6s`);
        }
        /* El sitio escalona la entrada del hero con animaciones de 1,4–2,4 s
         * (hero-label, hero-name, tagline, scroll). Fotografiar antes deja el
         * hero vacío: el estado asentado necesita >2,5 s. */
        await sleep(c.anchor ? 400 : 2800);

        if (c.fixCanvas) {
          await page.evaluate(
            `(() => { const s = document.createElement('style'); s.id = 'fix-canvas-captura'; s.textContent = '#hero-canvas,.room-canvas{width:100%;height:100%}'; document.head.appendChild(s); window.dispatchEvent(new Event('resize')); return true; })()`,
          );
          await sleep(700);
        }

        if (c.anchor) {
          await page.evaluate(
            `document.querySelector(${JSON.stringify(c.anchor)}).scrollIntoView({ block: 'start' });`,
          );
          await sleep(1400); // data-scroll: 0.9s + delays
        }

        await page.shot(`${c.key}-${vp}.png`);
        verificacion[`${c.key}-${vp}`] = await page.evaluate(PROBE);
        console.log(`  ✓ ${c.key}-${vp}.png`);

        if (c.mide && !mediciones[`${c.key}-${vp}`]) {
          const nav = await page.evaluate(NAV);
          mediciones[`${c.key}-${vp}`] = {
            url: c.url,
            viewport: `${VIEWPORTS[vp].width}x${VIEWPORTS[vp].height}`,
            red: page.network(),
            nav: { domContentLoadedMs: nav.domContentLoadedMs, loadEventMs: nav.loadEventMs },
            dom: { nodes: nav.nodes },
          };
        }
      }
    }

    // Tamaños en disco de los artefactos de cada versión (evidencia estable,
    // independiente del caché del browser).
    const size = async (p) => (existsSync(p) ? (await stat(p)).size : null);
    const archivos = {
      "actual-html-index": await size(join(ROOT, "dist/index.html")),
      "actual-js-bundle": (await readFile(join(ROOT, "dist/index.html"), "utf8"))
        .match(/assets\/index-[^"]+\.js/)?.[0] ?? null,
      "prototipo-html": await size(join(HERE, "index.html")),
      "prototipo-css": await size(join(HERE, "estilo.css")),
      "audio-ambiente": await size(join(ROOT, "public/audio/whale-song.mp3")),
    };

    const doc = {
      schema: {
        generado_por: "proposals/estilo-lab/capturar.mjs",
        unidades: "bytes (1 kB = 1000 B)",
        bloques: {
          capturas: {
            red: "eventos Network de CDP — ÚNICA fuente de peso, requests y fuentes; incluye cross-origin, caché deshabilitado, audio bloqueado",
            nav: "PerformanceNavigationTiming de la página (ms, local, sin throttling)",
            dom: "cantidad de nodos del documento",
          },
          audioAmbiente: "peso del audio ambiente (bloqueado en las mediciones porque su carga es bajo demanda y no determinista)",
          archivos: "tamaño en disco de los artefactos (no es red)",
          verificacion: "sonda de DOM por captura: qué elemento estaba visible al fotografiar",
        },
      },
      audioAmbiente: {
        archivo: "public/audio/whale-song.mp3",
        bytes: archivos["audio-ambiente"],
        nota: "Se descarga cuando el hero ocupa ≥50% del viewport; bloqueado en las mediciones con Network.setBlockedURLs(['*audio*']).",
      },
      capturas: mediciones,
      archivos,
      verificacion,
    };

    await writeFile(join(OUT, "mediciones.json"), JSON.stringify(doc, null, 2) + "\n");
    console.log("  ✓ capturas/mediciones.json");
  } finally {
    page?.close?.();
    cleanup();
  }
}

main().catch((err) => {
  console.error(`\nERROR: ${err.message}`);
  process.exit(1);
});
