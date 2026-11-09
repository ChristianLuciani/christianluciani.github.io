/**
 * Tests de protocolo del servidor MCP (#145 §2.2): spawnea `node mcp/server.mjs`
 * y habla JSON-RPC por stdio. Sin dependencias (node:test).
 */
import { spawn } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";

function startServer() {
  const child = spawn(process.execPath, ["mcp/server.mjs"], { stdio: ["pipe", "pipe", "pipe"] });
  const pending = new Map();
  let buffer = "";
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      const message = JSON.parse(line);
      const resolve = pending.get(message.id);
      if (resolve) {
        pending.delete(message.id);
        resolve(message);
      }
    }
  });
  let nextId = 1;
  const rpc = (method, params) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, resolve);
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      setTimeout(() => reject(new Error(`timeout en ${method}`)), 5000);
    });
  return { child, rpc };
}

test("initialize + tools/list + tools/call (ok) + input inválido", async (t) => {
  const { child, rpc } = startServer();
  t.after(() => child.kill());

  const init = await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "0" } });
  assert.equal(init.result.serverInfo.name, "christianluciani-profile");
  assert.ok(init.result.capabilities.tools);

  const list = await rpc("tools/list");
  const names = list.result.tools.map((tool) => tool.name).sort();
  assert.deepEqual(names, ["get_profile", "get_project", "list_projects", "search_publications"]);
  for (const tool of list.result.tools) {
    assert.equal(tool.inputSchema.type, "object");
    assert.ok(tool.endpoint.startsWith("/agent/"));
  }

  const project = await rpc("tools/call", { name: "get_project", arguments: { name: "kontablo" } });
  assert.equal(project.result.isError, undefined);
  const parsed = JSON.parse(project.result.content[0].text);
  assert.match(parsed.name, /Kontablo/);
  assert.ok(parsed.links[0].startsWith("https://"));

  const pubs = await rpc("tools/call", { name: "search_publications", arguments: { query: "caffeine" } });
  assert.match(pubs.result.content[0].text, /caffeine/i);

  const profile = await rpc("tools/call", { name: "get_profile", arguments: {} });
  assert.match(profile.result.content[0].text, /Christian Luciani/);

  const missing = await rpc("tools/call", { name: "get_project", arguments: {} });
  assert.equal(missing.result.isError, true);
  assert.match(missing.result.content[0].text, /name/);

  const unknownField = await rpc("tools/call", { name: "get_project", arguments: { name: "x", otro: 1 } });
  assert.equal(unknownField.result.isError, true);

  const unknownTool = await rpc("tools/call", { name: "nope", arguments: {} });
  assert.equal(unknownTool.result.isError, true);

  const unknownMethod = await rpc("recursos/list", {});
  assert.equal(unknownMethod.error.code, -32601);
});
