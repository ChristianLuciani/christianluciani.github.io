/**
 * build-agent — CLI fino sobre src/agent/write.ts: escribe los artefactos de
 * `public/agent/` desde PROFILE (#145 §2.1/§2.5).
 *
 * Determinista (mismo PROFILE → mismos bytes). Los archivos se commitean y el
 * test de drift (`src/agent/agent.test.ts`) compara los bytes commiteados con
 * los regenerados. `build.ts` también los regenera antes de cada build.
 *
 * Uso: tsx tools/build-agent.ts [--check]
 *   --check  no escribe: falla (exit 1) si hay drift contra lo commiteado.
 */
import { checkAgentFiles, writeAgentFiles } from "../src/agent/write.ts";

function main(): void {
  const check = process.argv.includes("--check");
  if (check) {
    const drifted = checkAgentFiles();
    if (drifted.length > 0) {
      console.error(`agent: drift en ${drifted.join(", ")} — corré \`npm run build:agent\``);
      process.exit(1);
    }
    console.log("✅ public/agent/ sin drift");
    return;
  }
  for (const file of writeAgentFiles()) console.log(`✅ ${file}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
