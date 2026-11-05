/**
 * sync-now — pipeline de dependencia: `ChristianLuciani/now` → `src/data/now.generated.ts`.
 *
 * SPEC: issue #117. El consumidor pinea un tag inmutable en `now.lock.json`
 * (tag + sha256), verifica el digest ANTES de escribir y proyecta un módulo
 * tipado. Determinismo (mismo tag + mismo lock → bytes idénticos): el único
 * reloj del output es `asOf`, un DATO del snapshot, no `Date.now()`. El build
 * NO corre este script y hace cero requests de red.
 *
 * Uso: `npm run sync:now` (fetch del pin) · `-- --tag vX.Y.Z` (re-pinear, nunca
 * hacia abajo) · `-- --check` (offline: lock ↔ snapshot ↔ generado).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { get as httpsGet } from "node:https";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { NowItem, NowKind, NowLock, NowSnapshot } from "../src/data/now.types.ts";

/* ──────────────────────────────────────────────
   Rutas y constantes del contrato
────────────────────────────────────────────── */

export const LOCK_PATH = resolve(process.cwd(), "now.lock.json");
export const SNAPSHOT_PATH = resolve(process.cwd(), "src", "data", "now.snapshot.json");
export const GENERATED_PATH = resolve(process.cwd(), "src", "data", "now.generated.ts");

/** El productor es UNO: el lock no puede apuntar el feed a otro repo. */
export const PRODUCER_REPO = "ChristianLuciani/now";
const CDN_BASE = "https://cdn.jsdelivr.net/gh";
const KINDS: readonly NowKind[] = ["release", "post", "pr", "note"];
const MAX_ITEMS = 5;
const MAX_BODY_BYTES = 64 * 1024;
const USER_AGENT =
  "christianluciani.github.io sync-now (+https://github.com/ChristianLuciani/christianluciani.github.io)";

/** Error del pipeline: la razón exacta viaja en el mensaje (nunca un fallo mudo). */
export class NowError extends Error {}

function fail(reason: string): never {
  throw new NowError(`now: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(obj: Record<string, unknown>, keys: readonly string[], where: string): void {
  const got = Object.keys(obj).sort().join(",");
  const want = [...keys].sort().join(",");
  if (got !== want) fail(`${where}: claves "${got}" ≠ contrato "${want}" (additionalProperties: false)`);
}

function assertString(value: unknown, where: string): string {
  if (typeof value !== "string") fail(`${where}: se esperaba string`);
  return value;
}


/** URL inmutable del snapshot, derivada del lock (tag y URL no viven duplicados). */
export function lockUrl(lock: NowLock): string {
  return `${CDN_BASE}/${lock.repo}@${lock.tag}/now.json`;
}

export function parseLock(raw: string): NowLock {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    fail("now.lock.json no es JSON");
  }
  if (!isRecord(data)) fail("now.lock.json no es un objeto");
  assertExactKeys(data, ["repo", "tag", "sha256"], "now.lock.json");
  const repo = assertString(data.repo, "now.lock.json repo");
  const tag = assertString(data.tag, "now.lock.json tag");
  const sha256 = assertString(data.sha256, "now.lock.json sha256");
  if (repo !== PRODUCER_REPO) {
    fail(`now.lock.json repo "${repo}" ≠ productor único "${PRODUCER_REPO}" (supply chain)`);
  }
  // Tag inmutable: un `main`, un `v1` móvil o una rama no son pin.
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) fail(`now.lock.json tag "${tag}" no es un tag inmutable vX.Y.Z`);
  if (!/^[0-9a-f]{64}$/.test(sha256)) fail("now.lock.json sha256 no es un hex de 64 caracteres");
  return { repo, tag, sha256 };
}

export function renderLock(lock: NowLock): string {
  return `${JSON.stringify({ repo: lock.repo, tag: lock.tag, sha256: lock.sha256 }, null, 2)}\n`;
}


function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const ms = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === date;
}

function projectItem(raw: unknown, index: number): NowItem {
  const where = `items[${index}]`;
  if (!isRecord(raw)) fail(`${where}: no es un objeto`);
  assertExactKeys(raw, ["kind", "title", "url", "date", "source"], where);
  const kind = assertString(raw.kind, `${where}.kind`);
  if (!(KINDS as readonly string[]).includes(kind)) {
    fail(`${where}.kind "${kind}" fuera del vocabulario ${KINDS.join("|")}`);
  }
  const title = assertString(raw.title, `${where}.title`);
  if (title.length < 1 || title.length > 120) fail(`${where}.title: largo ${title.length} fuera de 1..120`);
  const url = assertString(raw.url, `${where}.url`);
  if (!/^https:\/\//.test(url)) fail(`${where}.url no es https: "${url}"`);
  const date = assertString(raw.date, `${where}.date`);
  if (!validDate(date)) fail(`${where}.date "${date}" no es una fecha YYYY-MM-DD válida`);
  const source = assertString(raw.source, `${where}.source`);
  if (source.length < 1) fail(`${where}.source vacío`);
  return { kind: kind as NowKind, title, url, date, source };
}

/** Valida contra `schema/now.schema.json` del productor. Un drift es un fallo ruidoso. */
export function validateSnapshot(raw: unknown): NowSnapshot {
  if (!isRecord(raw)) fail("snapshot: no es un objeto");
  assertExactKeys(raw, ["schema", "asOf", "items"], "snapshot");
  if (raw.schema !== "now/v1") fail(`snapshot.schema "${String(raw.schema)}" ≠ "now/v1"`);
  const asOf = assertString(raw.asOf, "snapshot.asOf");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(asOf)) {
    fail(`snapshot.asOf "${asOf}" no es ISO 8601 UTC (YYYY-MM-DDTHH:MM:SSZ)`);
  }
  if (!Array.isArray(raw.items)) fail("snapshot.items no es una lista");
  if (raw.items.length > MAX_ITEMS) fail(`snapshot.items tiene ${raw.items.length} > ${MAX_ITEMS}`);

  const items = raw.items.map((item, index) => projectItem(item, index));
  // El orden es parte del contrato (y del determinismo): date desc, luego url asc.
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const cur = items[i];
    const ordered =
      cur.date < prev.date || (cur.date === prev.date && cur.url > prev.url);
    if (!ordered) {
      fail(
        `snapshot.items desordenado en ${i - 1}→${i}: ` +
          `"${prev.date} ${prev.url}" debe preceder a "${cur.date} ${cur.url}" (date desc, url asc)`
      );
    }
  }
  return { schema: "now/v1", asOf, items };
}

/* ──────────────────────────────────────────────
   Digest y artefactos
────────────────────────────────────────────── */

export function sha256Hex(bytes: string | Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Verifica el digest ANTES de escribir; un tag con otros bytes es un fallo duro. */
export function verifyDigest(bytes: Buffer, lock: NowLock): void {
  const got = sha256Hex(bytes);
  if (got !== lock.sha256) {
    fail(
      `digest de ${PRODUCER_REPO}@${lock.tag} no coincide con el lock: ` +
        `esperado ${lock.sha256}, obtenido ${got} — el tag cambió bajo los pies o el fetch no es el artefacto`
    );
  }
}

export function renderModule(snapshot: NowSnapshot, lock: NowLock): string {
  const json = JSON.stringify(snapshot, null, 2);
  return `// AUTO-GENERATED by tools/sync-now.ts — DO NOT EDIT.
// source: ${lock.repo} @ ${lock.tag} · sha256 ${lock.sha256}
// asOf: ${snapshot.asOf} · ${snapshot.items.length} item(s) · schema ${snapshot.schema}
// Regenerate: npm run sync:now  (issue #117 — el feed es chrome, no un hecho citable)
import type { NowSnapshot } from "./now.types.ts";

export const NOW = ${json} as const satisfies NowSnapshot;
`;
}


/**
 * Revisa lock ↔ snapshot ↔ generado SIN red. Devuelve hallazgos con razón
 * exacta; vacío = consistente. Lo usan el CLI (`--check`) y el test, así el
 * test no reimplementa el gate que dice probar.
 */
export function auditNow(lock: NowLock, snapshotBytes: Buffer, generatedText: string): string[] {
  const findings: string[] = [];
  const got = sha256Hex(snapshotBytes);
  if (got !== lock.sha256) {
    findings.push(`snapshot no coincide con el lock: esperado ${lock.sha256}, obtenido ${got}`);
  }
  let snapshot: NowSnapshot;
  try {
    snapshot = validateSnapshot(JSON.parse(snapshotBytes.toString("utf8")));
  } catch (error) {
    findings.push(error instanceof Error ? error.message : String(error));
    return findings;
  }
  const expected = renderModule(snapshot, lock);
  if (expected !== generatedText) {
    findings.push("now.generated.ts no es el render del snapshot pineado (corré npm run sync:now)");
  }
  return findings;
}

/* ──────────────────────────────────────────────
   Red — única función con side-effect de red del pipeline
────────────────────────────────────────────── */

export function fetchBytes(url: string): Promise<Buffer> {
  return new Promise((resolvePromise, reject) => {
    const request = httpsGet(url, { headers: { "user-agent": USER_AGENT, accept: "application/json" } }, (response) => {
      const status = response.statusCode ?? 0;
      if (status !== 200) {
        response.resume();
        reject(new NowError(`now: fetch ${url} → HTTP ${status} (se esperaba 200)`));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          request.destroy();
          reject(new NowError(`now: fetch ${url} excede ${MAX_BODY_BYTES} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolvePromise(Buffer.concat(chunks)));
      response.on("error", (error) => reject(new NowError(`now: fetch ${url} falló: ${error.message}`)));
    });
    request.on("error", (error) => reject(new NowError(`now: fetch ${url} falló: ${error.message}`)));
    request.setTimeout(20_000, () => {
      request.destroy();
      reject(new NowError(`now: fetch ${url} timeout (20s)`));
    });
  });
}

/* ──────────────────────────────────────────────
   CLI
────────────────────────────────────────────── */

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function readLockFile(): NowLock {
  return parseLock(readFileSync(LOCK_PATH, "utf8"));
}

/** Compara tags `vX.Y.Z` (negativo si `a < b`). */
export function compareTags(a: string, b: string): number {
  const pa = a.slice(1).split(".").map(Number);
  const pb = b.slice(1).split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/**
 * Lock que gobierna la corrida. Un tag NUEVO es un re-pin explícito (TOFU: se
 * registra el digest de esos bytes); el MISMO tag SIEMPRE se verifica contra el
 * digest ya pineado — un tag movido no se acepta en silencio. Un tag MENOR que
 * el pineado se rechaza: si el productor retira el pin, no se re-pinea hacia abajo.
 */
export function targetLock(currentLock: NowLock, bytes: Buffer, tag?: string): NowLock {
  if (!tag || tag === currentLock.tag) return currentLock;
  if (compareTags(tag, currentLock.tag) < 0) {
    fail(`re-pin hacia abajo: ${tag} < ${currentLock.tag} (¿el productor retiró el pin?)`);
  }
  return { repo: PRODUCER_REPO, tag, sha256: sha256Hex(bytes) };
}

/** Genera snapshot+generado (y el lock si hay re-pin) a partir de bytes obtenidos. */
export function syncFromBytes(bytes: Buffer, currentLock: NowLock, tag?: string): { lock: NowLock; snapshot: NowSnapshot } {
  const lock = targetLock(currentLock, bytes, tag);
  verifyDigest(bytes, lock);
  const snapshot = validateSnapshot(JSON.parse(bytes.toString("utf8")));
  writeFileSync(SNAPSHOT_PATH, bytes);
  writeFileSync(GENERATED_PATH, renderModule(snapshot, lock));
  if (lock !== currentLock) writeFileSync(LOCK_PATH, renderLock(lock));
  return { lock, snapshot };
}

async function main(): Promise<number> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(
      "sync-now [--tag vX.Y.Z] [--check]\n" +
        "  (sin flags)  fetch del tag pineado → verifica digest → snapshot + generado\n" +
        "  --tag NUEVO  re-pin TOFU (registra el digest del tag nuevo); el MISMO tag verifica el pin\n" +
        "  --check      offline: lock ↔ snapshot ↔ generado"
    );
    return 0;
  }

  if (process.argv.includes("--check")) {
    const lock = readLockFile();
    const findings = auditNow(lock, readFileSync(SNAPSHOT_PATH), readFileSync(GENERATED_PATH, "utf8"));
    if (findings.length > 0) {
      for (const finding of findings) console.error(`❌ ${finding}`);
      return 1;
    }
    console.log(`✓ sync:now --check OK — ${lock.repo}@${lock.tag} · sha256 ${lock.sha256}`);
    return 0;
  }

  const currentLock = readLockFile();
  const tag = argValue("--tag");
  if (tag !== undefined && !/^v\d+\.\d+\.\d+$/.test(tag)) {
    console.error(`❌ --tag "${tag}" no es un tag inmutable vX.Y.Z`);
    return 2;
  }
  const bytes = await fetchBytes(lockUrl(tag ? { ...currentLock, tag } : currentLock));

  const { lock, snapshot } = syncFromBytes(bytes, currentLock, tag);
  console.log(`✓ ${lock.repo}@${lock.tag} · sha256 ${lock.sha256}`);
  console.log(`✓ ${SNAPSHOT_PATH} (${bytes.length} bytes)`);
  console.log(`✓ ${GENERATED_PATH} (${snapshot.items.length} item(s) · asOf ${snapshot.asOf})`);
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  );
}
