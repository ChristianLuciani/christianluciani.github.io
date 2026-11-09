/**
 * Escritura de los artefactos de public/agent/ (#145). Vive en src/ (y no en
 * tools/) porque build.ts lo importa: el gate "cero red" exige que el grafo
 * de imports del build no toque tools/. `tools/build-agent.ts` es el CLI fino
 * que llama a estas funciones.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { agentFiles } from "./export.ts";

export function writeAgentFiles(root = process.cwd()): string[] {
  const files = agentFiles();
  const written: string[] = [];
  for (const [relative, bytes] of Object.entries(files)) {
    const file = resolve(root, relative);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes, "utf8");
    written.push(relative);
  }
  return written;
}

export function checkAgentFiles(root = process.cwd()): string[] {
  const files = agentFiles();
  const drifted: string[] = [];
  for (const [relative, bytes] of Object.entries(files)) {
    const file = resolve(root, relative);
    if (!existsSync(file) || readFileSync(file, "utf8") !== bytes) drifted.push(relative);
  }
  return drifted;
}
