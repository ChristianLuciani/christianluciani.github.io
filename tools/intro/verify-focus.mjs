/**
 * verify-focus.mjs — gate de FOCO del skip de la intro (cierra la clase 1 que
 * el pase fresco de #143 dejó declarada como deuda).
 *
 * Por qué existe: la suite es node-only y no puede ver el estado del DOM. El
 * defecto real que motivó el gate no era de markup sino de interacción:
 *   · un listener global de click llamaba a `skipToPage` aun cuando el target
 *     fuera `.skip-link` o un `.nav-dot` (controles que viven SOBRE el loader),
 *     robándoles foco y scroll;
 *   · al completar la intro normalmente, remover el botón enfocado dejaba el
 *     foco en `<body>`.
 * Este gate mide el comportamiento en Chrome real: foco inicial, que un clic
 * ajeno NO dispare el skip, y a dónde aterriza el foco al saltar y al completar.
 *
 * Cómo mide:
 *  1. Sirve `dist/` por HTTP en loopback (el bundle de Vite usa rutas absolutas;
 *     `file://` bloquearía los módulos ES por CORS).
 *  2. Abre una sesión CDP con `tools/logo/chrome.mjs` (misma resolución de
 *     binario y mismos flags que los gates del logo) sobre un bootstrap que
 *     redirige a la app.
 *  3. Ejecuta cuatro escenarios y afirma el `document.activeElement` y el
 *     estado del loader en cada uno.
 *
 * Uso:
 *   npm run build && npm run intro:verify
 *   CHROME_PATH=/ruta/a/chrome npm run intro:verify
 *
 * Exit: 0 OK · 1 violación de foco · 2 no se pudo medir (sin build, sin Chrome,
 * sesión CDP caída). El 2 distingue entorno roto de gate rojo.
 *
 * LÍMITE DECLARADO: mide `activeElement`, no la posición del anillo de foco
 * pintado; el defecto de #143 era de foco lógico, no de pintura. Y el clic se
 * dispara por JS (`.click()`), no por un input de confianza: alcanza para
 * probar que NINGÚN handler global nuestro reacciona, que es la regresión que
 * este gate cierra.
 */
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { session } from "../logo/chrome.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const DIST = resolve(ROOT, "dist");
const INDEX = resolve(DIST, "index.html");
const LOAD_TIMEOUT_MS = 20_000;
const INTRO_TIMEOUT_MS = 45_000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fallo del gate (comportamiento), no del entorno. */
class GateFailure extends Error {}

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
}

/** Sirve `dist/` en loopback; una sesión Chrome no puede medir sin HTTP. */
function serveDist() {
  const server = createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    } catch {
      res.writeHead(400).end("bad url");
      return;
    }
    const rel = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
    const file = resolve(DIST, `.${rel}`);
    // Nunca salir de dist/ (path traversal).
    if (file !== DIST && !file.startsWith(DIST + sep)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    try {
      const body = readFileSync(file);
      res.writeHead(200, { "content-type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveServer(server));
  });
}

/**
 * Evalúa hasta que la expresión sea truthy. Tolera los errores transitorios de
 * contexto cuando una navegación reemplaza el documento (escenario de recarga).
 */
async function waitFor(s, expression, label, timeout = LOAD_TIMEOUT_MS) {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeout) {
    try {
      const value = await s.eval(expression);
      if (value) return value;
    } catch (err) {
      lastError = err.message;
      if (!/context|Execution|destroyed|Cannot find|Target closed/i.test(lastError)) throw err;
    }
    await sleep(100);
  }
  throw new GateFailure(`timeout esperando ${label}${lastError ? ` (último error: ${lastError})` : ""}`);
}

/** Estado de foco/loader que usan las aserciones. */
const STATE_PROBE = `(() => {
  const loader = document.getElementById('loader');
  const hero = document.querySelector('.hero-name');
  const skip = document.getElementById('btn-skip-intro');
  const active = document.activeElement;
  return {
    loaderHidden: !!loader && loader.classList.contains('hidden'),
    skipExists: !!skip,
    heroFocused: !!hero && active === hero,
    activeId: active && active.id ? active.id : '',
    activeTag: active ? active.tagName : '',
    heroOpacity: hero ? getComputedStyle(hero).opacity : '',
    introDisplay: document.getElementById('intro-block')
      ? getComputedStyle(document.getElementById('intro-block')).display
      : 'absent'
  };
})()`;

async function run() {
  if (!existsSync(INDEX)) {
    throw new Error("falta dist/index.html; corré `npm run build` antes de este gate");
  }

  const server = await serveDist();
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;
  const tmp = mkdtempSync(join(tmpdir(), "intro-focus-"));
  const bootstrap = join(tmp, "bootstrap.html");
  // `session()` espera una página con animaciones antes de devolver: el
  // bootstrap lleva una para no colgarse, y redirige a la app real por HTTP.
  writeFileSync(
    bootstrap,
    `<!doctype html><meta charset="utf-8"><style>@keyframes boot{to{opacity:.99}}body{animation:boot .6s infinite alternate}</style><script>location.replace(${JSON.stringify(`${origin}/`)})</script>`
  );

  let s;
  try {
    s = await session(bootstrap, { width: 1280, height: 900 });
    const appReady = `location.origin === ${JSON.stringify(origin)} && document.readyState === "complete" && !!document.getElementById("btn-skip-intro")`;

    // ── Escenario 1: foco inicial en el botón de skip ──────────────────────
    await waitFor(s, appReady, "carga de la app");
    await waitFor(s, `document.activeElement && document.activeElement.id === "btn-skip-intro"`, "foco inicial en el skip");
    check("foco inicial en #btn-skip-intro", true);

    // ── Escenario 2: un control sobre el loader NO dispara el skip ─────────
    await s.eval(`(() => {
      const link = document.querySelector('.skip-link');
      link.focus();
      link.click();
      return true;
    })()`);
    await sleep(150);
    const foreign = await s.eval(STATE_PROBE);
    check(
      "clic en .skip-link durante la intro no dispara skip ni roba foco",
      !foreign.loaderHidden && !foreign.heroFocused,
      JSON.stringify(foreign)
    );
    await s.eval(`history.replaceState(null, "", location.pathname); window.scrollTo(0, 0); document.activeElement?.blur(); true`);

    // ── Escenario 3: un clic fuera del botón tampoco dispara el skip ───────
    await s.eval(`document.body.click(); true`);
    await sleep(150);
    const bodyClick = await s.eval(STATE_PROBE);
    check(
      "clic fuera del botón durante la intro no dispara skip",
      !bodyClick.loaderHidden && !bodyClick.heroFocused,
      JSON.stringify(bodyClick)
    );

    // ── Escenario 4: el botón sí salta y entrega el foco al hero ───────────
    await s.eval(`document.getElementById('btn-skip-intro').click(); true`);
    await waitFor(s, `document.getElementById('loader').classList.contains('hidden')`, "loader oculto tras el skip", 5_000);
    const skipped = await s.eval(STATE_PROBE);
    check(
      "skip oculta el loader, quita el botón y enfoca .hero-name",
      skipped.skipExists === false &&
        skipped.introDisplay === "none" &&
        skipped.heroFocused &&
        Number(skipped.heroOpacity) > 0.9,
      JSON.stringify(skipped)
    );

    // ── Escenario 5: completar la intro normalmente entrega el foco ────────
    // El botón arranca enfocado; si `finish()` lo remueve sin handoff, el foco
    // queda en <body>. Es el F2 del pase fresco, no cubierto por la suite.
    try {
      await s.eval(`location.href = ${JSON.stringify(`${origin}/?case=normal`)}; true`);
    } catch (err) {
      // La navegación puede destruir el contexto antes de responder.
      if (!/context|Execution|destroyed|Cannot find|Target closed/i.test(err.message)) throw err;
    }
    await waitFor(s, appReady, "recarga de la app");
    await waitFor(s, `document.activeElement && document.activeElement.id === "btn-skip-intro"`, "foco inicial tras recargar");
    await waitFor(
      s,
      `document.getElementById('loader').classList.contains('hidden')`,
      "fin natural de la intro",
      INTRO_TIMEOUT_MS
    );
    const finished = await s.eval(STATE_PROBE);
    check(
      "al completar la intro el foco aterriza en .hero-name",
      finished.heroFocused && finished.skipExists === false,
      JSON.stringify(finished)
    );
  } finally {
    try {
      s?.close();
    } catch {
      /* la sesión ya pudo morir */
    }
    server.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

try {
  await run();
  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? "✅" : "❌"} ${c.name}${c.ok ? "" : ` · ${c.detail ?? ""}`}`);
  }
  if (failed.length) {
    console.error(`❌ FOCO: ${failed.length} de ${checks.length} aserciones fallaron — el skip no cumple el contrato de foco`);
    process.exitCode = 1;
  } else {
    console.log(`🏆 FOCO: ${checks.length}/${checks.length} — el skip no captura clicks ajenos y entrega el foco`);
  }
} catch (err) {
  if (err instanceof GateFailure) {
    console.error(`❌ FOCO: ${err.message}`);
    process.exitCode = 1;
  } else {
    console.error(`❌ FOCO: no se pudo medir — ${err.message}`);
    process.exitCode = 2;
  }
}
