#!/usr/bin/env node
/**
 * MCP server (stdio) del perfil público (#145 §2.2).
 *
 * Node estándar, sin dependencias, sin red, sin secretos: sirve los mismos
 * cuatro tools del manifiesto de public/agent/manifest.json leyendo los JSON
 * commiteados de public/agent/. Transporte stdio con JSON-RPC 2.0 delimitado
 * por líneas (newline-delimited), como espera el protocolo MCP.
 *
 * Config de cualquier host MCP:
 *   { "mcpServers": { "profile": { "command": "node", "args": ["mcp/server.mjs"] } } }
 *
 * Tests de protocolo: npm run test:mcp  (node --test mcp/server.test.mjs)
 */
import { createInterface } from "node:readline";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
// Núcleo compartido con la consola del lab: misma validación y mismo dispatch.
import { applyTool, ToolError, validateInput } from "../src/agent/tool-core.mjs";

const AGENT_DIR = new URL("../public/agent/", import.meta.url);

const manifest = JSON.parse(readFileSync(new URL("manifest.json", AGENT_DIR), "utf8"));
const DATA = {
  "/agent/profile.json": () => JSON.parse(readFileSync(new URL("profile.json", AGENT_DIR), "utf8")),
  "/agent/projects.json": () => JSON.parse(readFileSync(new URL("projects.json", AGENT_DIR), "utf8")),
  "/agent/publications.json": () => JSON.parse(readFileSync(new URL("publications.json", AGENT_DIR), "utf8"))
};

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: manifest.name, version: manifest.version };

function callTool(name, args) {
  const tool = manifest.tools.find((t) => t.name === name);
  if (!tool) return { isError: true, content: [{ type: "text", text: `tool desconocido "${name}"` }] };
  const errors = validateInput(tool.inputSchema, args ?? {});
  if (errors.length > 0) {
    return { isError: true, content: [{ type: "text", text: `input inválido: ${errors.join("; ")}` }] };
  }
  try {
    const result = applyTool(tool, args ?? {}, DATA[tool.endpoint]());
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: error instanceof ToolError ? error.message : String(error) }] };
  }
}

function handleMessage(message) {
  const { id, method, params } = message;
  if (method === "notifications/initialized" || method === "notifications/cancelled") return null;
  if (id === undefined || id === null) return null; // notificación sin respuesta
  switch (method) {
    case "initialize":
      return { jsonrpc: "2.0", id, result: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO } };
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: manifest.tools } };
    case "tools/call":
      return { jsonrpc: "2.0", id, result: callTool(params?.name, params?.arguments) };
    default:
      return { jsonrpc: "2.0", id, error: { code: -32601, message: `método desconocido "${method}"` } };
  }
}

export function createServer(input, output) {
  const rl = createInterface({ input, terminal: false });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let message;
    try {
      message = JSON.parse(trimmed);
    } catch {
      output.write(`${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } })}\n`);
      return;
    }
    const response = handleMessage(message);
    if (response) output.write(`${JSON.stringify(response)}\n`);
  });
  return rl;
}

/* Ejecución directa: node mcp/server.mjs (detección por realpath, no por string). */
const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
})();
if (isMain) {
  createServer(process.stdin, process.stdout);
}
