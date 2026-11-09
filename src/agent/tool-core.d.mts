/** Declaraciones del núcleo compartido de tools (tool-core.mjs). */
export class ToolError extends Error {}
export function norm(text: string): string;
export function validateInput(schema: Record<string, unknown>, input: unknown): string[];
export function applyTool(
  tool: { name: string; endpoint: string },
  args: Record<string, unknown> | undefined,
  data: Record<string, unknown>
): unknown;
