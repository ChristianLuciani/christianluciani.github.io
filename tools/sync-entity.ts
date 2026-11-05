/**
 * sync-entity — emite `src/data/entity.generated.ts` desde el SSOT (#140).
 *
 * QUÉ ES: el puente entre el engine y la capa legible por máquina del sitio. El
 * `Person` + `FAQPage` que `head_html.ts` escribía a mano contradecía al SSOT
 * (`jobTitle`, `@id`, `description`, `sameAs`, FAQ) y el sitio publicaba hechos
 * de dos generaciones distintas. Acá el engine es el ÚNICO emisor: el archivo se
 * commitea como snapshot de deploy y el gate es `npm run sync:check`.
 *
 * POR QUÉ `--jsonld --bare`: el engine ya declara que ese es el MISMO assembler
 * que embeden sus renderers (`pasco entity --jsonld`, SPEC §7.2). Re-armar el
 * JSON-LD en TS sería un segundo emisor — exactamente lo que #140 cierra. El
 * script NO interpreta la entidad: normaliza (un nodo suelto ⇒ lista) y emite.
 *
 * Determinismo: sin reloj. `source.generatedAt` es `null` salvo `--now`; el pin
 * sale de `git -C <workspace> rev-parse HEAD` (determinista, igual que el
 * snapshot del perfil). Dos corridas → bytes idénticos.
 *
 * Uso:
 *   npm run sync:entity
 *   npm run sync:entity -- --workspace ../profile-data
 *   npm run sync:entity -- --out /tmp/entity.generated.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gitInfo, pasco, resolvePaths, schemaLabel } from "./sync-profile";

export const COMMITTED_ENTITY_PATH = resolve(process.cwd(), "src", "data", "entity.generated.ts");

/** Major del payload de `pasco entity --json` que este consumidor entiende. */
export const SUPPORTED_ENTITY_SCHEMA = "1";

/** Vista congelada del engine (`pasco entity --json`, SPEC §7.2 del engine). */
export interface EntityView {
  schemaVersion: string;
  entity: Record<string, unknown> | null;
  gaps: { code?: string; detail?: string }[];
  faqJsonLd: Record<string, unknown> | null;
}

export interface EntitySource {
  commit: string;
  generatedAt: string | null;
}

/** Normaliza el `--bare` (objeto suelto o lista) a lista. Nunca ordena: el
 *  orden del engine es el del assembler y el render depende de él. */
export function normalizeNodes(raw: unknown): Record<string, unknown>[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    for (const node of raw) {
      if (node == null || typeof node !== "object") {
        throw new Error("pasco entity --jsonld --bare: nodo JSON-LD que no es objeto");
      }
    }
    return raw as Record<string, unknown>[];
  }
  if (typeof raw !== "object") {
    throw new Error("pasco entity --jsonld --bare: payload que no es objeto ni lista");
  }
  return [raw as Record<string, unknown>];
}

/** FAIL ante un contrato desconocido: proyectar otra generación con los
 *  supuestos viejos es el drift que este gate cierra (mismo criterio que
 *  `assertSchemaVersion` del perfil). */
export function assertEntitySchema(version: string): void {
  if (version !== SUPPORTED_ENTITY_SCHEMA) {
    throw new Error(
      `pasco entity: schemaVersion "${version || "(ausente)"}" desconocida; ` +
        `este consumidor sólo entiende v${SUPPORTED_ENTITY_SCHEMA}. ` +
        `Actualizá el consumidor o fijá el engine con el que se genera el snapshot.`
    );
  }
}

/** `pasco entity --json` — la vista estructurada (contrato + gaps + FAQ). */
export function entityView(workspace: string): EntityView {
  const envelope = JSON.parse(
    pasco(["entity", "--json", "--workspace", workspace], [0, 1])
  ) as { ok?: boolean; exitCode?: number; data?: EntityView };
  if (!envelope.data) {
    throw new Error(`pasco entity --json no devolvió data (exit ${envelope.exitCode ?? "?"})`);
  }
  assertEntitySchema(String(envelope.data.schemaVersion ?? ""));
  return envelope.data;
}

/** Los nodos que embeden los renderers, tal cual los emite el assembler. */
export function entityNodes(workspace: string): Record<string, unknown>[] {
  const raw = pasco(["entity", "--jsonld", "--bare", "--workspace", workspace], [0, 1]);
  try {
    return normalizeNodes(JSON.parse(raw));
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`pasco entity --jsonld --bare: JSON inválido (${err.message})`);
    }
    throw err;
  }
}

/**
 * Pipeline completo: engine → nodos + metadata de procedencia.
 *
 * El `@id` es el ancla de la entidad (`https://christianluciani.github.io`): sin
 * él, el JSON-LD no enlaza con ninguna superficie y la consistencia cross-surface
 * del objetivo 4 de la SPEC no se cumple. Se refusa en vez de publicar una
 * entidad huérfana.
 */
export function generateEntity(opts?: { workspace?: string; now?: string }) {
  const { workspace: envWorkspace } = resolvePaths();
  const workspace = opts?.workspace ?? envWorkspace;
  if (!workspace) throw new Error("PROFILE_DATA_PATH no está definido (ver .env.example)");

  const view = entityView(workspace);
  const nodes = entityNodes(workspace);
  const expected = (view.entity ? 1 : 0) + (view.faqJsonLd ? 1 : 0);
  if (nodes.length !== expected) {
    throw new Error(
      `pasco entity: --json declara ${expected} nodo(s) (entidad/FAQ) y --jsonld emitió ${nodes.length} — ` +
        "contrato inconsistente del engine, no se emite un snapshot ambiguo"
    );
  }
  // El `@id` es el ancla de la entidad (`https://christianluciani.github.io`): sin
  // él, el JSON-LD no enlaza con ninguna superficie y la consistencia
  // cross-surface del objetivo 4 de la SPEC no se cumple. Se refusa en vez de
  // publicar una entidad huérfana. Se mide sobre lo EMITIDO (el nodo del
  // assembler), no sobre la vista `--json` (que usa `id`, no `@id`).
  const person = nodes.find((node) => node["@type"] === "Person");
  const id = person?.["@id"];
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(
      "pasco entity: la entidad no declara @id (ningún link declara role: identity) — " +
        "el engine nunca lo inventa y el sitio no publica una entidad sin ancla. " +
        "Declaralo en profile-data/content/identity.yaml."
    );
  }

  const git = gitInfo(workspace);
  const source: EntitySource = { commit: git.commit, generatedAt: opts?.now ?? null };
  const schema = schemaLabel(workspace);
  const engine = engineVersion(workspace);
  return {
    source: renderEntitySource(nodes, source, engine, schema),
    nodes,
    view,
    meta: { source, schema, engine }
  };
}

/** `pasco doctor` es la fuente de la VERSIÓN del engine en el header (mismo
 *  criterio que el snapshot del perfil: metadata del engine, no del perfil). */
function engineVersion(workspace: string): string {
  const envelope = JSON.parse(
    pasco(["doctor", "--json", "--workspace", workspace], [0, 1])
  ) as { data?: { engine?: { version?: string } } };
  const version = envelope.data?.engine?.version;
  if (!version) throw new Error("pasco doctor no reportó la versión del engine (engine.version).");
  return version;
}

/**
 * Render byte-estable del snapshot: header AUTO-GENERATED (mismo formato que
 * `profile.generated.ts`, con el pin que el gate de frescura ya reconoce) +
 * `ENTITY` como `as const`.
 */
export function renderEntitySource(
  nodes: readonly Record<string, unknown>[],
  source: EntitySource,
  engine: string,
  schema: string
): string {
  const header = [
    "// AUTO-GENERATED by tools/sync-entity.ts — DO NOT EDIT.",
    `// source: profile-data @ ${source.commit || "?"} · generatedAt ${JSON.stringify(source.generatedAt ?? null)}`,
    `// engine @ ${engine} · schema v${schema}`,
    "// Regenerate: npm run sync:entity  (docs/SPEC.md §5.1 — editar hechos = editar profile-data)"
  ].join("\n");
  return `${header}
export const ENTITY = ${JSON.stringify({ source, nodes }, null, 2)} as const;
`;
}

/* ──────────────────────────────────────────────
   CLI
────────────────────────────────────────────── */

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const out = argValue("--out") ?? COMMITTED_ENTITY_PATH;
  const { source } = generateEntity({ workspace: argValue("--workspace"), now: argValue("--now") });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, source, "utf8");
  console.log(`✅ entity.generated.ts generado (${source.length} bytes) → ${out}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error(`❌ ${(err as Error).message}`);
    process.exit(1);
  });
}
