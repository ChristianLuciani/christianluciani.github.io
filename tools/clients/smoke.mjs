#!/usr/bin/env node
/**
 * smoke.mjs — gate de navegador real para el client lab (#145, F4 del review).
 *
 * El gate de CI sólo grepeaba dist/clients/<slug>/; acá se CARGA la página en
 * Chrome headless (mismo CDP que los gates del logo) servida por HTTP loopback
 * y se afirma que el bundle del lab arranca de verdad:
 *
 *   · gate visible → clic en "Enter the lab" → #lab se desoculta (si el bundle
 *     revienta al evaluar, el botón no hace nada: es el blocker que este gate
 *     cierra);
 *   · 4 tool cards · ejecutar la primera devuelve JSON parseable con el nombre;
 *   · Provenance: Verify → 3 hechos OK contra /agent/profile.json;
 *   · Fit: preset + run → resumen "N/M requisitos con evidencia";
 *   · Chat sin endpoint configurado → degradación a "unavailable" (no cuelga).
 *
 * Slugs = directorios de dist/clients/ (se derivan del artefacto, no de una
 * lista hardcodeada). Uso:
 *   npm run build && npm run clients:smoke
 *   CHROME_PATH=/ruta/a/chrome npm run clients:smoke
 *
 * Exit: 0 OK · 1 gate rojo · 2 entorno roto (sin dist/, sin Chrome, CDP caído).
 */
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { session } from "../logo/chrome.mjs";

if (typeof WebSocket !== "function") {
  console.error("❌ SMOKE: no se pudo medir — requiere Node ≥22 (WebSocket global para CDP); CI usa Node 22");
  process.exit(2);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const DIST = resolve(ROOT, "dist");
const CLIENTS_DIR = resolve(DIST, "clients");
const LOAD_TIMEOUT_MS = 20_000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class GateFailure extends Error {}

const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

/** Sirve `dist/` en loopback (los módulos ES no cargan por file://). */
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

async function smokeSlug(origin, slug, tmp) {
  const bootstrap = join(tmp, `bootstrap-${slug}.html`);
  // session() espera animaciones antes de devolver: el bootstrap lleva una.
  writeFileSync(
    bootstrap,
    `<!doctype html><meta charset="utf-8"><style>@keyframes boot{to{opacity:.99}}body{animation:boot .6s infinite alternate}</style><script>location.replace(${JSON.stringify(`${origin}/clients/${slug}/`)})</script>`
  );
  const s = await session(bootstrap, { width: 1280, height: 900 });
  try {
    await waitFor(s, `location.pathname === ${JSON.stringify(`/clients/${slug}/`)} && document.readyState === "complete"`, `carga de /clients/${slug}/`);
    check(`${slug}: gate visible y lab oculto`, await s.eval(`!!document.getElementById("lab-gate") && document.getElementById("lab").hidden === true`));

    // El bundle debe haber evaluado y cableado el botón (blocker: bundle roto = clic muerto).
    await s.eval(`document.getElementById("lab-enter").click(), true`);
    await waitFor(s, `document.getElementById("lab").hidden === false`, `${slug}: #lab se desoculta tras Enter`);
    check(`${slug}: Enter the lab desoculta el laboratorio (bundle OK)`, true);

    check(`${slug}: 4 tool cards`, (await s.eval(`document.querySelectorAll(".tool-card").length`)) === 4);

    // Ejecutar la primera tool (get_profile, preset {}) → JSON real desde /agent/profile.json.
    await s.eval(`document.querySelector(".tool-card .tool-run").click(), true`);
    await waitFor(s, `document.querySelector(".tool-res") && document.querySelector(".tool-res").textContent.length > 0`, `${slug}: tool res`);
    const toolJson = await s.eval(`(() => { try { return JSON.parse(document.querySelector(".tool-res").textContent); } catch { return null; } })()`);
    check(`${slug}: get_profile devuelve JSON parseable con el nombre`, toolJson && toolJson.name === "Christian Luciani", toolJson ? String(toolJson.name) : "sin JSON");

    // Provenance: Verify compara 3 hechos contra el snapshot servido.
    await s.eval(`document.getElementById("prov-verify").click(), true`);
    await waitFor(s, `document.querySelectorAll("#prov-results li").length === 3`, `${slug}: verify 3 hechos`);
    check(
      `${slug}: Verify → 3/3 OK`,
      (await s.eval(`[...document.querySelectorAll("#prov-results .prov-badge-ok")].length`)) === 3
    );

    // Fit: preset del cliente + run → resumen N/M.
    await s.eval(`document.getElementById("fit-preset").click(); document.getElementById("fit-run").click(), true`);
    await waitFor(s, `!document.getElementById("fit-summary").hidden`, `${slug}: fit summary`);
    const summary = await s.eval(`document.getElementById("fit-summary").textContent`);
    check(`${slug}: Fit muestra resumen N/M con evidencia`, /\d+\/\d+/.test(summary), summary.trim());

    // Chat sin endpoint → degradación a "unavailable", no cuelga.
    check(
      `${slug}: chat sin endpoint degrada a unavailable`,
      (await s.eval(`!!document.querySelector("#chat-messages .chat-msg")`)) === true
    );
  } finally {
    s.close();
  }
}

async function run() {
  if (!existsSync(CLIENTS_DIR)) {
    console.error("❌ SMOKE: falta dist/clients/ — corré `npm run build` antes");
    process.exit(2);
  }
  const slugs = readdirSync(CLIENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  if (slugs.length === 0) {
    console.error("❌ SMOKE: dist/clients/ no tiene páginas de cliente");
    process.exit(2);
  }

  const server = await serveDist();
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;
  const tmp = mkdtempSync(join(tmpdir(), "clients-smoke-"));
  try {
    for (const slug of slugs) await smokeSlug(origin, slug, tmp);
  } finally {
    server.close();
    rmSync(tmp, { recursive: true, force: true });
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks OK · slugs: ${slugs.join(", ")}`);
  if (failed.length > 0) process.exit(1);
}

run().catch((err) => {
  if (err instanceof GateFailure) {
    console.error(`❌ SMOKE gate rojo: ${err.message}`);
    process.exit(1);
  }
  console.error(`❌ SMOKE: no se pudo medir — ${err.message}`);
  process.exit(2);
});
