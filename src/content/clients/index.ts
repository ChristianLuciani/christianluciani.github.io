/**
 * Registro de laboratorios de cliente (#145): un slug por cliente. Para
 * agregar un cliente: crear `acme.ts` y registrarlo acá. Nada más.
 */
import { blacksmith } from "./blacksmith.ts";
import { example } from "./example.ts";
import { validateClient, type ClientLab } from "./types.ts";

export const CLIENTS: Readonly<Record<string, ClientLab>> = {
  [blacksmith.slug]: blacksmith,
  [example.slug]: example
};

export function clientSlugs(): string[] {
  return Object.keys(CLIENTS).sort();
}

export function getClient(slug: string): ClientLab {
  const client = CLIENTS[slug];
  if (!client) {
    throw new Error(`cliente desconocido "${slug}" (válidos: ${clientSlugs().join(", ")})`);
  }
  return client;
}

/** Valida TODO el registro; lanza con todos los problemas si alguno falla. */
export function validateClients(): void {
  const problems = clientSlugs().flatMap((slug) =>
    validateClient(CLIENTS[slug]).map((problem) => `${slug}: ${problem}`)
  );
  if (problems.length > 0) {
    throw new Error(`config de clientes inválida:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
}

export { validateClient, CLIENT_MODULES, type ClientLab, type ClientModuleId } from "./types.ts";
