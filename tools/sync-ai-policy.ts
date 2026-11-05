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
 * crawler sí lee» reapareció (caja/indentación, comentario de fin de línea y
 * después la capa de GRUPOS). La escalera de `review-damping` pide el
 * INSTRUMENTO que cierra la clase, no otra regex anclada: acá se tokeniza cada
 * línea (comentario fuera, `trim`, clave en minúscula) y después se compara por
 * igualdad — cualquier variante léxica válida cae en el mismo token.
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

export interface RobotsGroup {
  agents: string[];
  rules: { key: string; value: string }[];
}

/**
 * Agrupa las directivas como las lee un crawler (RFC 9309 §2.2.1):
 *
 * - un grupo empieza con una o más líneas `user-agent` y las reglas que siguen
 *   le pertenecen;
 * - un `user-agent` DESPUÉS de reglas abre un grupo nuevo (y una línea en blanco
 *   cierra el anterior);
 * - una regla antes del primer `user-agent` es inválida y se descarta.
 *
 * Pasar de «la directiva existe en el archivo» a «la directiva pertenece al
 * grupo correcto» es lo que cierra la clase: sin esto, borrar los `user-agent`
 * de training deja un `Disallow: /` huérfano que se aplica al grupo de retrieval
 * y el gate seguía verde (sonda del pase 3).
 */
export function robotsGroups(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (line.length === 0) {
      // Línea en blanco: cierra el grupo si ya tiene reglas. Si sólo acumuló
      // `user-agent`, se conserva (varias líneas de agente = el mismo grupo).
      if (current && current.rules.length > 0) {
        groups.push(current);
        current = null;
      }
      continue;
    }
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (!current || current.rules.length > 0) {
        if (current) groups.push(current);
        current = { agents: [], rules: [] };
      }
      current.agents.push(value);
      continue;
    }
    if (!current) continue; // regla sin `user-agent`: el RFC la ignora
    current.rules.push({ key, value });
  }
  if (current) groups.push(current);
  return groups;
}

/**
 * Invariantes de la postura, verificables SIN workspace (modo CI). El engine ya
 * los declara en su SPEC §12; acá se comprueba que el artefacto commiteado no se
 * degradó a mano.
 *
 * LÍMITE DECLARADO: se verifica la ESTRUCTURA (grupos explícitos, retrieval
 * permitido y training bloqueado, sin wildcard), NO el mapa agente↔postura —
 * qué crawler pertenece a cada grupo vive en el registro del engine, y
 * duplicarlo acá sería una segunda fuente. Ese mapa lo prueba `policy-workspace`
 * (paridad byte a byte) o el `--check` del engine, que es su dueño.
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
    const groups = robotsGroups(robots);
    const hasRule = (group: RobotsGroup, key: string, value: string) =>
      group.rules.some((rule) => rule.key === key && rule.value === value);
    const allowsRoot = (group: RobotsGroup) => hasRule(group, "allow", "/");
    const disallowsRoot = (group: RobotsGroup) => hasRule(group, "disallow", "/");
    if (groups.some((group) => group.agents.includes("*"))) {
      problems.push("robots.txt: grupo `User-agent: *` — la política es explícita, sin wildcard");
    }
    if (!groups.some(allowsRoot)) {
      problems.push("robots.txt: sin grupo de retrieval (`Allow: /` dentro de un grupo con `User-agent`)");
    }
    if (!groups.some(disallowsRoot)) {
      problems.push("robots.txt: sin grupo de training (`Disallow: /` dentro de un grupo con `User-agent`)");
    }
    // Un grupo que mezcla `Allow: /` y `Disallow: /` invierte la postura: a
    // igual match el RFC 9309 §2.2.2 hace ganar `Allow`, así que el grupo
    // «bloqueado» terminaría permitiendo.
    if (groups.some((group) => allowsRoot(group) && disallowsRoot(group))) {
      problems.push(
        "robots.txt: un mismo grupo mezcla `Allow: /` y `Disallow: /` — la postura queda invertida (RFC 9309 §2.2.2)"
      );
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
