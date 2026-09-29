/**
 * chrome.mjs — Chrome headless compartido por los gates del logo (issue #55).
 *
 * Dos primitivas, un solo lugar donde vive el binario y la forma de invocarlo:
 *   · dumpDom(...)     — el DOM tal como quedó en un instante virtual (lo usan
 *                        el gate de fidelidad geométrica y el de movimiento
 *                        para leer el cronograma real de animaciones).
 *   · screenshot(...)  — el fotograma REAL (lo que el ojo ve): es la única
 *                        fuente válida para juzgar un destello o un salto.
 *
 * Hechos medidos en esta máquina (2026-09-29), que explican las decisiones:
 *   · `--virtual-time-budget=0` NO expira nunca ⇒ Chrome no cierra ni escribe
 *     el PNG (cuelga hasta que lo maten). Se clampea a ≥1 ms.
 *   · un `--user-data-dir` propio deja a Chrome vivo tras el screenshot
 *     (onboarding/registración en background) ⇒ se usa el perfil por defecto y
 *     un `timeout` convierte cualquier cuelgue en error explícito, nunca en un
 *     gate colgado.
 *
 * Resolución del binario: candidato fijo de macOS → CHROME_PATH del entorno.
 * Sin binario ⇒ error explícito, nunca un gate que "pasa" por no poder medir.
 */
import { execFileSync, spawn } from "node:child_process";
import { accessSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  process.env.CHROME_PATH,
].filter(Boolean);

const exists = (p) => { try { accessSync(p); return true; } catch { return false; } };

export function chromePath() {
  const found = CANDIDATES.find(exists);
  if (!found) throw new Error("Chrome no encontrado (instalá Chrome o seteá CHROME_PATH)");
  return found;
}

const BASE_ARGS = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars"];

/**
 * Flags de los fotogramas: sin ellos el tiempo virtual NO manda sobre las
 * animaciones (se mide el reloj de pared y dos corridas del "mismo" instante
 * dan fotogramas distintos). Medido: `--run-all-compositor-stages-before-draw`
 * + `--deterministic-mode` hacen que el presupuesto virtual sí gobierne el
 * render (t=800 y t=6700 dan estados distintos y correctos).
 */
const FRAME_ARGS = ["--run-all-compositor-stages-before-draw", "--deterministic-mode"];
const RUN_TIMEOUT_MS = 60_000;

const run = (args, { capture = false } = {}) =>
  execFileSync(chromePath(), [...BASE_ARGS, ...args], {
    encoding: capture ? "utf8" : undefined,
    timeout: RUN_TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
    stdio: capture ? ["ignore", "pipe", "ignore"] : ["ignore", "ignore", "ignore"],
  });

/** DOM serializado tras `budget` ms de tiempo virtual. */
export function dumpDom(file, { reduced = false, budget = 1500, size } = {}) {
  const args = [`--virtual-time-budget=${Math.max(1, budget)}`];
  if (size) args.push(`--window-size=${size.width},${size.height}`);
  args.push("--dump-dom", `file://${file}`);
  if (reduced) args.push("--force-prefers-reduced-motion");
  return run(args, { capture: true });
}

/**
 * screenshot(file, { timeMs, width, height }) → Buffer PNG del fotograma en
 * `timeMs` de tiempo virtual. Pasa por archivo temporal porque Chrome sólo
 * escribe el PNG en disco.
 */
export function screenshot(file, { timeMs = 0, width = 800, height = 800 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "logo-shot-"));
  const out = join(dir, "frame.png");
  try {
    run([
      `--virtual-time-budget=${Math.max(1, timeMs)}`, ...FRAME_ARGS,
      `--window-size=${width},${height}`, `--screenshot=${out}`, `file://${file}`,
    ]);
    return readFileSync(out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* ─────────────── sesión CDP: un Chrome, muchos fotogramas ───────────────

   Por qué existe: `--virtual-time-budget` NO garantiza el fotograma pedido
   (medido: dos corridas del mismo instante dan estados distintos, y dentro de
   una corrida los saltos caen en instantes arbitrarios). Una medición así no
   puede juzgar un destello de 400ms.

   Con una sesión CDP la página se carga una vez y el estado se vuelve una
   FUNCIÓN DEL TIEMPO DE ANIMACIÓN: se pausan las animaciones y se les fija
   `currentTime` ("seek"). El artefacto no depende del reloj de pared para su
   cronograma (todo se engancha al fin de la animación correspondiente), así
   que el fotograma es exacto y reproducible.
*/

const freePort = () => new Promise((res, rej) => {
  const srv = createServer();
  srv.on("error", rej);
  srv.listen(0, "127.0.0.1", () => { const { port } = srv.address(); srv.close(() => res(port)); });
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch { /* todavía no levantó */ }
    await sleep(100);
  }
  throw new Error(`CDP no responde en ${url}`);
}

/**
 * session(file, { width, height }) → { eval, capture, close }
 * Devuelve una sesión viva sobre la página cargada; el llamador hace `close()`.
 */
export async function session(file, { width = 800, height = 800 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "logo-cdp-"));
  const port = await freePort();
  const child = spawn(chromePath(), [
    ...BASE_ARGS, `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`, `file://${file}`,
  ], { stdio: "ignore" });

  const close = () => {
    try { child.kill("SIGKILL"); } catch { /* ya murió */ }
    /* el perfil es del proceso recién matado: puede tardar en soltar archivos */
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); }
    catch { /* perfil temporal en /tmp: que lo limpie el SO antes que romper el gate */ }
  };

  try {
    await json(`http://127.0.0.1:${port}/json/version`);
    const targets = await json(`http://127.0.0.1:${port}/json/list`);
    const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    if (!page) throw new Error("CDP: no hay target de página");

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", () => rej(new Error("CDP: no pude abrir el websocket")), { once: true });
    });

    let id = 0;
    const pending = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      const slot = pending.get(msg.id);
      if (!slot) return;
      pending.delete(msg.id);
      msg.error ? slot.rej(new Error(`CDP ${msg.error.message}`)) : slot.res(msg.result);
    });
    const send = (method, params = {}) => new Promise((res, rej) => {
      const myId = ++id;
      pending.set(myId, { res, rej });
      ws.send(JSON.stringify({ id: myId, method, params }));
    });

    await send("Page.enable");
    await send("Runtime.enable");

    const evalIn = async (expression, { awaitPromise = true } = {}) => {
      const out = await send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true });
      if (out.exceptionDetails) throw new Error(`evaluate: ${out.exceptionDetails.text} ${out.exceptionDetails.exception?.description ?? ""}`);
      return out.result.value;
    };

    /* esperar a que la página esté lista y tenga animaciones (render() corrió) */
    for (let i = 0; i < 100; i++) {
      const ready = await evalIn("document.readyState === 'complete' && document.getAnimations().length > 0");
      if (ready) break;
      await sleep(100);
      if (i === 99) throw new Error("la página no llegó a renderizar animaciones");
    }

    const capture = async () => {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      return Buffer.from(data, "base64");
    };

    return {
      eval: evalIn,
      capture,
      close: () => { try { ws.close(); } catch { /* noop */ } close(); },
    };
  } catch (err) {
    close();
    throw err;
  }
}
