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
import { readFileSync } from "node:fs";

const AGENT_DIR = new URL("../public/agent/", import.meta.url);

const manifest = JSON.parse(readFileSync(new URL("manifest.json", AGENT_DIR), "utf8"));
const DATA = {
  "/agent/profile.json": () => JSON.parse(readFileSync(new URL("profile.json", AGENT_DIR), "utf8")),
  "/agent/projects.json": () => JSON.parse(readFileSync(new URL("projects.json", AGENT_DIR), "utf8")),
  "/agent/publications.json": () => JSON.parse(readFileSync(new URL("publications.json", AGENT_DIR), "utf8"))
};

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: manifest.name, version: manifest.version };

function norm(text) {
  return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function validateInput(schema, input) {
  const errors = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return ["arguments debe ser un objeto"];
  }
  const props = schema.properties ?? {};
  for (const key of schema.required ?? []) {
    if (!(key in input)) errors.push(`falta el campo requerido "${key}"`);
  }
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(input)) {
      if (!(key in props)) errors.push(`campo desconocido "${key}"`);
    }
  }
  for (const [key, value] of Object.entries(input)) {
    const prop = props[key];
    if (!prop) continue;
    if (prop.type === "string" && (typeof value !== "string" || (prop.minLength && value.length < prop.minLength))) {
      errors.push(`"${key}" debe ser string${prop.minLength ? ` (mín ${prop.minLength})` : ""}`);
    }
    if (prop.type === "boolean" && typeof value !== "boolean") errors.push(`"${key}" debe ser boolean`);
  }
  return errors;
}

function callTool(name, args) {
  const tool = manifest.tools.find((t) => t.name === name);
  if (!tool) return { isError: true, content: [{ type: "text", text: `tool desconocido "${name}"` }] };
  const errors = validateInput(tool.inputSchema, args ?? {});
  if (errors.length > 0) {
    return { isError: true, content: [{ type: "text", text: `input inválido: ${errors.join("; ")}` }] };
  }
  const data = DATA[tool.endpoint]();
  let result;
  switch (name) {
    case "get_profile":
      result = data;
      break;
    case "list_projects": {
      const projects = data.projects ?? [];
      result = typeof args.published === "boolean" ? projects.filter((p) => p.published === args.published) : projects;
      break;
    }
    case "get_project": {
      const needle = norm(args.name);
      const found = (data.projects ?? []).find((p) => norm(p.name).includes(needle));
      if (!found) return { isError: true, content: [{ type: "text", text: `no hay proyecto que contenga "${args.name}"` }] };
      result = found;
      break;
    }
    case "search_publications": {
      const needle = norm(args.query);
      result = (data.publications ?? []).filter((p) => norm(p.title).includes(needle) || norm(p.venue).includes(needle));
      break;
    }
    default:
      return { isError: true, content: [{ type: "text", text: `tool no implementado "${name}"` }] };
  }
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
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

/* Ejecución directa: node mcp/server.mjs */
if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(process.stdin, process.stdout);
}
