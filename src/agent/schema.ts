/**
 * Validación mínima de inputSchema (JSON Schema subset que usan los tools):
 * `type: object`, `properties` con `type: string|boolean`, `required`,
 * `additionalProperties: false`, `minLength`. Sin dependencias.
 *
 * Devuelve la lista de errores; vacía = input válido.
 */
export function validateInput(schema: Record<string, unknown>, input: unknown): string[] {
  const errors: string[] = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return ["input debe ser un objeto JSON"];
  }
  const record = input as Record<string, unknown>;
  const properties = (schema.properties ?? {}) as Record<string, { type?: string; minLength?: number }>;
  const required = (schema.required ?? []) as string[];
  for (const key of required) {
    if (!(key in record)) errors.push(`falta el campo requerido "${key}"`);
  }
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(record)) {
      if (!(key in properties)) errors.push(`campo desconocido "${key}"`);
    }
  }
  for (const [key, value] of Object.entries(record)) {
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
