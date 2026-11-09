/**
 * Ejecución determinista de tools contra los endpoints estáticos de
 * `public/agent/` (#145 §2.1). Sin modelo, sin API key: el "tool call" es un
 * GET al endpoint del manifiesto + el filtro declarado por el inputSchema.
 * La validación y el dispatch viven en el núcleo compartido `tool-core.mjs`
 * (el mismo que usa mcp/server.mjs).
 */
import { applyTool, ToolError, validateInput } from "./tool-core.mjs";
import { publicUrl } from "./urls.ts";
import type { AgentTool } from "./export.ts";

export { ToolError };

export type JsonLoader = (url: string) => Promise<unknown>;

/** fetch de navegador como loader por defecto (GET; rutas bajo el base del artefacto). */
export const fetchLoader: JsonLoader = async (url) => {
  const response = await fetch(publicUrl(url));
  if (!response.ok) throw new Error(`endpoint ${url} respondió ${response.status}`);
  return response.json();
};

/**
 * Ejecuta un tool del manifiesto. `loader` inyectable para tests (node lee
 * los archivos de `public/agent/` directo).
 */
export async function runTool(
  tool: AgentTool,
  input: unknown,
  loader: JsonLoader = fetchLoader
): Promise<unknown> {
  const errors = validateInput(tool.inputSchema, input);
  if (errors.length > 0) {
    throw new ToolError(`input inválido para ${tool.name}: ${errors.join("; ")}`);
  }
  const data = (await loader(tool.endpoint)) as Record<string, unknown>;
  return applyTool(tool, (input ?? {}) as Record<string, unknown>, data);
}
