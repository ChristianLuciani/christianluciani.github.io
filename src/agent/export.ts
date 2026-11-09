/**
 * Export del perfil público a superficies consumibles por agentes (#145).
 *
 * TODO sale de `PROFILE` (la proyección pública ya filtrada por
 * `tools/sync-profile.ts` — `visibility=public`): acá no se re-filtra nada
 * privado, sólo se proyecta a los contratos de `public/agent/`:
 *
 *   · manifest.json       — 4 tools con JSON Schema + endpoint estático
 *   · profile.json        — identidad, posicionamiento, experiencia, skills…
 *   · projects.json       — registry de proyectos
 *   · publications.json   — registry de publicaciones
 *   · chat-context.json   — contexto del chat (secciones con id + sources)
 *
 * Determinismo: mismo PROFILE → mismos bytes (JSON.stringify con 2 espacios
 * y claves en orden de inserción fija). El drift se vigila con un test que
 * compara estos bytes con los archivos commiteados de `public/agent/`.
 */
import type { CvProfile } from "../data/profile.types.ts";
import { PROFILE } from "../data/profile.generated.ts";
import { PROFILE_COMMIT, PROFILE_ENGINE } from "../data/profile.provenance.ts";
import { ENTITY } from "../data/entity.generated.ts";

export const AGENT_DIR = "public/agent";

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Endpoint REST estático (archivo servido desde `public/agent/`). */
  endpoint: string;
}

export interface AgentManifest {
  name: string;
  version: string;
  description: string;
  provenance: { commit: string; engine: string | null; schema: string | null };
  tools: AgentTool[];
}

const TOOL_ENDPOINTS = {
  get_profile: "/agent/profile.json",
  list_projects: "/agent/projects.json",
  get_project: "/agent/projects.json",
  search_publications: "/agent/publications.json"
} as const;

export function agentManifest(): AgentManifest {
  return {
    name: "christianluciani-profile",
    version: "1.0.0",
    description:
      "Deterministic, read-only tools over Christian Luciani's public profile. Static JSON endpoints — no model call, no API key.",
    provenance: {
      commit: PROFILE_COMMIT,
      engine: PROFILE_ENGINE.version,
      schema: PROFILE_ENGINE.schema
    },
    tools: [
      {
        name: "get_profile",
        description: "Public profile: identity, positioning, experience, skills, links, provenance.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        endpoint: TOOL_ENDPOINTS.get_profile
      },
      {
        name: "list_projects",
        description: "All projects from the public profile registry, with links and evidence.",
        inputSchema: {
          type: "object",
          properties: { published: { type: "boolean", description: "Filter to publicly published projects." } },
          additionalProperties: false
        },
        endpoint: TOOL_ENDPOINTS.list_projects
      },
      {
        name: "get_project",
        description: "One project by (partial, case-insensitive) name.",
        inputSchema: {
          type: "object",
          properties: { name: { type: "string", minLength: 1 } },
          required: ["name"],
          additionalProperties: false
        },
        endpoint: TOOL_ENDPOINTS.get_project
      },
      {
        name: "search_publications",
        description: "Search publications by title/venue (case-insensitive substring).",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string", minLength: 1 } },
          required: ["query"],
          additionalProperties: false
        },
        endpoint: TOOL_ENDPOINTS.search_publications
      }
    ]
  };
}

/** profile.json — la proyección pública tal cual (ya filtrada aguas arriba). */
export function profileJson(profile: CvProfile = PROFILE as unknown as CvProfile): Record<string, unknown> {
  return {
    name: profile.identity.name,
    givenName: profile.identity.givenName,
    familyName: profile.identity.familyName,
    location: profile.identity.location,
    positioning: profile.positioning,
    links: profile.identity.links,
    experience: profile.experience,
    education: profile.education,
    projects: profile.projects,
    publications: profile.publications,
    skills: profile.skills,
    languages: profile.languages,
    credentials: profile.credentials,
    artifacts: profile.artifacts,
    keywords: profile.keywords,
    source: profile.source
  };
}

export function projectsJson(profile: CvProfile = PROFILE as unknown as CvProfile): Record<string, unknown> {
  return {
    projects: profile.projects.map((p) => ({
      name: p.name,
      status: p.status,
      description: p.description,
      published: p.published,
      links: p.links,
      keywords: p.keywords,
      evidence: p.evidence
    })),
    source: profile.source
  };
}

export function publicationsJson(profile: CvProfile = PROFILE as unknown as CvProfile): Record<string, unknown> {
  return {
    publications: profile.publications.map((p) => ({
      title: p.title,
      venue: p.venue,
      year: p.year,
      doi: p.doi,
      url: p.url
    })),
    source: profile.source
  };
}

/* ── chat-context.json ─────────────────────────────────────────────── */

export interface ChatContextSection {
  id: string;
  text: string;
  sources: string[];
}

export interface ChatContext {
  generatedFrom: { commit: string; engine: string | null; schema: string | null };
  sections: ChatContextSection[];
}

function lang(text: { en: string; es?: string }, locale: "en" | "es" = "en"): string {
  return locale === "es" ? text.es ?? text.en : text.en;
}

/** FAQ pública desde el JSON-LD de la entidad (pasco entity, #140). */
function faqSection(): ChatContextSection {
  const faq = ENTITY.nodes.find((node) => node["@type"] === "FAQPage");
  const entities = (faq?.mainEntity ?? []) as { name: string; acceptedAnswer: { text: string; citation?: string } }[];
  const text = entities
    .map((q) => `Q: ${q.name}\nA: ${q.acceptedAnswer.text}`)
    .join("\n\n");
  const sources = entities.map((q) => q.acceptedAnswer.citation).filter((c): c is string => Boolean(c));
  return { id: "faq", text, sources };
}

/**
 * chat-context.json — contexto del chat grounded (≤ 6k tokens aprox). Solo
 * perfil público; cada sección declara sus sources para citar.
 */
export function chatContext(profile: CvProfile = PROFILE as unknown as CvProfile): ChatContext {
  const sections: ChatContextSection[] = [
    {
      id: "identity",
      text: `${profile.identity.name} — ${lang(profile.positioning.statement)} Location: ${profile.identity.location ?? "n/a"}.`,
      sources: profile.identity.links.map((l) => l.url)
    },
    {
      id: "experience",
      text: profile.experience
        .map((e) => {
          const highlights = (e.highlights?.en ?? []).map((h) => `  - ${h}`).join("\n");
          return `${lang(e.role)} — ${e.org} (${e.start} → ${e.end})${highlights ? `\n${highlights}` : ""}`;
        })
        .join("\n\n"),
      sources: []
    },
    {
      id: "projects",
      text: profile.projects
        .map((p) => {
          const evidence = p.evidence.map((ev) => `  - ${lang(ev.claim)} (${ev.source})`).join("\n");
          return `${p.name} [${p.status ?? "n/a"}${p.published ? ", published" : ""}]\n${lang(p.description ?? { en: "" })}${evidence ? `\n${evidence}` : ""}`;
        })
        .join("\n\n"),
      sources: profile.projects.flatMap((p) => p.links)
    },
    {
      id: "skills",
      text: profile.skills
        .map((s) => `${s.name} (${s.level ?? "n/a"}): ${(s.keywords ?? []).join(", ")}`)
        .join("\n"),
      sources: []
    },
    {
      id: "publications",
      text: profile.publications.map((p) => `${p.title} — ${p.venue} (${p.year}). ${p.url}`).join("\n"),
      sources: profile.publications.map((p) => p.url).filter(Boolean)
    },
    faqSection(),
    {
      id: "links",
      text: profile.identity.links.map((l) => `${l.label}: ${l.url}`).join("\n"),
      sources: profile.identity.links.map((l) => l.url)
    }
  ];
  return {
    generatedFrom: { commit: PROFILE_COMMIT, engine: PROFILE_ENGINE.version, schema: PROFILE_ENGINE.schema },
    sections
  };
}

/** Estimación burda de tokens (≈4 chars/token) para vigilar el tope de 6k. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export const CHAT_CONTEXT_TOKEN_BUDGET = 6000;

/* ── serialización determinista ────────────────────────────────────── */

export function toJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Todos los artefactos de public/agent/ como { rutaRelativa: bytes }. */
export function agentFiles(): Record<string, string> {
  return {
    [`${AGENT_DIR}/manifest.json`]: toJson(agentManifest()),
    [`${AGENT_DIR}/profile.json`]: toJson(profileJson()),
    [`${AGENT_DIR}/projects.json`]: toJson(projectsJson()),
    [`${AGENT_DIR}/publications.json`]: toJson(publicationsJson()),
    [`${AGENT_DIR}/chat-context.json`]: toJson(chatContext())
  };
}
