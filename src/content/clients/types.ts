/**
 * ClientLab — contrato de configuración de un laboratorio de cliente (#145).
 *
 * Un cliente = un archivo en este directorio + una entrada en `index.ts`. El
 * slug es la ruta: `/clients/<slug>/`. Ningún template conoce un slug: todo
 * (entry copy, tema, JD, módulos, chat) viene de este config.
 */
import type { LangText } from "../../data/profile.types.ts";

/** Módulos del laboratorio, en el orden en que se renderizan. */
export type ClientModuleId = "agent" | "mcp" | "fit" | "provenance" | "chat";

export const CLIENT_MODULES: readonly ClientModuleId[] = [
  "agent",
  "mcp",
  "fit",
  "provenance",
  "chat"
] as const;

export interface ClientEntryCopy {
  eyebrow: LangText;
  title: LangText;
  lead: LangText;
  cta: LangText;
}

export interface ClientChat {
  enabled: boolean;
  /** Endpoint del proxy (Cloudflare Worker). Vacío = el módulo degrada a
   *  "chat unavailable"; también se puede fijar con VITE_CHAT_ENDPOINT. */
  endpoint?: string;
  suggested: string[];
}

export interface ClientLab {
  /** Ruta: `/clients/<slug>/`. Solo `[a-z0-9-]+`. */
  slug: string;
  brand: string;
  role: string;
  locale: "en" | "es";
  entry: ClientEntryCopy;
  theme: { accent: string };
  /** JD del aviso, preset del módulo Fit. */
  jd: string;
  modules: readonly ClientModuleId[];
  chat: ClientChat;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Problemas de un ClientLab; vacío = válido. Pure, testeable sin build. */
export function validateClient(client: ClientLab): string[] {
  const problems: string[] = [];
  if (!SLUG_RE.test(client.slug)) {
    problems.push(`slug "${client.slug}" inválido ([a-z0-9-], sin espacios ni mayúsculas)`);
  }
  if (!client.brand.trim()) problems.push("brand vacío");
  if (!client.role.trim()) problems.push("role vacío");
  if (client.locale !== "en" && client.locale !== "es") {
    problems.push(`locale "${client.locale}" inválido (en|es)`);
  }
  if (!HEX_RE.test(client.theme.accent)) {
    problems.push(`theme.accent "${client.theme.accent}" inválido (#rrggbb)`);
  }
  for (const key of ["eyebrow", "title", "lead", "cta"] as const) {
    const value = client.entry[key];
    if (!value.en.trim() || !value.es?.trim()) {
      problems.push(`entry.${key} requiere en y es no vacíos`);
    }
  }
  if (!client.jd.trim()) problems.push("jd vacío");
  if (client.modules.length === 0) problems.push("modules vacío");
  for (const module of client.modules) {
    if (!CLIENT_MODULES.includes(module)) {
      problems.push(`module "${module}" desconocido (válidos: ${CLIENT_MODULES.join(", ")})`);
    }
  }
  if (client.chat.enabled && client.chat.suggested.length === 0) {
    problems.push("chat.enabled con suggested vacío");
  }
  return problems;
}
