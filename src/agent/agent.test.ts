/**
 * Contratos de public/agent/ (#145 §2.1/§2.5): manifiesto válido, shapes de
 * salida, contexto ≤ 6k tokens y CERO datos privados; más ejecución
 * determinista de tools, verify de provenance y citations.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  agentFiles,
  agentManifest,
  chatContext,
  estimateTokens,
  CHAT_CONTEXT_TOKEN_BUDGET,
  profileJson,
  projectsJson,
  publicationsJson
} from "./export.ts";
import { validateInput } from "./schema.ts";
import { runTool, ToolError } from "./execute.ts";
import { checkFacts } from "./verify.ts";
import { extractCitations } from "./citations.ts";
import { PROFILE } from "../data/profile.generated.ts";
import { PROFILE_COMMIT } from "../data/profile.provenance.ts";
import type { CvProfile } from "../data/profile.types.ts";

const P = PROFILE as unknown as CvProfile;

describe("agent manifest — 4 tools con JSON Schema y endpoint", () => {
  const manifest = agentManifest();

  it("declara exactamente los 4 tools con endpoint estático", () => {
    expect(manifest.tools.map((t) => t.name).sort()).toEqual([
      "get_profile",
      "get_project",
      "list_projects",
      "search_publications"
    ]);
    for (const tool of manifest.tools) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.endpoint).toMatch(/^\/agent\/.+\.json$/);
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("get_project y search_publications exigen su campo", () => {
    const getProject = manifest.tools.find((t) => t.name === "get_project")!;
    expect(getProject.inputSchema.required).toEqual(["name"]);
    expect(validateInput(getProject.inputSchema, {})).toHaveLength(1);
    expect(validateInput(getProject.inputSchema, { name: "kontablo" })).toEqual([]);
    expect(validateInput(getProject.inputSchema, { name: "x", extra: 1 })).toHaveLength(1);
    const search = manifest.tools.find((t) => t.name === "search_publications")!;
    expect(validateInput(search.inputSchema, { query: "caffeine" })).toEqual([]);
  });

  it("el manifiesto declara provenance con el sha real", () => {
    expect(manifest.provenance.commit).toBe(PROFILE_COMMIT);
  });
});

describe("shapes de salida desde PROFILE", () => {
  it("profile.json expone identidad, experiencia, skills y source", () => {
    const json = profileJson(P) as Record<string, unknown>;
    expect(json.name).toBe("Christian Luciani");
    expect(Array.isArray(json.experience)).toBe(true);
    expect(Array.isArray(json.skills)).toBe(true);
    expect((json.source as { commit: string }).commit).toBe(PROFILE_COMMIT);
  });

  it("projects.json incluye a Kontablo con link público", () => {
    const json = projectsJson(P) as { projects: { name: string; links: string[] }[] };
    const kontablo = json.projects.find((p) => p.name.includes("Kontablo"))!;
    expect(kontablo.links[0]).toMatch(/^https:\/\/github\.com\//);
  });

  it("publications.json tiene title/venue/year/url", () => {
    const json = publicationsJson(P) as { publications: { title: string; url: string }[] };
    expect(json.publications.length).toBeGreaterThan(0);
    expect(json.publications[0].url).toMatch(/^https?:\/\//);
  });
});

describe("chat-context.json — sólo perfil público, ≤ 6k tokens, secciones con sources", () => {
  const ctx = chatContext(P);

  it("cada sección tiene id, text y sources (array)", () => {
    for (const section of ctx.sections) {
      expect(section.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(section.text.length).toBeGreaterThan(0);
      expect(Array.isArray(section.sources)).toBe(true);
    }
    expect(ctx.sections.map((s) => s.id)).toContain("faq");
  });

  it("cabe en el budget de 6k tokens", () => {
    expect(estimateTokens(JSON.stringify(ctx))).toBeLessThanOrEqual(CHAT_CONTEXT_TOKEN_BUDGET);
  });

  it("no filtra datos privados: no hay credenciales ni deployments", () => {
    const raw = JSON.stringify(ctx).toLowerCase();
    expect(raw).not.toContain("deployments");
    expect(raw).not.toContain("password");
    expect(raw).not.toContain("api_key");
  });
});

describe("drift — public/agent/ commiteado == regenerado del SSOT", () => {
  const files = agentFiles();
  for (const [relative, bytes] of Object.entries(files)) {
    it(`${relative} sin drift`, () => {
      const file = resolve(process.cwd(), relative);
      expect(existsSync(file), `${relative} existe`).toBe(true);
      expect(readFileSync(file, "utf8")).toBe(bytes);
    });
  }
});

describe("ejecución determinista de tools (loader inyectado)", () => {
  const files = agentFiles();
  const loader = async (url: string) => JSON.parse(files[`public${url}`]);
  const manifest = agentManifest();

  it("las 4 tools ejecutan y devuelven JSON real", async () => {
    const profile = (await runTool(manifest.tools[0], {}, loader)) as { name: string };
    expect(profile.name).toBe("Christian Luciani");
    const projects = (await runTool(manifest.tools[1], { published: true }, loader)) as { name: string }[];
    expect(projects.length).toBeGreaterThan(0);
    expect(projects.every((p) => p.name)).toBe(true);
    const kontablo = (await runTool(manifest.tools[2], { name: "kontablo" }, loader)) as { name: string };
    expect(kontablo.name).toContain("Kontablo");
    const pubs = (await runTool(manifest.tools[3], { query: "caffeine" }, loader)) as { title: string }[];
    expect(pubs.length).toBeGreaterThan(0);
    expect(pubs[0].title).toMatch(/caffeine/i);
  });

  it("input inválido y proyecto inexistente → ToolError claro", async () => {
    await expect(runTool(manifest.tools[2], {}, loader)).rejects.toBeInstanceOf(ToolError);
    await expect(runTool(manifest.tools[2], { name: "no-existe-este-proyecto" }, loader)).rejects.toThrow(
      /no hay proyecto/
    );
  });
});

describe("provenance verify — detecta divergencia inyectada", () => {
  const json = profileJson(P) as { name: string; experience: { role: { en: string } }[]; projects: { name: string }[] };
  const facts = [
    { id: "name" as const, value: json.name },
    { id: "lastRole" as const, value: json.experience[0].role.en },
    { id: "project" as const, value: json.projects.find((p) => p.name.includes("Kontablo"))!.name }
  ];

  it("OK cuando el DOM y el JSON coinciden", () => {
    expect(checkFacts(facts, json).every((c) => c.ok)).toBe(true);
  });

  it("FAIL por hecho cuando el DOM diverge del snapshot", () => {
    const tampered = facts.map((f) => (f.id === "name" ? { ...f, value: "Otro Nombre" } : f));
    const checks = checkFacts(tampered, json);
    expect(checks.find((c) => c.id === "name")!.ok).toBe(false);
    expect(checks.filter((c) => c.ok)).toHaveLength(2);
  });
});

describe("citations — sólo ids que existen en el contexto", () => {
  it("extrae [id] válidos y descarta los que no existen", () => {
    expect(extractCitations("MCP sí [projects] y [identity]; [admin] no", ["identity", "projects"])).toEqual([
      "projects",
      "identity"
    ]);
  });
});
