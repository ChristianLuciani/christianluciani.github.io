/**
 * Módulo "Agent interface" (#145 §2.1): consola que ejecuta los tool calls
 * contra los endpoints estáticos del perfil público. Determinista — no hay
 * llamada a modelo ni API key (el copy lo dice en la UI).
 */
import { runTool, fetchLoader } from "../agent/execute.ts";
import { agentManifest, type AgentTool } from "../agent/export.ts";

export function mountAgentConsole(root: Element): void {
  const tools = new Map<string, AgentTool>(agentManifest().tools.map((t) => [t.name, t]));
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
        req.textContent = `POST ${tool.endpoint} · ${tool.name} ${JSON.stringify(parsed)}`;
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
}
