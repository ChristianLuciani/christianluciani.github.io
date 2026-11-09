/**
 * Ejecución determinista de tools contra los endpoints estáticos de
 * `public/agent/` (#145 §2.1). Sin modelo, sin API key: el "tool call" es un
 * GET al endpoint del manifiesto + el filtro declarado por el inputSchema.
 */
import { validateInput } from "./schema.ts";
import { publicUrl } from "./urls.ts";
import type { AgentTool } from "./export.ts";

export type JsonLoader = (url: string) => Promise<unknown>;

/** fetch de navegador como loader por defecto (GET; rutas bajo el base del artefacto). */
export const fetchLoader: JsonLoader = async (url) => {
  const response = await fetch(publicUrl(url));
  if (!response.ok) throw new Error(`endpoint ${url} respondió ${response.status}`);
  return response.json();
};

function norm(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export class ToolError extends Error {}

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
  const args = (input ?? {}) as Record<string, unknown>;
  const data = (await loader(tool.endpoint)) as Record<string, unknown>;
  switch (tool.name) {
    case "get_profile":
      return data;
    case "list_projects": {
      const projects = (data.projects ?? []) as { published?: boolean }[];
      if (typeof args.published === "boolean") {
        return projects.filter((p) => p.published === args.published);
      }
      return projects;
    }
    case "get_project": {
      const projects = (data.projects ?? []) as { name: string }[];
      const needle = norm(String(args.name));
      const found = projects.find((p) => norm(p.name).includes(needle));
      if (!found) throw new ToolError(`no hay proyecto que contenga "${String(args.name)}"`);
      return found;
    }
    case "search_publications": {
      const publications = (data.publications ?? []) as { title: string; venue: string }[];
      const needle = norm(String(args.query));
      return publications.filter(
        (p) => norm(p.title).includes(needle) || norm(p.venue).includes(needle)
      );
    }
    default:
      throw new ToolError(`tool desconocido "${tool.name}"`);
  }
}
