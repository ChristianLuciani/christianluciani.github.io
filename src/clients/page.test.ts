/**
 * Render de /clients/<slug>/ (#145 §1): noindex, entry copy del config,
 * badge de provenance con el sha real, gate + módulos, entry del lab.
 */
import { describe, expect, it } from "vitest";
import { CLIENT_SOURCE_ENTRY, clientPageHtml, clientsIndexHtml } from "./page.ts";
import { CLIENTS, clientSlugs } from "../content/clients/index.ts";
import { PROFILE } from "../data/profile.generated.ts";
import { PROFILE_COMMIT, PROFILE_ENGINE } from "../data/profile.provenance.ts";
import type { CvProfile } from "../data/profile.types.ts";

const PROFILE_DATA = PROFILE as unknown as CvProfile;

describe("client page — contrato del documento", () => {
  const html = clientPageHtml(CLIENTS.blacksmith);

  it("noindex (no compite con el CV público)", () => {
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
  });

  it("muestra la entry copy del config (gate) y el botón de entrada", () => {
    expect(html).toContain("Blacksmith, this lab is for you");
    expect(html).toContain("Enter the lab");
    expect(html).toContain('id="lab-gate"');
    expect(html).toContain('id="lab-enter"');
  });

  it("los 5 módulos宣言ados renderizan sus secciones", () => {
    for (const mod of CLIENTS.blacksmith.modules) {
      expect(html).toContain(`data-module="${mod}"`);
    }
  });

  it("badge de provenance con el sha real, engine, schema y fecha", () => {
    expect(html).toContain(PROFILE_COMMIT);
    if (PROFILE_ENGINE.version) expect(html).toContain(`pasco ${PROFILE_ENGINE.version}`);
    if (PROFILE_ENGINE.schema) expect(html).toContain(`schema v${PROFILE_ENGINE.schema}`);
    if (PROFILE_DATA.source.commitDate) expect(html).toContain(PROFILE_DATA.source.commitDate);
  });

  it("los 3 hechos verificables salen del SSOT como data-verify en el DOM", () => {
    const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    expect(html).toContain(`data-verify="name">${esc(PROFILE_DATA.identity.name)}`);
    expect(html).toContain(`data-verify="lastRole">${esc(PROFILE_DATA.experience[0].role.en)}`);
    const published = PROFILE_DATA.projects.find((p) => p.published)!;
    expect(html).toContain(`data-verify="project">${esc(published.name)}`);
  });

  it("config embebido como JSON no ejecutable + entry del lab + accent del cliente", () => {
    expect(html).toContain('<script type="application/json" id="lab-config">');
    expect(html).toContain('"slug":"blacksmith"');
    expect(html).toContain(CLIENT_SOURCE_ENTRY);
    expect(html).toContain(`--lab-accent:${CLIENTS.blacksmith.theme.accent}`);
  });

  it("el módulo MCP documenta el contrato y el snippet de config", () => {
    expect(html).toContain("mcp/server.mjs");
    expect(html).toContain('"command": "node"');
  });

  it("el módulo agent declara los 4 tools con endpoint y ejemplo precargado", () => {
    for (const name of ["get_profile", "list_projects", "get_project", "search_publications"]) {
      expect(html).toContain(`data-tool="${name}"`);
    }
    expect(html).toContain("/agent/projects.json");
    expect(html).toContain('{ "name": "kontablo" }');
  });

  it("no hay scripts inline ejecutables (sólo module y application/json)", () => {
    const re = /<script([^>]*)>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      expect(
        m[1].includes("application/json") || m[1].includes("module"),
        `script inesperado: ${m[0]}`
      ).toBe(true);
    }
  });

  it("el slug del cliente viene del config, no del template (html lang y data-client)", () => {
    expect(html).toContain(`data-client="blacksmith"`);
    expect(html).toContain('<html lang="en"');
    const example = clientPageHtml(CLIENTS.example);
    expect(example).toContain(`data-client="example"`);
    expect(example).toContain('<html lang="es"');
    expect(example).toContain("Esta página prueba que el laboratorio es paramétrico");
  });

  it("/clients/ indexa los labs registrados, también noindex", () => {
    const index = clientsIndexHtml();
    expect(index).toContain('<meta name="robots" content="noindex, nofollow">');
    for (const slug of clientSlugs()) {
      expect(index).toContain(`/clients/${slug}/`);
    }
  });
});
