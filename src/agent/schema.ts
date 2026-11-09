/**
 * Validación de inputSchema — re-export del núcleo compartido
 * (`tool-core.mjs`) para que el lab (TS) y el servidor MCP (mjs) usen LA
 * MISMA implementación y no diverjan (#145).
 */
export { validateInput } from "./tool-core.mjs";
