/**
 * Núcleo compartido de tools (plain JS, sin dependencias) — UNA sola fuente
 * para el servidor MCP (mcp/server.mjs) y la consola del lab
 * (src/agent/execute.ts), así la validación y el dispatch no divergen (#145).
 *
 * `validateInput`: subset de JSON Schema que usan los tools (`type: object`,
 * `properties` con type string|boolean|number, `required`,
 * `additionalProperties: false`, `minLength`). Devuelve errores; vacío = OK.
 *
 * `applyTool`: aplica un tool del manifest sobre el JSON ya cargado de su
 * endpoint. Lanza ToolError con mensaje claro.
 */
export class ToolError extends Error {}

export function norm(text) {
  return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function validateInput(schema, input) {
  const errors = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return ["input debe ser un objeto JSON"];
  }
  const properties = schema.properties ?? {};
  const required = schema.required ?? [];
  for (const key of required) {
    if (!(key in input)) errors.push(`falta el campo requerido "${key}"`);
  }
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(input)) {
      if (!(key in properties)) errors.push(`campo desconocido "${key}"`);
    }
  }
  for (const [key, value] of Object.entries(input)) {
    const prop = properties[key];
    if (!prop) continue;
    if (prop.type === "string") {
      if (typeof value !== "string") {
        errors.push(`"${key}" debe ser string`);
      } else if (prop.minLength !== undefined && value.length < prop.minLength) {
        errors.push(`"${key}" debe tener al menos ${prop.minLength} caracteres`);
      }
    } else if (prop.type === "boolean" && typeof value !== "boolean") {
      errors.push(`"${key}" debe ser boolean`);
    } else if (prop.type === "number" && typeof value !== "number") {
      errors.push(`"${key}" debe ser number`);
    }
  }
  return errors;
}

/** Aplica `tool` con `args` ya validados sobre `data` (el JSON de su endpoint). */
export function applyTool(tool, args, data) {
  const a = args ?? {};
  switch (tool.name) {
    case "get_profile":
      return data;
    case "list_projects": {
      const projects = data.projects ?? [];
      return typeof a.published === "boolean" ? projects.filter((p) => p.published === a.published) : projects;
    }
    case "get_project": {
      const needle = norm(a.name);
      const found = (data.projects ?? []).find((p) => norm(p.name).includes(needle));
      if (!found) throw new ToolError(`no hay proyecto que contenga "${String(a.name)}"`);
      return found;
    }
    case "search_publications": {
      const needle = norm(a.query);
      return (data.publications ?? []).filter((p) => norm(p.title).includes(needle) || norm(p.venue).includes(needle));
    }
    default:
      throw new ToolError(`tool desconocido "${tool.name}"`);
  }
}
