/**
 * Fit explorer (#145 §2.3): con la JD real de Blacksmith, MCP/agentes/Node
 * matchean con evidencia linkeada; LangChain y el SDK de Anthropic salen como
 * gaps declarados. Sin LLM, sin score opaco, sin evidencia inventada.
 */
import { describe, expect, it } from "vitest";
import { extractRequirements, matchJd } from "./matcher.ts";
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
