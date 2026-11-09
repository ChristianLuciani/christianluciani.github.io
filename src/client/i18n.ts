/**
 * Copy del laboratorio de cliente (#145), EN/ES. Vive acá (y no en el pack de
 * temas) porque la página de cliente es una ruta aparte del museo: el lab
 * tiene su propio toggle de idioma. Los shells estáticos se renderizan con
 * el locale del cliente y el runtime (lab.ts) hace swap con `data-i18n`.
 */
export type LabLocale = "en" | "es";

export const LAB_I18N: Record<LabLocale, Record<string, string>> = {
  en: {
    "gate.note": "This area was prepared for the hiring team. No password — the lab is public but not indexed.",
    "lab.title": "Client lab",
    "lab.home": "christianluciani.github.io",
    "mod.agent.title": "Agent interface",
    "mod.agent.desc": "Deterministic tool contract over the public profile: JSON Schema + static REST endpoints.",
    "mod.agent.note": "Deterministic tool execution — no model call, no API key.",
    "mod.agent.run": "Run",
    "mod.agent.request": "Request",
    "mod.agent.response": "Response",
    "mod.mcp.title": "MCP server",
    "mod.mcp.desc": "A real stdio MCP server (Node, no network, no secrets) serving the same four tools from public/agent/*.json. It runs locally on your machine — this page only documents the contract.",
    "mod.mcp.snippet": "Client config (e.g. any MCP host):",
    "mod.mcp.copy": "Copy",
    "mod.mcp.copied": "Copied",
    "mod.fit.title": "Fit explorer",
    "mod.fit.desc": "Paste a job description. The matcher is deterministic over the public profile: evidence with links, or a declared gap. No LLM, no opaque score.",
    "mod.fit.preset": "Load this client's JD",
    "mod.fit.run": "Analyze",
    "mod.fit.placeholder": "Paste the job description here…",
    "mod.fit.summary": "requirements with evidence",
    "mod.fit.evidence": "evidence",
    "mod.fit.gap": "gap — not in the public profile",
    "mod.provenance.title": "Provenance",
    "mod.provenance.desc": "This page is output of a pipeline. The badge shows the exact source commit; Verify re-fetches the committed snapshot and checks three facts against this DOM.",
    "mod.provenance.verify": "Verify",
    "mod.provenance.checking": "Checking…",
    "mod.provenance.ok": "OK",
    "mod.provenance.fail": "FAIL",
    "mod.chat.title": "Chat (grounded)",
    "mod.chat.desc": "Answers come only from the public profile, via a server-side proxy — the API key never reaches the browser.",
    "mod.chat.disclaimer": "Demo: answers come from the public profile; do not share personal data. Free-tier models may log prompts.",
    "mod.chat.send": "Send",
    "mod.chat.placeholder": "Ask about the public profile… (max 300 chars)",
    "mod.chat.loading": "Thinking…",
    "mod.chat.unavailable": "Chat unavailable — see the profile and contact links instead.",
    "mod.chat.rateLimited": "Rate limit reached — try again later.",
    "mod.chat.error": "Something went wrong — the rest of the lab still works.",
    "foot.generated": "generated from"
  },
  es: {
    "gate.note": "Esta área fue preparada para el equipo de contratación. Sin contraseña — el laboratorio es público pero no indexado.",
    "lab.title": "Laboratorio de cliente",
    "lab.home": "christianluciani.github.io",
    "mod.agent.title": "Interfaz de agente",
    "mod.agent.desc": "Contrato de tools determinista sobre el perfil público: JSON Schema + endpoints REST estáticos.",
    "mod.agent.note": "Ejecución determinista de tools — sin llamada a modelo, sin API key.",
    "mod.agent.run": "Ejecutar",
    "mod.agent.request": "Request",
    "mod.agent.response": "Response",
    "mod.mcp.title": "Servidor MCP",
    "mod.mcp.desc": "Un servidor MCP real por stdio (Node, sin red, sin secretos) que sirve los mismos cuatro tools desde public/agent/*.json. Corre localmente en tu máquina — esta página solo documenta el contrato.",
    "mod.mcp.snippet": "Config del cliente (p. ej. cualquier host MCP):",
    "mod.mcp.copy": "Copiar",
    "mod.mcp.copied": "Copiado",
    "mod.fit.title": "Explorador de fit",
    "mod.fit.desc": "Pegá la descripción del puesto. El matcher es determinista sobre el perfil público: evidencia con links o un gap declarado. Sin LLM, sin score opaco.",
    "mod.fit.preset": "Cargar el aviso de este cliente",
    "mod.fit.run": "Analizar",
    "mod.fit.placeholder": "Pegá aquí la descripción del puesto…",
    "mod.fit.summary": "requisitos con evidencia",
    "mod.fit.evidence": "evidencia",
    "mod.fit.gap": "gap — no está en el perfil público",
    "mod.provenance.title": "Procedencia",
    "mod.provenance.desc": "Esta página es salida de un pipeline. La insignia muestra el commit exacto de la fuente; Verificar vuelve a pedir el snapshot commiteado y compara tres hechos con este DOM.",
    "mod.provenance.verify": "Verificar",
    "mod.provenance.checking": "Verificando…",
    "mod.provenance.ok": "OK",
    "mod.provenance.fail": "FALLO",
    "mod.chat.title": "Chat (grounded)",
    "mod.chat.desc": "Las respuestas salen solo del perfil público, vía un proxy server-side — la API key nunca llega al navegador.",
    "mod.chat.disclaimer": "Demo: las respuestas salen del perfil público; no compartas datos personales. Los modelos free pueden registrar prompts.",
    "mod.chat.send": "Enviar",
    "mod.chat.placeholder": "Preguntá sobre el perfil público… (máx 300 caracteres)",
    "mod.chat.loading": "Pensando…",
    "mod.chat.unavailable": "Chat no disponible — mirá el perfil y los enlaces de contacto.",
    "mod.chat.rateLimited": "Límite de pedidos alcanzado — probá más tarde.",
    "mod.chat.error": "Algo salió mal — el resto del laboratorio sigue funcionando.",
    "foot.generated": "generado desde"
  }
};

export function labT(locale: LabLocale, key: string): string {
  const value = LAB_I18N[locale]?.[key] ?? LAB_I18N.en[key];
  if (!value) throw new Error(`lab i18n: falta la clave "${key}"`);
  return value;
}
