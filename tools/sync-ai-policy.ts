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
 * Agrupa las directivas como las lee un crawler (RFC 9309 §2.1/§2.2.1):
 *
 * - un grupo empieza con una o más líneas `user-agent` y las reglas que siguen
 *   le pertenecen;
 * - un `user-agent` DESPUÉS de reglas abre un grupo nuevo;
 * - una línea en blanco o sólo-comentario es `emptyline`/`EOL` y **NO** termina
 *   el grupo (el ABNF la admite dentro de `group`); sólo lo termina un
 *   `user-agent` o el EOF;
 * - una regla antes del primer `user-agent` es inválida y se descarta.
 *
 * Pasar de «la directiva existe en el archivo» a «la directiva pertenece al
 * grupo efectivo del crawler» es lo que cierra la clase. Sondas que el gate NO
 * veía antes (pase 4): (1) un `Allow: /` después de una línea en blanco final
 * se cuelga del último grupo y, por §2.2.2, permite a los crawlers de training;
 * (2) un agente repetido en dos grupos combina sus reglas (§2.2.1) y queda
 * permitido; (3) un `User-agent:` vacío no nombra ningún product token.
 */
export function robotsGroups(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    // `emptyline` no termina el grupo (RFC 9309 §2.1: termina un `user-agent` o EOF).
    if (line.length === 0) continue;
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

/** `product-token = identifier / "*"` · `identifier = 1*(%x2D / %x41-5A / %x5F / %x61-7A)` */
const PRODUCT_TOKEN = /^(?:\*|[A-Za-z_-]+)$/;

/**
 * Conjunto de reglas **efectivo** por product token: RFC 9309 §2.2.1 manda
 * COMBINAR los grupos que matchean el mismo agente (case-insensitive) antes de
 * aplicar las reglas. Un agente que aparece dos veces no tiene dos grupos
 * separados: tiene la unión — y ahí es donde la postura se puede invertir sin
 * que el archivo lo diga.
 */
export function robotsAgents(text: string): Map<string, { key: string; value: string }[]> {
  const out = new Map<string, { key: string; value: string }[]>();
  for (const group of robotsGroups(text)) {
    for (const agent of group.agents) {
      const token = agent.toLowerCase();
      const rules = out.get(token) ?? [];
      rules.push(...group.rules);
      out.set(token, rules);
    }
  }
  return out;
}

/**
 * Invariantes de la postura, verificables SIN workspace (modo CI). El engine ya
 * los declara en su SPEC §12; acá se comprueba que el artefacto commiteado no se
 * degradó a mano.
 *
 * Se evalúa el conjunto EFECTIVO por agente (grupos combinados), no el grupo
 * sintáctico: un agente con `Allow: /` y `Disallow: /` en su unión queda
 * permitido por §2.2.2, aunque en el archivo los dos vivan en grupos distintos.
 *
 * LÍMITE DECLARADO: se verifica la ESTRUCTURA (postura explícita, un agente de
 * retrieval y otro de training sin contradicción, sin wildcard), NO el mapa
 * agente↔postura — qué crawler pertenece a cada grupo vive en el registro del
 * engine, y duplicarlo acá sería una segunda fuente. Ese mapa lo prueba
 * `policy-workspace` (paridad byte a byte) o el `--check` del engine (su dueño;
 * escalado en `ChristianLuciani/profile-as-code#477`).
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
    const agents = robotsAgents(robots);
    for (const token of agents.keys()) {
      if (!PRODUCT_TOKEN.test(token)) {
        problems.push(
          `robots.txt: \`User-agent:\` sin product token válido (${JSON.stringify(token)}) — el engine nunca emite uno vacío`
        );
      }
    }
    if (agents.has("*")) {
      problems.push("robots.txt: grupo `User-agent: *` — la política es explícita, sin wildcard");
    }
    const allowed: string[] = [];
    const blocked: string[] = [];
    const contradictory: string[] = [];
    for (const [token, rules] of agents) {
      if (token === "*") continue;
      const allowsRoot = rules.some((rule) => rule.key === "allow" && rule.value === "/");
      const disallowsRoot = rules.some((rule) => rule.key === "disallow" && rule.value === "/");
      if (allowsRoot && disallowsRoot) contradictory.push(token);
      else if (allowsRoot) allowed.push(token);
      else if (disallowsRoot) blocked.push(token);
    }
    if (contradictory.length) {
      problems.push(
        `robots.txt: ${contradictory.length} agente(s) con \`Allow: /\` y \`Disallow: /\` en su conjunto combinado ` +
          `(RFC 9309 §2.2.1/§2.2.2: a igual match gana Allow) — postura invertida: ${contradictory.slice(0, 5).join(", ")}`
      );
    }
    if (!allowed.length) problems.push("robots.txt: sin agente de retrieval (`Allow: /` exclusivo)");
    if (!blocked.length) problems.push("robots.txt: sin agente de training (`Disallow: /` exclusivo)");
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
