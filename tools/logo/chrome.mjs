/**
 * chrome.mjs — Chrome headless compartido por los gates del logo (issue #55).
 *
 * Dos primitivas, un solo lugar donde vive el binario y la forma de invocarlo:
 *   · dumpDom(...)   — el DOM tal como quedó tras un presupuesto de tiempo
 *                      virtual (lo usa el gate de fidelidad geométrica).
 *   · session(...)   — una sesión CDP sobre la página viva: el gate de movimiento
 *                      congela fotogramas EXACTOS con `pause` + `currentTime` y
 *                      los captura. Es el único camino con el que se puede juzgar
 *                      un destello o un salto (ver `verify-motion.mjs`): el
 *                      presupuesto de tiempo virtual NO gobierna las animaciones
 *                      (medido: dos corridas del mismo instante dan estados
 *                      distintos), así que el congelado es explícito, no por flags.
 *
 * Hechos medidos en esta máquina (2026-09-29), que explican las decisiones:
 *   · `--virtual-time-budget=0` NO expira nunca ⇒ Chrome no cierra ni escribe
 *     el PNG (cuelga hasta que lo maten). Se clampea a ≥1 ms.
 *   · un `--user-data-dir` propio deja a Chrome vivo tras el screenshot
 *     (onboarding/registración en background) ⇒ `dumpDom` usa el perfil por
 *     defecto y un `timeout` convierte cualquier cuelgue en error explícito.
 *   · una sesión CDP, en cambio, SÍ usa perfil propio: es la única forma de que
 *     no la bloquee otro Chrome sobre el perfil por defecto (un headless colgado
 *     de una corrida anterior deja el gate sin puerto CDP y el error no dice por
 *     qué). Matar el proceso y borrar el perfil lo hace la propia sesión.
 *
 * Resolución del binario (#59): `CHROME_PATH` del entorno primero — es el
 * override explícito, y en CI el runner lo apunta al binario que acaba de
 * instalar — y después los paths por defecto de macOS y de linux
 * (`google-chrome-stable` / `chromium` del runner). Sin binario ⇒ error
 * explícito con la lista probada, nunca un gate que "pasa" por no poder medir.
 */
import { spawn, spawnSync } from "node:child_process";
import { accessSync, constants, mkdtempSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* Defaults por plataforma (macOS primero sólo por orden de lectura: en linux
 * no existe). CHROME_PATH gana siempre: se prepende en chromeCandidates(). */
const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LINUX_CHROME = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];

/* Un candidato válido es un ARCHIVO EJECUTABLE: `accessSync(F_OK)` aceptaba
 * directorios y archivos sin permiso de ejecución, y el fallo aparecía recién al
 * lanzarlo (issue #75). */
/** Motivo por el que un candidato NO sirve (null si sirve). Un diagnóstico
 *  «no encontrado» a secas esconde un wrapper sin `chmod +x` (F5 de #75). */
const whyNot = (p) => {
  try {
    if (!statSync(p).isFile()) return "no es un archivo";
    accessSync(p, constants.X_OK);
    return null;
  } catch (e) {
    return e?.code === "EACCES" ? "sin permiso de ejecución" : "no existe";
  }
};
const exists = (p) => whyNot(p) === null;

/** Candidatos en orden de precedencia. Lee el entorno en cada llamada: un
 *  `CHROME_PATH` seteado después del import sigue ganando. */
export function chromeCandidates() {
  return [process.env.CHROME_PATH, MAC_CHROME, ...LINUX_CHROME].filter(Boolean);
}

/** Primer binario existente. `candidates` es un seam para los tests: el
 *  contrato real es la lista por defecto. */
export function chromePath(candidates = chromeCandidates()) {
  const found = candidates.find(exists);
  if (!found) {
    const tried = candidates.length
      ? candidates.map((p) => `${p} (${whyNot(p)})`).join(", ")
      : "(lista vacía)";
    throw new Error(`Chrome no encontrado (probado: ${tried}) — instalá Chrome o seteá CHROME_PATH`);
  }
  return found;
}

/** Error de una corrida de Chrome con su stderr. La CAUSA va primero: en el
 *  runner de linux el volcado de crashpad (últimas líneas) tapaba el
 *  `FATAL ... No usable sandbox!` que la explicaba — y una muerte por señal se
 *  reportaba como «código null» (#59, pase fresco F2). */
export function chromeFailure(err, stderr = "") {
  const lines = String(stderr).split("\n").map((l) => l.trim()).filter(Boolean);
  const cause = lines.length > 6 ? [...lines.slice(0, 2), "…", lines[lines.length - 1]] : lines;
  /* Cuatro caminos, cuatro textos. El `message` manda cuando existe: es el
   * fallo de spawnSync y ahí `status` MIENTE — ENOBUFS llega con `status: 0`
   * (un fallo que se leía como éxito) y el timeout llega como SIGTERM sin decir
   * que fue timeout (issue #75, F2 del pase fresco). */
  const how = err?.message
    ? (/ETIMEDOUT|timeout/i.test(err.message) ? "no terminó a tiempo (timeout)" : `no pudo ejecutarse (${err.message})`)
    : err?.signal ? `murió por señal ${err.signal}`
      : `salió con código ${err?.status ?? "?"}`;
  return new Error(`Chrome falló (${how})${cause.length ? ` · chrome: ${cause.join(" | ")}` : ""}`);
}

const BASE_ARGS = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars"];

/* Ubuntu 23.10+ deshabilita los user namespaces (AppArmor) y Chrome aborta en el
 * arranque con `No usable sandbox!` — medido en el runner (matrix de flags:
 * sólo `--no-sandbox` lo destraba). El contenido que renderiza el gate es del
 * propio repo y el runner es efímero; en macOS el sandbox queda activo. */
if (process.platform === "linux") BASE_ARGS.push("--no-sandbox", "--disable-dev-shm-usage");

const RUN_TIMEOUT_MS = 180_000;
const CALL_TIMEOUT_MS = 30_000;

/* spawnSync (no execFileSync): hace falta el stderr del binario para que un
 * fallo en un runner nuevo diga POR QUÉ falló, no sólo "Command failed" (#59). */
const run = (args, { capture = false } = {}) => {
  const res = spawnSync(chromePath(), [...BASE_ARGS, ...args], {
    encoding: capture ? "utf8" : "buffer",
    timeout: RUN_TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stderr = res.stderr == null ? "" : String(res.stderr);
  if (res.error) throw chromeFailure({ message: res.error.message, code: res.error.code }, stderr);
  if (res.status !== 0 || res.signal) throw chromeFailure(res, stderr);
  return capture ? res.stdout : undefined;
};

/** DOM serializado tras `budget` ms de tiempo virtual. */
export function dumpDom(file, { reduced = false, budget = 1500, size } = {}) {
  const args = [`--virtual-time-budget=${Math.max(1, budget)}`];
  if (size) args.push(`--window-size=${size.width},${size.height}`);
  args.push("--dump-dom", `file://${file}`);
  if (reduced) args.push("--force-prefers-reduced-motion");
  return run(args, { capture: true });
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
/**
 * Sesión CDP con un reintento: el arranque de Chrome no siempre abre el puerto
 * (medido dos veces en esta máquina: se lanza, no imprime error y el puerto nunca
 * aparece — probablemente colisión del puerto efímero con algo del sistema). Un
 * fallo transitorio de entorno no debe leerse como "el gate no midió": se reintenta
 * una vez con perfil y puerto nuevos, y recién ahí se reporta el error.
 */
export async function session(file, opts = {}) {
  try {
    return await openSession(file, opts);
  } catch (err) {
    if (!/CDP no responde/.test(err.message)) throw err;
    return await openSession(file, opts);
  }
}

async function openSession(file, { width = 800, height = 800 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "logo-cdp-"));
  const port = await freePort();
  const child = spawn(chromePath(), [
    ...BASE_ARGS, `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`, `file://${file}`,
  ], { stdio: ["ignore", "ignore", "pipe"] });

  /* Chrome puede morir sin abrir el puerto (colisión de puerto, perfil trabado).
     Sin su stderr el error dice sólo "CDP no responde", que no orienta a nadie. */
  const chromeLog = [];
  child.stderr.on("data", (chunk) => {
    chromeLog.push(String(chunk));
    if (chromeLog.length > 20) chromeLog.shift();
  });
  const why = () => {
    const lines = chromeLog.join("").split("\n").filter((l) => l.trim() && !/CVDisplayLink|allocator multiple/.test(l));
    return lines.length ? ` · chrome: ${lines.slice(-2).join(" | ")}` : "";
  };

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
    /* Toda llamada CDP vence: un renderer clavado no puede dejar el gate colgado
       esperando una respuesta que no va a llegar (el `timeout` de run() sólo
       cubre los caminos de un solo disparo). */
    const send = (method, params = {}) => new Promise((res, rej) => {
      const myId = ++id;
      const timer = setTimeout(() => {
        pending.delete(myId);
        rej(new Error(`CDP ${method}: sin respuesta en ${CALL_TIMEOUT_MS}ms`));
      }, CALL_TIMEOUT_MS);
      pending.set(myId, {
        res: (v) => { clearTimeout(timer); res(v); },
        rej: (e) => { clearTimeout(timer); rej(e); },
      });
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
    throw new Error(`${err.message}${why()}`);
  }
}
