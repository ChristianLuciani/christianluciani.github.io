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
    // F2 del pase fresco: RFC 9309 §2.2.1 hace el matching de `User-agent`
    // case-insensitive, y la indentación no cambia el grupo. Un chequeo sensible
    // a caja dejaba pasar `user-agent: *` + `Allow: /` + `Disallow: /` en verde.
    if (/^[ \t]*user-agent[ \t]*:[ \t]*\*[ \t]*$/im.test(robots)) {
      problems.push("robots.txt: grupo `User-agent: *` — la política es explícita, sin wildcard");
    }
    if (!/^[ \t]*allow[ \t]*:[ \t]*\/[ \t]*$/im.test(robots)) {
      problems.push("robots.txt: sin grupo de retrieval (`Allow: /`)");
    }
    if (!/^[ \t]*disallow[ \t]*:[ \t]*\/[ \t]*$/im.test(robots)) {
      problems.push("robots.txt: sin grupo de training (`Disallow: /`)");
    }
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
