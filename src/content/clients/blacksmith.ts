/**
 * Blacksmith Agency — AI Automation Engineer (#145). Cliente real: la entrada
 * del laboratorio está dirigida a su equipo de reclutamiento y el preset del
 * Fit es el texto del aviso.
 *
 * Aviso: AI Automation Engineer (remote, Cuenca) — agentic workflows,
 * LangChain/LangGraph or equivalent, MCP server integrations, OpenAI/Anthropic
 * tool use, internal tools, REST/webhooks, 2+ years Python/Node, async English.
 */
import type { ClientLab } from "./types.ts";

export const blacksmith: ClientLab = {
  slug: "blacksmith",
  brand: "Blacksmith Agency",
  role: "AI Automation Engineer",
  locale: "en",
  entry: {
    eyebrow: {
      en: "Client lab · prepared for Blacksmith",
      es: "Laboratorio de cliente · preparado para Blacksmith"
    },
    title: {
      en: "Blacksmith, this lab is for you",
      es: "Blacksmith, este laboratorio es para ustedes"
    },
    lead: {
      en: "This is not a portfolio. It is a working demo of how I build: the data comes from the same profile that generates my CV, and every module here is consumable by an agent.",
      es: "Esto no es un portafolio. Es una demo funcional de cómo trabajo: los datos salen del mismo perfil que genera mi CV, y cada módulo es consumible por un agente."
    },
    cta: {
      en: "Enter the lab",
      es: "Entrar al laboratorio"
    }
  },
  theme: { accent: "#ff7a1a" },
  jd: `Agentic workflows · LangChain/LangGraph or equivalent · MCP server integrations ·
OpenAI/Anthropic tool use · internal tools · REST/webhooks · 2+ years Python/Node · async English`,
  modules: ["agent", "mcp", "fit", "provenance", "chat"],
  chat: {
    enabled: true,
    suggested: [
      "Do you have experience with MCP?",
      "What did you build at USFQ?",
      "Where are your gaps for this role?",
      "Show me a project with tool use."
    ]
  }
};
