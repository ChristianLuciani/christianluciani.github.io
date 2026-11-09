/**
 * Módulo "Agent interface" (#145 §2.1): consola que ejecuta los tool calls
 * contra los endpoints estáticos del perfil público. Determinista — no hay
 * llamada a modelo ni API key (el copy lo dice en la UI).
 *
 * El contrato (manifest) se PIDE al sitio servido (/agent/manifest.json): el
 * bundle del lab no importa el export de build (que en Node lee provenance con
 * node:fs y reventaría en el navegador).
 */
import { runTool, fetchLoader } from "../agent/execute.ts";
import { publicUrl } from "../agent/urls.ts";
import type { AgentManifest, AgentTool } from "../agent/export.ts";

async function loadManifest(): Promise<Map<string, AgentTool>> {
  const response = await fetch(publicUrl("/agent/manifest.json"));
  if (!response.ok) throw new Error(`manifest.json → ${response.status}`);
  const manifest = (await response.json()) as AgentManifest;
  return new Map(manifest.tools.map((t) => [t.name, t]));
}

export function mountAgentConsole(root: Element): void {
  void (async () => {
    let tools: Map<string, AgentTool>;
    try {
      tools = await loadManifest();
    } catch (error) {
      const note = root.querySelector(".lab-note");
      if (note) note.textContent = `agent manifest unavailable: ${error instanceof Error ? error.message : String(error)}`;
      return;
    }
    for (const card of root.querySelectorAll<HTMLElement>(".tool-card")) {
      const tool = tools.get(card.dataset.tool ?? "");
      if (!tool) continue;
      const input = card.querySelector<HTMLTextAreaElement>(".tool-input");
      const run = card.querySelector<HTMLButtonElement>(".tool-run");
      const out = card.querySelector<HTMLElement>(".tool-out");
      const req = card.querySelector<HTMLElement>(".tool-req");
      const res = card.querySelector<HTMLElement>(".tool-res");
      if (!input || !run || !out || !req || !res) continue;
      run.addEventListener("click", () => {
        void (async () => {
          out.hidden = false;
          res.classList.remove("tool-error");
          let parsed: unknown;
          try {
            parsed = JSON.parse(input.value);
          } catch {
            req.textContent = input.value;
            res.textContent = "invalid JSON input";
            res.classList.add("tool-error");
            return;
          }
          req.textContent = `GET ${tool.endpoint} · ${tool.name} ${JSON.stringify(parsed)}`;
          try {
            const result = await runTool(tool, parsed, fetchLoader);
            res.textContent = JSON.stringify(result, null, 2);
          } catch (error) {
            res.textContent = error instanceof Error ? error.message : String(error);
            res.classList.add("tool-error");
          }
        })();
      });
    }
  })();
}
