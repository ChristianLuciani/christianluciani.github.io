/**
 * Matcher determinista del módulo Fit (#145 §2.3). Sin LLM, sin score opaco:
 * cada requisito del JD se compara contra el perfil público con un mapa de
 * sinónimos declarado (lado requisito y lado evidencia); la salida es
 * evidencia con links o un "gap" declarado. No inventa evidencia: todo
 * `claim` sale de un campo real del perfil.
 */
import type { CvProfile } from "../data/profile.types.ts";

export interface FitEvidence {
  claim: string;
  url?: string;
  /** Substring verbatim del perfil (JSON del item o campo) — permite probar que
   *  la evidencia no se inventa: siempre está contenido en el SSOT. */
  source: string;
}

export interface FitRequirement {
  text: string;
  status: "evidence" | "gap";
  evidence: FitEvidence[];
}

export interface FitResult {
  requirements: FitRequirement[];
  summary: { withEvidence: number; total: number };
}

/**
 * Concepto del aviso: `req` nombra el requisito en el JD; `ev` busca la
 * evidencia en el corpus del perfil. Son listas distintas a propósito: el
 * aviso dice "tool use" y el perfil demuestra "agent orchestration / ACP".
 */
interface Concept {
  id: string;
  req: string[];
  ev: string[];
}

// Orden: lo específico primero (internal-tools antes que el tool-use genérico).
const CONCEPTS: Concept[] = [
  { id: "agentic-workflows", req: ["agentic", "agent workflow", "agentes"], ev: ["agent", "orchestr", "socratic", "tutor"] },
  { id: "mcp", req: ["mcp", "model context protocol"], ev: ["mcp"] },
  { id: "acp-a2a", req: ["acp", "a2a", "agent-to-agent", "agent protocol"], ev: ["acp", "a2a"] },
  // Ojo: "engine" matcheaba "RAG context engineering" — sacado a propósito.
  { id: "internal-tools", req: ["internal tool"], ev: ["internal", "cli", "pasco"] },
  { id: "tool-use", req: ["tool use", "tool-use", "tool calling", "function calling", "tools"], ev: ["tool", "acp", "function"] },
  { id: "rest-webhooks", req: ["rest", "webhook", "http api", "api"], ev: ["rest", "webhook", "api", "http", "endpoint"] },
  { id: "python-node", req: ["python", "node", "nodejs", "typescript", "javascript", "2+ years"], ev: ["python", "node", "typescript", "javascript", "c++", "java", "sql"] },
  { id: "async-english", req: ["english", "ingl", "async"], ev: ["english", "spanish", "french", "native", "intermediate"] }
];

/**
 * Si el requisito nombra un proveedor (OpenAI/Anthropic), la evidencia debe
 * nombrar ESE proveedor — lista cerrada: openai, anthropic, claude, chatgpt,
 * gpt. "llm"/"LiteLLM"/"Ollama" NO cuentan (self-hosting no es el proveedor del
 * aviso). En el SSOT real hay evidencia honesta: ZENTROPY ingiere Claude
 * JSON/ZIP y ChatGPT. Si no la hubiera, el requisito sale como gap.
 */
const PROVIDER_REQ = /(openai|anthropic)/;
const PROVIDER_EV = ["openai", "anthropic", "claude", "chatgpt", "gpt"];

/** Librerías/SDKs que el perfil NO declara: un requisito que las nombre es gap. */
const KNOWN_GAPS = ["langchain", "langgraph", "anthropic sdk", "openai sdk", "llamaindex"];

function norm(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Segmenta el JD en requisitos: líneas, "·", ";" y oraciones. */
export function extractRequirements(jd: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of jd.split(/[\n·;]+|\.\s+/)) {
    const text = raw.trim().replace(/^[-*•]\s*/, "");
    const key = norm(text);
    if (text.length >= 3 && !seen.has(key)) {
      seen.add(key);
      out.push(text);
    }
  }
  return out;
}

interface CorpusItem {
  text: string;
  url?: string;
  source: string;
}

const LANGUAGE_NAMES: Record<string, string> = { es: "Spanish", en: "English", fr: "French" };

/** Corpus de evidencia: skills, proyectos, artifacts, experiencia e idiomas. */
function evidenceCorpus(profile: CvProfile): CorpusItem[] {
  const items: CorpusItem[] = [];
  for (const skill of profile.skills) {
    items.push({
      text: `${skill.name}: ${[...(skill.keywords ?? []), ...(skill.geoKeywords ?? [])].join(", ")}`,
      source: JSON.stringify(skill)
    });
  }
  for (const project of profile.projects) {
    const description = project.description?.en ?? "";
    items.push({ text: `${project.name} — ${description}`, url: project.links[0], source: JSON.stringify(project) });
    items.push({ text: `${project.name} keywords: ${(project.keywords ?? []).join(", ")}`, url: project.links[0], source: JSON.stringify(project) });
    for (const ev of project.evidence ?? []) {
      items.push({ text: ev.claim.en, url: ev.source || project.links[0], source: ev.claim.en });
    }
  }
  for (const artifact of profile.artifacts ?? []) {
    const description = artifact.description?.en ?? "";
    items.push({ text: `${artifact.title} — ${description}`, url: artifact.locator.url, source: JSON.stringify(artifact) });
  }
  for (const exp of profile.experience) {
    for (const highlight of exp.highlights?.en ?? []) {
      items.push({ text: `${exp.role.en} — ${exp.org}: ${highlight}`, source: highlight });
    }
  }
  items.push({
    text: `Languages: ${profile.languages.map((l) => `${LANGUAGE_NAMES[l.code] ?? l.code} (${l.level})`).join(", ")}`,
    source: JSON.stringify(profile.languages)
  });
  return items;
}

const MAX_EVIDENCE_PER_REQUIREMENT = 3;
const MAX_CLAIM_CHARS = 220;

function truncate(text: string): string {
  return text.length > MAX_CLAIM_CHARS ? `${text.slice(0, MAX_CLAIM_CHARS - 1)}…` : text;
}

/** Un requisito es gap declarado si nombra una librería que el perfil no usa. */
function declaredGap(requirement: string): boolean {
  const n = norm(requirement);
  return KNOWN_GAPS.some((gap) => n.includes(gap));
}

export function matchRequirement(requirement: string, corpus: readonly CorpusItem[]): FitRequirement {
  const n = norm(requirement);
  if (declaredGap(requirement)) {
    return { text: requirement, status: "gap", evidence: [] };
  }
  const evidence: FitEvidence[] = [];
  const seen = new Set<string>();
  const providerReq = PROVIDER_REQ.test(n);
  outer: for (const concept of CONCEPTS) {
    if (!concept.req.some((term) => n.includes(term))) continue;
    const evTerms = providerReq ? PROVIDER_EV : concept.ev;
    for (const item of corpus) {
      const itemNorm = norm(item.text);
      if (!evTerms.some((term) => itemNorm.includes(term))) continue;
      const key = `${item.text}|${item.url ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      evidence.push({ claim: truncate(item.text), url: item.url, source: item.source });
      if (evidence.length >= MAX_EVIDENCE_PER_REQUIREMENT) break outer;
    }
  }
  return {
    text: requirement,
    status: evidence.length > 0 ? "evidence" : "gap",
    evidence
  };
}

export function matchJd(jd: string, profile: CvProfile): FitResult {
  const corpus = evidenceCorpus(profile);
  const requirements = extractRequirements(jd).map((text) => matchRequirement(text, corpus));
  const withEvidence = requirements.filter((r) => r.status === "evidence").length;
  return { requirements, summary: { withEvidence, total: requirements.length } };
}
