/**
 * Módulo "Chat grounded" (#145 §2.5). Front-end ONLY: la API key vive en el
 * proxy server-side (workers/chat), nunca acá. SSE desde v1 con fallback JSON
 * si el navegador no soporta streaming; estados loading/429/5xx/offline con
 * fallback "chat unavailable" — el resto del laboratorio sigue funcionando.
 */
import { extractCitations } from "../agent/citations.ts";
import { publicUrl } from "../agent/urls.ts";
import { LAB_I18N, type LabLocale } from "./i18n.ts";
import type { LabConfig } from "./lab.ts";

const MAX_INPUT_CHARS = 300;
const MAX_USER_TURNS = 4;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

function bubble(root: HTMLElement, role: "user" | "assistant" | "system", text: string): HTMLElement {
  const el = document.createElement("div");
  el.className = `chat-msg ${role}`;
  el.textContent = text;
  root.append(el);
  root.scrollTop = root.scrollHeight;
  return el;
}

function addCitations(el: HTMLElement, text: string, sectionIds: readonly string[]): void {
  const citations = extractCitations(text, sectionIds);
  if (citations.length === 0) return;
  const row = document.createElement("div");
  row.className = "chat-cites";
  for (const id of citations) {
    const chip = document.createElement("span");
    chip.className = "chat-cite";
    chip.textContent = id;
    row.append(chip);
  }
  el.append(row);
}

async function loadSectionIds(): Promise<string[]> {
  try {
    const response = await fetch(publicUrl("/agent/chat-context.json"));
    if (!response.ok) return [];
    const json = (await response.json()) as { sections?: { id: string }[] };
    return (json.sections ?? []).map((s) => s.id);
  } catch {
    return [];
  }
}

async function postChat(
  endpoint: string,
  turns: readonly ChatTurn[],
  streaming: boolean,
  onDelta: (delta: string) => void
): Promise<{ status: number; content: string }> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: streaming ? "text/event-stream" : "application/json"
    },
    body: JSON.stringify({ messages: turns })
  });
  if (!response.ok) {
    return { status: response.status, content: "" };
  }
  if (!streaming || !response.body) {
    const json = (await response.json()) as { message?: { content?: string }; content?: string };
    const content = json.message?.content ?? json.content ?? "";
    onDelta(content);
    return { status: 200, content };
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index: number;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return { status: 200, content };
      try {
        const chunk = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
        const delta = chunk.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          content += delta;
          onDelta(delta);
        }
      } catch {
        /* línea de keep-alive o chunk parcial: se ignora */
      }
    }
  }
  return { status: 200, content };
}

export async function mountChat(
  root: Element,
  config: LabConfig,
  getLocale: () => LabLocale
): Promise<void> {
  const messagesEl = root.querySelector<HTMLElement>("#chat-messages");
  const input = root.querySelector<HTMLInputElement>("#chat-input");
  const send = root.querySelector<HTMLButtonElement>("#chat-send");
  if (!messagesEl || !input || !send) return;
  const endpoint =
    config.chat.endpoint || (import.meta.env.VITE_CHAT_ENDPOINT as string | undefined) || "";
  const sectionIds = await loadSectionIds();
  const history: ChatTurn[] = [];

  const dict = (): Record<string, string> => LAB_I18N[getLocale()];
  const streaming = typeof ReadableStream !== "undefined";

  if (!config.chat.enabled || !endpoint) {
    bubble(messagesEl, "system", dict()["mod.chat.unavailable"]);
    input.disabled = true;
    send.disabled = true;
    return;
  }

  const sendMessage = async (): Promise<void> => {
    const text = input.value.trim();
    if (!text || text.length > MAX_INPUT_CHARS) return;
    if (history.filter((m) => m.role === "user").length >= MAX_USER_TURNS) {
      bubble(messagesEl, "system", dict()["mod.chat.rateLimited"]);
      return;
    }
    input.value = "";
    send.disabled = true;
    bubble(messagesEl, "user", text);
    const assistantEl = bubble(messagesEl, "assistant", dict()["mod.chat.loading"]);
    const turns: ChatTurn[] = [...history, { role: "user", content: text }];
    let assembled = "";
    try {
      const result = await postChat(endpoint, turns, streaming, (delta) => {
        if (assembled === "") assistantEl.textContent = "";
        assembled += delta;
        assistantEl.textContent = assembled;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
      if (result.status === 429) {
        assistantEl.className = "chat-msg system";
        assistantEl.textContent = dict()["mod.chat.rateLimited"];
        return;
      }
      if (result.status !== 200 || !assembled) {
        assistantEl.className = "chat-msg system";
        assistantEl.textContent = dict()["mod.chat.unavailable"];
        return;
      }
      addCitations(assistantEl, assembled, sectionIds);
      history.push({ role: "user", content: text }, { role: "assistant", content: assembled });
    } catch {
      assistantEl.className = "chat-msg system";
      assistantEl.textContent = dict()["mod.chat.unavailable"];
    } finally {
      send.disabled = false;
      input.focus();
    }
  };

  send.addEventListener("click", () => void sendMessage());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") void sendMessage();
  });
  input.maxLength = MAX_INPUT_CHARS;
  for (const button of root.querySelectorAll<HTMLButtonElement>(".chat-suggested")) {
    button.addEventListener("click", () => {
      input.value = button.textContent ?? "";
      void sendMessage();
    });
  }
}
