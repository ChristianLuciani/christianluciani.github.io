/**
 * Shell del laboratorio (#145): lee el config embebido (#lab-config), el
 * gate de entrada, el toggle EN/ES y monta los módulos declarados por el
 * cliente. Toda la lógica pesada vive en módulos puros (src/agent, src/fit);
 * acá sólo hay wiring de DOM.
 */
import { LAB_I18N, type LabLocale } from "./i18n.ts";
import { mountAgentConsole } from "./agent-console.ts";
import { mountFit } from "./fit.ts";
import { mountProvenance } from "./provenance.ts";
import { mountChat } from "./chat.ts";

export interface LabConfig {
  slug: string;
  brand: string;
  role: string;
  locale: LabLocale;
  jd: string;
  modules: string[];
  chat: { enabled: boolean; endpoint: string; suggested: { en: string; es?: string }[] };
  accent: string;
}

export function readLabConfig(doc: Document = document): LabConfig | null {
  const node = doc.getElementById("lab-config");
  if (!node?.textContent) return null;
  try {
    return JSON.parse(node.textContent) as LabConfig;
  } catch {
    return null;
  }
}

/** Aplica el idioma: nodos con data-i18n (texto), data-i18n-ph (placeholder) y data-es/data-en (gate). */
export function applyLocale(locale: LabLocale, doc: Document = document): void {
  doc.documentElement.lang = locale;
  const dict = LAB_I18N[locale];
  for (const el of doc.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = el.dataset.i18n;
    if (key && dict[key]) el.textContent = dict[key];
  }
  for (const el of doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-i18n-ph]")) {
    const key = el.dataset.i18nPh;
    if (key && dict[key]) el.placeholder = dict[key];
  }
  for (const el of doc.querySelectorAll<HTMLElement>("[data-es][data-en]")) {
    el.textContent = locale === "es" ? el.dataset.es ?? el.textContent : el.dataset.en ?? el.textContent;
  }
  const toggle = doc.getElementById("lab-lang");
  if (toggle) toggle.textContent = locale === "es" ? "EN" : "ES";
}

export function bootLab(doc: Document = document): void {
  const config = readLabConfig(doc);
  if (!config) return;
  let locale: LabLocale = config.locale === "es" ? "es" : "en";

  const gate = doc.getElementById("lab-gate");
  const lab = doc.getElementById("lab");
  const enter = doc.getElementById("lab-enter");
  enter?.addEventListener("click", () => {
    if (gate) gate.hidden = true;
    if (lab) lab.hidden = false;
  });

  doc.getElementById("lab-lang")?.addEventListener("click", () => {
    locale = locale === "es" ? "en" : "es";
    applyLocale(locale, doc);
  });

  const labRoot = lab ?? doc.body;
  if (config.modules.includes("agent")) {
    const el = labRoot.querySelector('[data-module="agent"]');
    if (el) mountAgentConsole(el);
  }
  if (config.modules.includes("fit")) {
    const el = labRoot.querySelector('[data-module="fit"]');
    if (el) mountFit(el, config, () => locale);
  }
  if (config.modules.includes("provenance")) {
    const el = labRoot.querySelector('[data-module="provenance"]');
    if (el) mountProvenance(el, doc, () => locale);
  }
  if (config.modules.includes("chat")) {
    const el = labRoot.querySelector('[data-module="chat"]');
    if (el) void mountChat(el, config, () => locale);
  }

  const mcpCopy = doc.getElementById("mcp-copy");
  const snippet = doc.getElementById("mcp-snippet");
  mcpCopy?.addEventListener("click", async () => {
    if (!snippet?.textContent) return;
    try {
      await navigator.clipboard.writeText(snippet.textContent);
      mcpCopy.textContent = LAB_I18N[locale]["mod.mcp.copied"];
    } catch {
      /* clipboard no disponible: el snippet queda visible igual */
    }
  });
}
