/**
 * Cliente de prueba genérico (#145): existe para probar en CI que el sistema
 * es paramétrico — `/clients/example/` se genera sin tocar ningún template ni
 * hardcodear "blacksmith" en ningún lado.
 */
import type { ClientLab } from "./types.ts";

export const example: ClientLab = {
  slug: "example",
  brand: "Example Co",
  role: "Plataforma de demo",
  locale: "es",
  // Cliente de prueba: se genera y sirve por URL directa, pero no se lista en /clients/.
  unlisted: true,
  entry: {
    eyebrow: {
      en: "Client lab · example client",
      es: "Laboratorio de cliente · cliente de ejemplo"
    },
    title: {
      en: "This page proves the lab is parametric",
      es: "Esta página prueba que el laboratorio es paramétrico"
    },
    lead: {
      en: "Every string, color, JD and module on this page comes from a config file, not from a template. Adding a client means adding one file and one registry entry.",
      es: "Cada texto, color, aviso y módulo de esta página viene de un archivo de configuración, no de una plantilla. Agregar un cliente es agregar un archivo y una entrada en el registro."
    },
    cta: {
      en: "Enter the lab",
      es: "Entrar al laboratorio"
    }
  },
  theme: { accent: "#7a5cff" },
  jd: `Agentic workflows · MCP · internal tools · REST/webhooks · Python/Node`,
  modules: ["agent", "mcp", "fit", "provenance", "chat"],
  chat: {
    enabled: true,
    suggested: [
      { en: "Do you have experience with MCP?", es: "¿Tienes experiencia con MCP?" },
      { en: "What did you build at USFQ?", es: "¿Qué construiste en la USFQ?" },
      { en: "Where are your gaps for this role?", es: "¿Dónde están tus brechas para este rol?" }
    ]
  }
};
