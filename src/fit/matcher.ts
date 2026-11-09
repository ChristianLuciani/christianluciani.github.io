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
  /** true → la evidencia debe nombrar los términos de req que matchearon
   *  (no cualquier término del concepto): evita evidencia fabricada. */
  evFromReq?: boolean;
}

// Orden: lo específico primero (internal-tools antes que el tool-use genérico).
//
// REGLA ESTRUCTURAL (clase 2, reaparición #2 del review): los términos de `req`
// son FRASES, no tokens genéricos sueltos. "async" solo matcheaba "async
// programming" y mostraba la línea de idiomas como evidencia; "2+ years" no
// nombra stack. Sacarlos es el fix; los tests de abajo fijan cada exclusión.
// Lista cerrada de proveedores (#178): OpenAI → openai/chatgpt/gpt;
// Anthropic → anthropic/claude. El trigger del requisito, el req de
// llm-provider y la evidencia se derivan TODOS de esta misma lista.
const PROVIDER_TERMS: Record<string, string[]> = {
  openai: ["openai", "chatgpt", "gpt"],
  anthropic: ["anthropic", "claude"]
};
const TERM_TO_PROVIDER: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDER_TERMS).flatMap(([provider, terms]) => terms.map((t) => [t, provider]))
);
const PROVIDER_REQ_TERMS = Object.keys(TERM_TO_PROVIDER);
const CONCEPTS: Concept[] = [
  // Proveedor como concepto propio: sólo da evidencia cuando el JD nombra al
  // proveedor SIN ninguna capacidad (p. ej. "OpenAI API"). Si también hay una
  // capacidad matcheada, el proveedor pasa a ser filtro (AND), no evidencia.
  { id: "llm-provider", req: PROVIDER_REQ_TERMS, ev: PROVIDER_REQ_TERMS },
  { id: "agentic-workflows", req: ["agentic", "agent workflow", "agentes"], ev: ["agent", "orchestr", "socratic", "tutor"] },
  { id: "mcp", req: ["mcp", "model context protocol"], ev: ["mcp"] },
  { id: "acp-a2a", req: ["acp", "a2a", "agent-to-agent", "agent protocol"], ev: ["acp", "a2a"] },
  // Ojo: "engine" matcheaba "RAG context engineering" — sacado a propósito.
  { id: "internal-tools", req: ["internal tool"], ev: ["internal", "cli", "pasco"] },
  { id: "tool-use", req: ["tool use", "tool-use", "tool calling", "function calling", "tools"], ev: ["tool", "acp", "function"] },
  { id: "rest-webhooks", req: ["rest", "webhook", "http api", "api"], ev: ["rest", "webhook", "api", "http", "endpoint"] },
  { id: "python-node", req: ["python", "node", "nodejs", "typescript", "javascript"], ev: ["python", "node", "typescript", "javascript", "c++", "java", "sql"] },
  { id: "async-english", req: ["english", "ingl"], ev: ["english", "spanish", "french", "native", "intermediate"] }
];

/**
 * Si el requisito nombra un proveedor (OpenAI/Anthropic), la evidencia debe
 * nombrar ESE proveedor — lista cerrada: openai, anthropic, claude, chatgpt,
 * gpt. "llm"/"LiteLLM"/"Ollama" NO cuentan (self-hosting no es el proveedor del
 * aviso). En el SSOT real hay evidencia honesta: ZENTROPY ingiere Claude
 * JSON/ZIP y ChatGPT. Si no la hubiera, el requisito sale como gap.
 */


/** Librerías/SDKs que el perfil NO declara: un requisito que las nombre es gap. */
const KNOWN_GAPS = ["langchain", "langgraph", "anthropic sdk", "openai sdk", "llamaindex"];

export function norm(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Coincidencia por FRONTERA DE PALABRA: "node" no matchea "anode", "c++" sí
 * matchea "c++". (Clase 2, 4.a reaparición: antes era substring plano.)
 */
/**
 * Coincidencia por TOKEN con frontera asimétrica (#178):
 *  · antes del término: (?<![a-z0-9_#+-]) — bloquea anode, objective-c (sufijo), etc.
 *  · después del término: (?![a-z0-9_#+]) — el guion NO bloquea (prefijo de
 *    compuesto: python-based, node-based, mcp-server sí matchean), pero # y +
 *    sí bloquean (C no matchea C#/C++). Plural s? sólo si el término termina
 *    en alfanumérico.
 */
const BEFORE = "a-z0-9_#+-";
const AFTER = "a-z0-9_#+";
export function termMatches(haystack: string, term: string): boolean {
  const t = norm(term);
  if (!t) return false;
  const plural = /[a-z0-9]$/.test(t) ? "s?" : "";
  return new RegExp("(?<![" + BEFORE + "])" + escapeRegExp(t) + plural + "(?![" + AFTER + "])").test(haystack);
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

/**
 * Concepto DERIVADO del propio SSOT: todo keyword de skills[] (y geoKeywords)
 * es matcheable como requisito, así la cobertura es derivable y no una tabla a
 * mano que se olvida (C++, Java, SQL vivían sólo en ev).
 */
export function vocabularyConcept(profile: CvProfile): Concept {
  const terms = new Set<string>();
  for (const skill of profile.skills) {
    for (const keyword of [...(skill.keywords ?? []), ...(skill.geoKeywords ?? [])]) {
      terms.add(norm(keyword));
    }
  }
  return { id: "profile-vocabulary", req: [...terms], ev: [...terms], evFromReq: true };
}

export function profileConcepts(profile: CvProfile): Concept[] {
  return [...CONCEPTS, vocabularyConcept(profile)];
}

export function matchRequirement(
  requirement: string,
  corpus: readonly CorpusItem[],
  concepts: readonly Concept[] = CONCEPTS
): FitRequirement {
  const n = norm(requirement);
  if (declaredGap(requirement)) {
    return { text: requirement, status: "gap", evidence: [] };
  }
  // REGLA DECLARADA (#178, pase 9): si el JD nombra un proveedor, el claim de
  // evidencia debe nombrar TAMBIÉN ese proveedor (AND con el concepto), salvo
  // que ningún concepto de capacidad haya matcheado — ahí el proveedor solo
  // es evidencia legítima (concepto llm-provider).
  // trigger derivado de la MISMA lista cerrada: cualquier término de proveedor
  // nombrado en el JD (por token) cuenta; la evidencia usa los términos de ESE proveedor.
  const namedProviders = [...new Set(
    PROVIDER_REQ_TERMS.filter((t) => termMatches(n, t)).map((t) => TERM_TO_PROVIDER[t])
  )];
  const providerEv = namedProviders.length > 0
    ? [...new Set(namedProviders.flatMap((pv) => PROVIDER_TERMS[pv] ?? []))]
    : null;
  const matched = concepts
    .map((c) => ({ c, matchedReq: c.req.filter((t) => termMatches(n, t)) }))
    .filter((x) => x.matchedReq.length > 0);
  const capabilities = matched.filter((x) => x.c.id !== "llm-provider");
  const pool = providerEv && capabilities.length > 0 ? capabilities : matched;
  const evidence: FitEvidence[] = [];
  const seen = new Set<string>();
  for (const { c, matchedReq } of pool) {
    // evFromReq: si un término largo también matcheó, los de 1 char no cuentan
    const reqTerms = matchedReq.some((t) => t.length >= 2) ? matchedReq.filter((t) => t.length >= 2) : matchedReq;
    const evTerms = c.evFromReq ? reqTerms : c.ev;
    for (const item of corpus) {
      const itemNorm = norm(item.text);
      if (!evTerms.some((t) => termMatches(itemNorm, t))) continue;
      // composición proveedor AND concepto: el claim también nombra al proveedor pedido
      if (providerEv && c.id !== "llm-provider" && !providerEv.some((t) => termMatches(itemNorm, t))) continue;
      const key = `${item.text}|${item.url ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      evidence.push({ claim: truncate(item.text), url: item.url, source: item.source });
      if (evidence.length >= MAX_EVIDENCE_PER_REQUIREMENT) break;
    }
    if (evidence.length >= MAX_EVIDENCE_PER_REQUIREMENT) break;
  }
  return {
    text: requirement,
    status: evidence.length > 0 ? "evidence" : "gap",
    evidence
  };
}

export function matchJd(jd: string, profile: CvProfile): FitResult {
  const corpus = evidenceCorpus(profile);
  const concepts = profileConcepts(profile);
  const requirements = extractRequirements(jd).map((text) => matchRequirement(text, corpus, concepts));
  const withEvidence = requirements.filter((r) => r.status === "evidence").length;
  return { requirements, summary: { withEvidence, total: requirements.length } };
}

/** Un término suelto contra el corpus del perfil (para el sweep de cobertura). */
export function matchTerm(term: string, profile: CvProfile): FitRequirement {
  return matchRequirement(term, evidenceCorpus(profile), profileConcepts(profile));
}
