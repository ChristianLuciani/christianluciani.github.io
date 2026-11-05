/**
 * sync-ai-policy — publica la política IA del SSOT en la raíz del dominio (#140).
 *
 * El engine ya declara la postura (`ai-retrieval` permitido, `ai-training`
 * bloqueado) y la proyecta con `pasco export ai-policy` (SPEC §12 M9). Hasta
 * #140 esa política nunca se desplegaba: `public/` sólo tenía `assets/` y
 * `audio/`, así que `https://christianluciani.github.io/robots.txt` y
 * `/llms.txt` no existían.
 *
 * Los tres archivos se COMMITEAN como snapshot de deploy (misma decisión que
 * `profile.generated.ts`/`entity.generated.ts`: el workflow de CI no tiene acceso
 * al repo privado `profile-data`, así que no puede generarlos). El gate es
 * `sync:check`: sin workspace verifica su estructura, con `--workspace` regenera
 * y compara byte a byte.
 *
 * Vite copia `public/` a la raíz de `dist/`, así que no hace falta un plugin.
 * El engine es idempotente (reemplaza lo que él generó) y determinista (dos
 * corridas → bytes idénticos): este script sólo lo invoca y verifica.
 *
 * Uso:
 *   npm run sync:ai-policy
 *   npm run sync:ai-policy -- --workspace ../profile-data
 *   npm run sync:ai-policy -- --out /tmp/policy
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { pasco, resolvePaths } from "./sync-profile";

export const POLICY_FILES = ["robots.txt", "llms.txt", "AI-POLICY.md"] as const;
export type PolicyFile = (typeof POLICY_FILES)[number];

/** Directorio servido tal cual por Vite (`public/` → raíz de `dist/`). */
export const POLICY_DIR = resolve(process.cwd(), "public");

/** Lee los tres artefactos; `null` para el que falte (el gate nombra el hueco). */
export function readPolicy(dir = POLICY_DIR): Record<PolicyFile, string | null> {
  const out = {} as Record<PolicyFile, string | null>;
  for (const file of POLICY_FILES) {
    const path = join(dir, file);
    out[file] = existsSync(path) ? readFileSync(path, "utf8") : null;
  }
  return out;
}

/**
 * Directivas de `robots.txt` según RFC 9309 §2.2.1: `EOL = *WS [comment] NL` y
 * el `user-agent` matchea case-insensitive.
 *
 * POR QUÉ UN PARSER Y NO UNA REGEX: la clase «el gate no lee la gramática que el
 * crawler sí lee» reapareció DOS veces (caja/indentación y después comentario de
 * fin de línea). La escalera de `review-damping` pide el INSTRUMENTO que cierra
 * la clase, no otra regex anclada: acá se tokeniza cada línea (comentario fuera,
 * `trim`, clave en minúscula) y después se compara por igualdad — cualquier
 * variante léxica válida cae en el mismo token.
 */
export function robotsDirectives(text: string): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  for (const raw of text.split(/\r\n|\r|\n/)) {
    // `#` abre comentario en cualquier posición de la línea (RFC 9309 §2.2.1).
    const line = raw.replace(/#.*$/, "").trim();
    if (line.length === 0) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue; // línea sin directiva: el RFC la ignora
    out.push({
      key: line.slice(0, colon).trim().toLowerCase(),
      value: line.slice(colon + 1).trim()
    });
  }
  return out;
}

/**
 * Invariantes de la postura, verificables SIN workspace (modo CI). El engine ya
 * los declara en su SPEC §12; acá se comprueba que el artefacto commiteado no se
 * degradó a mano (p. ej. un `User-agent: *` que bloquearía también a los motores
 * de búsqueda que la política no nombra).
 */
export function policyProblems(files: Record<PolicyFile, string | null>): string[] {
  const problems: string[] = [];
  for (const file of POLICY_FILES) {
    if (files[file] === null) {
      problems.push(`falta ${file} en public/ (regenerá con npm run sync:ai-policy)`);
    }
  }
  const robots = files["robots.txt"];
  if (robots) {
    const directives = robotsDirectives(robots);
    const has = (key: string, value: string) =>
      directives.some((directive) => directive.key === key && directive.value === value);
    if (has("user-agent", "*")) {
      problems.push("robots.txt: grupo `User-agent: *` — la política es explícita, sin wildcard");
    }
    if (!has("allow", "/")) problems.push("robots.txt: sin grupo de retrieval (`Allow: /`)");
    if (!has("disallow", "/")) problems.push("robots.txt: sin grupo de training (`Disallow: /`)");
  }
  const llms = files["llms.txt"];
  if (llms && !/^#\s/m.test(llms)) problems.push("llms.txt: sin título de índice (se esperaba un heading `# `)");
  const policy = files["AI-POLICY.md"];
  if (policy && policy.trim().length === 0) problems.push("AI-POLICY.md: vacío");
  return problems;
}

/**
 * Pipeline: `pasco export ai-policy --out <dir>`. El engine REFUSA pisar un
 * archivo que no generó él (sin `--force`) — y está bien: si alguien escribió un
 * `robots.txt` a mano, el sync tiene que fallar visiblemente, no borrarlo.
 */
export function generatePolicy(workspace: string, outDir = POLICY_DIR): Record<PolicyFile, string> {
  pasco(["export", "ai-policy", "--out", outDir, "--workspace", workspace]);
  const files = readPolicy(outDir);
  const missing = POLICY_FILES.filter((file) => files[file] === null);
  if (missing.length) {
    throw new Error(`pasco export ai-policy no escribió: ${missing.join(", ")} (en ${outDir})`);
  }
  return files as Record<PolicyFile, string>;
}

/* ──────────────────────────────────────────────
   CLI
────────────────────────────────────────────── */

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const { workspace: envWorkspace } = resolvePaths();
  const workspace = argValue("--workspace") ?? envWorkspace;
  if (!workspace) throw new Error("PROFILE_DATA_PATH no está definido (ver .env.example)");
  const outDir = argValue("--out") ?? POLICY_DIR;
  const files = generatePolicy(workspace, outDir);
  for (const file of POLICY_FILES) {
    console.log(`✅ ${file} (${files[file].length} bytes) → ${join(outDir, file)}`);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error(`❌ ${(err as Error).message}`);
    process.exit(1);
  });
}
