/**
 * Fit explorer (#145 §2.3): con la JD real de Blacksmith, MCP/agentes/Node
 * matchean con evidencia linkeada; LangChain y el SDK de Anthropic salen como
 * gaps declarados. Sin LLM, sin score opaco, sin evidencia inventada.
 */
import { describe, expect, it } from "vitest";
import { extractRequirements, matchJd, matchTerm, norm, termMatches } from "./matcher.ts";
import { PROFILE } from "../data/profile.generated.ts";
import type { CvProfile } from "../data/profile.types.ts";
import { blacksmith } from "../content/clients/blacksmith.ts";

const P = PROFILE as unknown as CvProfile;

describe("matcher determinista sobre la JD de Blacksmith", () => {
  const result = matchJd(blacksmith.jd, P);

  it("segmenta el JD en requisitos", () => {
    expect(result.summary.total).toBeGreaterThanOrEqual(6);
    expect(extractRequirements(blacksmith.jd).length).toBe(result.summary.total);
  });

  it("MCP, agentic workflows, tool use, internal tools, Python/Node y English matchean con evidencia", () => {
    const byText = new Map(result.requirements.map((r) => [r.text.toLowerCase(), r]));
    for (const needle of ["mcp server", "agentic workflows", "tool use", "internal tools", "python/node", "english"]) {
      const req = [...byText.entries()].find(([text]) => text.includes(needle));
      expect(req, `requisito con "${needle}"`).toBeTruthy();
      expect(req![1].status, `"${req![0]}" con evidencia`).toBe("evidence");
      expect(req![1].evidence.length).toBeGreaterThan(0);
    }
  });

  it("la evidencia linkea a proyectos/PRs reales del perfil (o es claim del SSOT)", () => {
    for (const req of result.requirements.filter((r) => r.status === "evidence")) {
      for (const ev of req.evidence) {
        expect(ev.claim.length).toBeGreaterThan(10);
        if (ev.url) expect(ev.url).toMatch(/^https:\/\//);
      }
    }
    const mcp = result.requirements.find((r) => r.text.toLowerCase().includes("mcp"))!;
    expect(mcp.evidence.some((e) => e.claim.toLowerCase().includes("mcp"))).toBe(true);
  });

  it("honestidad: un requisito con proveedor exige evidencia del proveedor (lista cerrada, sin 'llm'/'LiteLLM')", () => {
    const toolUse = result.requirements.find((r) => r.text.toLowerCase().includes("tool use"))!;
    expect(toolUse.status).toBe("evidence");
    // La evidencia (source verbatim, sin truncar) nombra el proveedor: Claude/ChatGPT (ZENTROPY).
    for (const ev of toolUse.evidence) {
      expect(ev.source.toLowerCase()).toMatch(/openai|anthropic|claude|chatgpt|gpt/);
      expect(ev.source.toLowerCase()).not.toMatch(/llm|litellm|ollama/);
    }
  });

  it("lista cerrada: 'LiteLLM / Ollama' o 'LLM orchestration' solos NO son evidencia de OpenAI/Anthropic", () => {
    const localFirst = {
      skills: [{ name: "Technological Sovereignty", keywords: ["self-hosting", "LiteLLM / Ollama"] }],
      projects: [],
      artifacts: [],
      experience: [{ role: { en: "Dev" }, org: "x", start: "2020", end: "present", highlights: { en: ["LLM orchestration"] } }],
      languages: []
    } as unknown as CvProfile;
    const r = matchJd("OpenAI/Anthropic tool use", localFirst);
    expect(r.requirements[0].status).toBe("gap");
    expect(r.requirements[0].evidence).toEqual([]);
  });

  it("honestidad: 'internal tools' matchea por CLI/pasco/internal, no por 'engineering'", () => {
    const internal = result.requirements.find((r) => r.text.toLowerCase().includes("internal tool"))!;
    expect(internal.status).toBe("evidence");
    for (const ev of internal.evidence) {
      expect(ev.source.toLowerCase()).toMatch(/internal|cli|pasco/);
    }
  });

  it("sweep de cobertura derivable: TODO keyword de skills[] del SSOT pedido como requisito da evidencia QUE LO NOMBRA", () => {
    // El instrumento que termina con la clase 2: la cobertura se deriva del
    // SSOT y la evidencia no se fabrica — cada claim debe contener el keyword
    // pedido (frontera de palabra), no cualquier otro keyword del vocabulario.
    const keywords = P.skills.flatMap((s) => [...(s.keywords ?? []), ...(s.geoKeywords ?? [])]);
    expect(keywords.length).toBeGreaterThan(10);
    for (const keyword of keywords) {
      const r = matchTerm(keyword, P);
      expect(r.status, `keyword "${keyword}" debe ser evidencia`).toBe("evidence");
      expect(r.evidence.length).toBeGreaterThan(0);
      // al menos una evidencia nombra el keyword (los conceptos curados pueden
      // sumar hermanos del mismo concepto, p. ej. A2A para ACP)
      const namesIt = r.evidence.some((ev) => termMatches(norm(ev.source), keyword));
      expect(namesIt, `evidencia de "${keyword}" debe nombrarlo: ${r.evidence.map((e) => e.claim.slice(0, 50)).join(" | ")}`).toBe(true);
    }
  });

  it("frontera de TOKEN (#178): 'C' no matchea C#/C++/Objective-C; 'c++' sí matchea 'c++'; 'node' sí matchea 'node.js' y 'python/node'", () => {
    expect(termMatches("c++", "c")).toBe(false);
    expect(termMatches("c#", "c")).toBe(false);
    expect(termMatches("objective-c", "c")).toBe(false);
    expect(termMatches("c++", "c++")).toBe(true);
    expect(termMatches("node.js and beyond", "node")).toBe(true);
    expect(termMatches("python/node", "node")).toBe(true);
    expect(termMatches("anode maintenance", "node")).toBe(false);
    expect(matchTerm("C#", P).status).toBe("gap");
    expect(matchTerm("Objective-C", P).status).toBe("gap");
    expect(matchTerm("Anode maintenance", P).status).toBe("gap");
    expect(matchTerm("C", P).status).toBe("evidence");
    expect(matchTerm("C++", P).status).toBe("evidence");
    expect(matchTerm("Java", P).status).toBe("evidence");
    expect(matchTerm("SQL", P).status).toBe("evidence");
  });

  it("guion como prefijo de compuesto (#178, pase 8): python-based / node-based / mcp-server matchean", () => {
    expect(termMatches("python-based tooling", "python")).toBe(true);
    expect(termMatches("node-based", "node")).toBe(true);
    expect(termMatches("mcp-server", "mcp")).toBe(true);
    expect(matchJd("Python-based tooling", P).requirements[0].status).toBe("evidence");
    expect(matchJd("MCP-based agents", P).requirements[0].status).toBe("evidence");
    // y el sufijo con guion sigue bloqueado
    expect(termMatches("objective-c", "c")).toBe(false);
  });

  it("regla estructural clase 2: tokens genéricos sueltos no son requisito — 'async programming' es gap, no evidencia de idiomas", () => {
    const r = matchJd("async programming", P);
    expect(r.requirements).toHaveLength(1);
    expect(r.requirements[0].text).toBe("async programming");
    expect(r.requirements[0].status).toBe("gap");
    expect(r.requirements[0].evidence).toEqual([]);
    // y la JD real sigue matcheando English por la frase "async English"
    const english = result.requirements.find((q) => q.text.toLowerCase().includes("english"))!;
    expect(english.status).toBe("evidence");
  });

  it("si el SSOT no nombrara al proveedor, el requisito sería gap (regla provider)", () => {
    const fakeProfile = {
      skills: [{ name: "Physics", keywords: ["x-ray"] }],
      projects: [],
      artifacts: [],
      experience: [],
      languages: []
    } as unknown as CvProfile;
    const r = matchJd("OpenAI/Anthropic tool use", fakeProfile);
    expect(r.requirements[0].status).toBe("gap");
  });

  it("el proveedor NOMBRADO es el que debe aparecer en la evidencia (#178, pase 8)", () => {
    // perfil sintético con sólo Claude: "OpenAI tool use" → gap, "Anthropic tool use" → evidence
    const onlyClaude = {
      skills: [],
      projects: [
        { name: "X", description: { en: "Uses Claude API for tool calls" }, published: false, links: [], keywords: ["claude"], evidence: [] }
      ],
      artifacts: [],
      experience: [],
      languages: []
    } as unknown as CvProfile;
    expect(matchJd("OpenAI tool use", onlyClaude).requirements[0].status).toBe("gap");
    expect(matchJd("Anthropic tool use", onlyClaude).requirements[0].status).toBe("evidence");
    // con el perfil real (ZENTROPY nombra ChatGPT y Claude) ambos matchean
    expect(matchJd("OpenAI/Anthropic tool use", P).requirements[0].status).toBe("evidence");
  });

  it("LangChain/LangGraph es gap declarado", () => {
    const langchain = result.requirements.find((r) => r.text.toLowerCase().includes("langchain"))!;
    expect(langchain.status).toBe("gap");
    expect(langchain.evidence).toEqual([]);
  });

  it("Anthropic SDK / LangChain como requisitos sueltos también son gap", () => {
    const synthetic = matchJd("LangChain · Anthropic SDK · MCP", P);
    const byText = new Map(synthetic.requirements.map((r) => [r.text, r]));
    expect(byText.get("LangChain")!.status).toBe("gap");
    expect(byText.get("Anthropic SDK")!.status).toBe("gap");
    expect(byText.get("MCP")!.status).toBe("evidence");
  });

  it("el resumen es honesto: N de M con evidencia, sin score", () => {
    expect(result.summary.withEvidence).toBe(
      result.requirements.filter((r) => r.status === "evidence").length
    );
    expect(result.summary.withEvidence).toBeGreaterThan(0);
    expect(result.summary.withEvidence).toBeLessThan(result.summary.total);
  });

  it("no inventa evidencia: el source verbatim de cada claim está en el perfil", () => {
    const corpus = JSON.stringify(P);
    for (const req of result.requirements) {
      for (const ev of req.evidence) {
        expect(corpus).toContain(ev.source);
      }
    }
  });
});
