#!/usr/bin/env node
/**
 * medir.mjs — verificación runtime del tema Laboratorio (issue #89) sobre dist/.
 *
 * Mide con Chrome headless + CDP, sirviendo `dist/` desde un server estático
 * propio (sin dependencias): requests (incluidos cross-origin), tipografía
 * computada, tamaño de canvas vs contenedor, overflow horizontal, estado del HUD
 * (`aria-current`), contraste de textos chicos y capturas a 1440×900 y 390×844.
 *
 * Uso: node proposals/lab-theme/medir.mjs
 * Requiere `npm run build` previo. CHROME_PATH override opcional.
 * `prefers-reduced-motion: reduce` se emula para capturar el estado asentado.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const ROOT = resolve(process.cwd());
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "proposals/lab-theme/capturas");
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".map": "application/json"
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Server estático mínimo sobre dist/ (SPA fallback a index.html). */
function serveDist() {
  const server = createServer((req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let file = join(DIST, pathname);
      if (statSync(file, { throwIfNoEntry: false })?.isDirectory()) file = join(file, "index.html");
      if (!statSync(file, { throwIfNoEntry: false })?.isFile()) file = join(DIST, "index.html");
      const body = readFileSync(file);
      res.writeHead(200, {
        "content-type": MIME[extname(file)] || "application/octet-stream",
        "cache-control": "no-store"
      });
      res.end(body);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok({ server, port: server.address().port })));
}

async function json(url, tries = 80) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch { /* todavía no levantó */ }
    await sleep(100);
  }
  throw new Error(`CDP no responde en ${url}`);
}

async function connect(url) {
  const profile = mkdtempSync(join(tmpdir(), "lab-theme-cdp-"));
  const port = 9333 + Math.floor(Math.random() * 400);
  const child = spawn(
    CHROME,
    [
      "--headless",
      "--disable-gpu",
      "--no-first-run",
      "--hide-scrollbars",
      "--no-sandbox",
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${port}`,
      "--window-size=1440,900",
      "about:blank"
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  const closeChrome = () => {
    try { child.kill("SIGKILL"); } catch { /* ya murió */ }
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); } catch { /* tmp */ }
  };
  try {
    await json(`http://127.0.0.1:${port}/json/version`);
    const targets = await json(`http://127.0.0.1:${port}/json/list`);
    const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    if (!page) throw new Error("CDP: no hay target de página");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", () => rej(new Error("CDP: websocket")), { once: true });
    });
    let id = 0;
    const pending = new Map();
    const requests = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === "Network.requestWillBeSent") requests.push(msg.params.request.url);
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
        }, 30000);
        pending.set(myId, {
          res: (v) => { clearTimeout(timer); res(v); },
          rej: (e) => { clearTimeout(timer); rej(e); }
        });
        ws.send(JSON.stringify({ id: myId, method, params }));
      });
    const evaluate = async (expression) => {
      const out = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (out.exceptionDetails) throw new Error(out.exceptionDetails.exception?.description || out.exceptionDetails.text);
      return out.result.value;
    };
    const capture = async (file) => {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      const { writeFileSync } = await import("node:fs");
      writeFileSync(file, Buffer.from(data, "base64"));
    };
    return { send, evaluate, capture, requests, close: () => { try { ws.close(); } catch { /* noop */ } closeChrome(); } };
  } catch (err) {
    closeChrome();
    throw err;
  }
}

const MEASURE_JS = `(() => {
  const parse = (c) => {
    const m = c && c.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(",").map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
  };
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const baseFor = (el) => el.closest(".room--alt") ? { r: 11, g: 17, b: 32, a: 1 } : { r: 5, g: 8, b: 16, a: 1 };
  const bgFor = (el) => {
    const layers = [];
    let n = el;
    while (n && n.nodeType === 1) {
      const bg = parse(getComputedStyle(n).backgroundColor);
      if (bg && bg.a > 0) layers.push(bg);
      n = n.parentElement;
    }
    let base = baseFor(el);
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const small = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("#print-cv,#loader,script,style") || el.closest("[aria-hidden='true']")) continue;
    const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (!direct) continue;
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") continue;
    if (parseFloat(st.fontSize) > 12.5) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const fg = parse(st.color);
    if (!fg || fg.a < 1) continue;
    small.push({ text: el.textContent.trim().replace(/\\s+/g, " ").slice(0, 42), cls: String(el.className || el.tagName), size: st.fontSize, color: st.color, ratio: +ratio(fg, bgFor(el)).toFixed(2) });
  }
  const bad = small.filter((x) => x.ratio < 4.5);
  const canvasCheck = (sel, boxSel) => {
    const c = document.querySelector(sel); const box = boxSel ? document.querySelector(boxSel) : c && c.parentElement;
    if (!c || !box) return null;
    return { sel, w: c.offsetWidth, h: c.offsetHeight, boxW: box.clientWidth, boxH: box.clientHeight, ok: c.offsetWidth === box.clientWidth && c.offsetHeight === box.clientHeight };
  };
  const rooms = [...document.querySelectorAll(".room-canvas")].map((c) => ({ id: c.id, w: c.offsetWidth, h: c.offsetHeight, boxW: c.parentElement.clientWidth, boxH: c.parentElement.clientHeight, ok: c.offsetWidth === c.parentElement.clientWidth && c.offsetHeight === c.parentElement.clientHeight }));
  const nav = document.querySelector("#nav");
  const navRect = nav && nav.getBoundingClientRect();
  const active = document.querySelector('.nav-dot[aria-current="true"]');
  const hudCurrent = document.getElementById("hud-current");
  return {
    fontFamily: getComputedStyle(document.body).fontFamily,
    webFonts: document.fonts ? document.fonts.size : null,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    heroCanvas: canvasCheck("#hero-canvas", "#hero"),
    roomCanvases: rooms,
    nav: nav ? { display: getComputedStyle(nav).display, height: navRect.height, visible: navRect.height > 0 } : null,
    navAriaLabel: nav && nav.getAttribute("aria-label"),
    activeElement: (() => { const a = document.activeElement; return a ? { tag: a.tagName, id: a.id || null, cls: String(a.className || "").slice(0, 40), tabindex: a.getAttribute("tabindex") } : null; })(),
    hash: location.hash,
    brandAriaLabel: (document.querySelector(".brand") || {}).getAttribute
      ? document.querySelector(".brand").getAttribute("aria-label")
      : null,
    navFocusables: [...document.querySelectorAll("#nav a")].map((a) => ({
      target: a.dataset.target,
      tabIndex: a.tabIndex,
      label: (a.querySelector(".nav-label") || {}).textContent || "",
      visible: !!(a.getClientRects().length && getComputedStyle(a).visibility !== "hidden") && a.getBoundingClientRect().width > 0
    })),
    hudCurrent: hudCurrent ? { display: getComputedStyle(hudCurrent).display, text: hudCurrent.textContent.trim() } : null,
    active: active ? { target: active.dataset.target, label: (active.querySelector(".nav-label") || {}).textContent || "" } : null,
    smallText: { checked: small.length, min: small.length ? Math.min(...small.map((x) => x.ratio)) : null, violations: bad, colors: [...new Set(small.map((x) => x.color))] },
    grid: (() => { const g = document.querySelector(".project-grid"); return g ? getComputedStyle(g).gridTemplateColumns : null; })(),
    contentWidth: (() => { const c = document.querySelector(".room-content"); return c ? c.getBoundingClientRect().width : null; })(),
    reducedMotion: {
      heroAnimationDuration: getComputedStyle(document.querySelector(".hero-name")).animationDuration,
      dataScrollOpacity: getComputedStyle(document.querySelector("[data-scroll]")).opacity
    },
    skipLink: !!document.querySelector(".skip-link"),
    hudHeight: (() => { const h = document.querySelector(".hud"); return h ? h.getBoundingClientRect().height : null; })(),
    hudLayout: (() => {
      const brand = document.querySelector(".brand");
      const logo = document.getElementById("brand-logo");
      const nav = document.querySelector("#nav");
      const b = brand && brand.getBoundingClientRect();
      const l = logo && logo.getBoundingClientRect();
      const overlap = !!(b && l && b.left < l.right && b.right > l.left && b.top < l.bottom && b.bottom > l.top);
      return {
        brandLeft: b && Math.round(b.left),
        logo: l && { left: Math.round(l.left), width: Math.round(l.width), minimized: logo.classList.contains("minimized") },
        overlap,
        navScroll: nav && { client: nav.clientWidth, scroll: nav.scrollWidth },
        navItems: document.querySelectorAll(".nav-dot").length
      };
    })(),
    overflowing: [...document.querySelectorAll("body *")].filter((el) => {
      if (el.closest("#print-cv,#loader,.hud-nav")) return false;
      const st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") return false;
      return el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0;
    }).slice(0, 10).map((el) => ({ tag: el.tagName, cls: String(el.className).slice(0, 40), scroll: el.scrollWidth, client: el.clientWidth })),
    viewport: { w: window.innerWidth, h: window.innerHeight }
  };
})()`;

/** Un paso de Tab real (CDP) + descriptor del elemento enfocado. */
async function tabWalk(cdp, steps = 16) {
  await cdp.evaluate("window.scrollTo(0, 0); if (document.activeElement) document.activeElement.blur();");
  const out = [];
  for (let i = 0; i < steps; i++) {
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await sleep(30);
    out.push(await cdp.evaluate(`(() => {
      const a = document.activeElement;
      if (!a) return null;
      return { tag: a.tagName, id: a.id || null, cls: String(a.className || "").slice(0, 30),
        text: (a.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 24),
        target: (a.dataset && a.dataset.target) || null };
    })()`));
  }
  return out;
}

const VIEWPORTS = [
  { w: 1440, h: 900, shot: true },
  { w: 1000, h: 800, shot: false },
  { w: 768, h: 1024, shot: false },
  { w: 390, h: 844, shot: true }
];

async function main() {
  if (!statSync(DIST, { throwIfNoEntry: false })?.isDirectory()) throw new Error("falta dist/ — corré npm run build");
  mkdirSync(OUT, { recursive: true });
  const { server, port } = await serveDist();
  const base = `http://127.0.0.1:${port}/`;
  const cdp = await connect(base);
  const results = { base, measuredAt: new Date().toISOString(), viewports: {}, fontRequests: [], allRequests: 0 };
  try {
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    for (const vp of VIEWPORTS) {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: false });
      cdp.requests.length = 0;
      await cdp.send("Page.navigate", { url: base });
      for (let i = 0; i < 100; i++) {
        const ready = await cdp.evaluate("document.readyState === 'complete'");
        if (ready) break;
        await sleep(100);
      }
      await sleep(1200);
      // Datos de red de la portada (incluye cross-origin: Network, no Resource Timing).
      const navReqs = [...cdp.requests];
      const top = await cdp.evaluate(MEASURE_JS);
      const tabs = await tabWalk(cdp, 16);
      if (vp.shot) await cdp.capture(join(OUT, `portada-${vp.w}x${vp.h}.png`));
      // Navegar a una sala concreta y verificar el HUD activo.
      // Click primario real del HUD: scroll + hash + foco en el heading (F3).
      await cdp.evaluate("document.querySelector('.nav-dot[data-target=\"room-proyectos\"]').click()");
      await sleep(900);
      const room = await cdp.evaluate(MEASURE_JS);
      let modifiedClick = null;
      if (vp.w === 1440) {
        modifiedClick = await cdp.evaluate(`(() => {
          const a = document.querySelector('.nav-dot[data-target="room-contacto"]');
          const href = a.getAttribute('href');
          a.removeAttribute('href'); // el default nativo no puede navegar: aísla el handler
          const before = { hash: location.hash, focus: document.activeElement && document.activeElement.className };
          a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true, button: 0 }));
          a.setAttribute('href', href);
          return { before, after: { hash: location.hash, focus: document.activeElement && document.activeElement.className } };
        })()`);
      }
      if (vp.shot) await cdp.capture(join(OUT, `sala-${vp.w}x${vp.h}.png`));
      let i18n = null;
      if (vp.w === 1440) {
        await cdp.evaluate("document.getElementById('btn-lang').click()");
        await sleep(400);
        i18n = await cdp.evaluate(`({
          lang: document.documentElement.lang,
          labels: [...document.querySelectorAll('.nav-label')].map((x) => x.textContent),
          current: (document.getElementById('hud-current') || {}).textContent,
          title: document.querySelector('#room-proyectos .room-title').textContent,
          navAriaLabel: document.querySelector('#nav').getAttribute('aria-label'),
          brandAriaLabel: document.querySelector('.brand').getAttribute('aria-label'),
          active: (document.querySelector('.nav-dot[aria-current=\"true\"]') || {}).dataset && document.querySelector('.nav-dot[aria-current=\"true\"]').dataset.target
        })`);
        await cdp.evaluate("document.getElementById('btn-lang').click()");
        await sleep(300);
      }
      const fontReqs = navReqs.filter((u) => /fonts\\.(googleapis|gstatic)\\.com/.test(u));
      results.fontRequests.push(...fontReqs);
      results.allRequests += navReqs.length;
      results.viewports[`${vp.w}x${vp.h}`] = { top, room, tabs, i18n, modifiedClick, requests: { total: navReqs.length, fonts: fontReqs } };
    }
  } finally {
    cdp.close();
    server.close();
  }
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(OUT, "mediciones.json"), JSON.stringify(results, null, 2) + "\n");
  const rows = Object.entries(results.viewports).map(([vp, r]) => {
    const t = r.top; const rm = r.room;
    return {
      viewport: vp,
      fontRequests: r.requests.fonts.length,
      fontFamily: t.fontFamily,
      overflow: `${t.scrollWidth}/${t.innerWidth}`,
      heroCanvas: t.heroCanvas && `${t.heroCanvas.w}x${t.heroCanvas.h} vs ${t.heroCanvas.boxW}x${t.heroCanvas.boxH}`,
      roomCanvasesOk: t.roomCanvases.every((c) => c.ok),
      canvasMismatch: t.roomCanvases.filter((c) => !c.ok).map((c) => `${c.id}:${c.w}x${c.h}/${c.boxW}x${c.boxH}`),
      navVisible: t.nav && t.nav.visible,
      navFocusables: `${t.navFocusables.filter((a) => a.visible && a.tabIndex >= 0).length}/${t.navFocusables.length}`,
      tabNavReached: new Set(r.tabs.filter((x) => x && x.target).map((x) => x.target)).size,
      navAria: t.navAriaLabel,
      hudCurrent: t.hudCurrent && `${t.hudCurrent.display} "${t.hudCurrent.text}"`,
      activeAfterNav: rm.active && `${rm.active.target} (${rm.active.label})`,
      focusAfterNav: rm.activeElement && `${rm.activeElement.tag}#${rm.activeElement.id || ""}.${rm.activeElement.cls}`,
      hashAfterNav: rm.hash,
      modifiedClickPreserved: r.modifiedClick ? r.modifiedClick.before.hash === r.modifiedClick.after.hash && r.modifiedClick.before.focus === r.modifiedClick.after.focus : null,
      smallMinContrast: t.smallText.min,
      contrastViolations: t.smallText.violations.length
    };
  });
  console.log(JSON.stringify({ fontRequests: results.fontRequests, allRequests: results.allRequests, rows }, null, 2));
  console.log(`capturas + mediciones.json → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
