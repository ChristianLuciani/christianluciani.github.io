import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { projectKey } from "../content/cv/proyectos";
import { PROFILE } from "./profile.generated";
import type { ProjectItem } from "./profile.types";
import { PROYECTOS, enDesarrollo, publicados, toProyecto } from "./proyectos";

/**
 * El split El Marco / El Bastidor NO es editorial: se deriva de
 * `PROFILE.projects[].published` (artifactRefs → artifact público con
 * locator.url). El orden de tarjetas es curación (`recencia`): más reciente
 * primero y las fichas sin fecha verificable al final, nunca inventadas.
 */

const fechas = (lista: readonly { recencia?: string }[]) => lista.map((p) => p.recencia ?? "");
const keys = (lista: readonly { id: string }[]) => lista.map((p) => p.id);

describe("PROYECTOS — split derivado de artifactRefs", () => {
  it("El Marco == proyectos con artifactRefs público (publicados del SSOT)", () => {
    const esperados = PROFILE.projects
      .filter((p) => p.published)
      .map((p) => projectKey(p.name));
    expect(keys(publicados)).toEqual(["profile-as-code", "Kontablo", "Drahma"]);
    expect(new Set(keys(publicados))).toEqual(new Set(esperados));
  });

  it("El Bastidor == proyectos sin artifactRefs público", () => {
    expect(keys(enDesarrollo)).toEqual([
      "Topia",
      "CLAPPS.AI",
      "Nelson Companion",
      "Esteléctica",
      "ZENTROPY",
      "Physics Lab Book",
      "NOOS",
      "Upstream Open Source Contributions"
    ]);
    expect(enDesarrollo.every((p) => p.published === false)).toBe(true);
    expect(publicados.every((p) => p.published === true)).toBe(true);
  });

  it("cada ficha del SSOT aparece exactamente una vez", () => {
    expect(PROYECTOS.length).toBe(PROFILE.projects.length);
    expect(new Set(PROYECTOS.map((p) => p.id)).size).toBe(PROYECTOS.length);
    expect(PROYECTOS.length).toBe(publicados.length + enDesarrollo.length);
  });

  it("orden: más reciente primero y la ficha sin fecha al final", () => {
    expect(fechas(publicados)).toEqual([...fechas(publicados)].sort().reverse());
    const conFecha = enDesarrollo.filter((p) => p.recencia);
    expect(fechas(conFecha)).toEqual([...fechas(conFecha)].sort().reverse());
    expect(enDesarrollo.filter((p) => !p.recencia).map((p) => p.id)).toEqual([
      "NOOS",
      "Upstream Open Source Contributions"
    ]);
  });

  it("una ficha no publicada sin curación no inventa `falta`", () => {
    const fixture: ProjectItem = {
      name: "Proyecto sin curación",
      published: false,
      links: [],
      keywords: [],
      evidence: []
    };
    const vista = toProyecto(fixture);
    expect(vista.falta).toBeUndefined();
    expect(vista.html).toContain("Sin artefacto público");
  });

  it("los hechos del SSOT entran a la tarjeta (nombre, descripción, links, estado)", () => {
    const clapps = PROFILE.projects.find((p) => p.name.startsWith("CLAPPS.AI"))!;
    const vista = PROYECTOS.find((p) => p.id === "CLAPPS.AI")!;
    expect(vista.html).toContain("Comprehensive Learning Applications");
    expect(vista.html).toContain(clapps.description!.es!);
    expect(vista.html).toContain("En diseño · Sin artefacto público");
    // Los links públicos del SSOT se renderizan; los privados no existen acá.
    const kontablo = PROYECTOS.find((p) => p.id === "Kontablo")!;
    expect(kontablo.links).toContain("https://github.com/ChristianLuciani/accounting-esperanto");
    expect(kontablo.html).toContain("https://doi.org/10.5281/zenodo.20738795");
  });

  it("la píldora curada no contradice al SSOT: published=false → sin «Publicado» (F4)", () => {
    // Kontablo tiene `statusLabel` curado («Publicado · v0.1.0 · Open-source»).
    // Si el SSOT lo deja sin artifactRefs público, la ficha pasa a El Bastidor
    // y NO puede seguir mostrando la píldora curada: manda `published`.
    const kontablo = PROFILE.projects.find((p) => p.name.startsWith("Kontablo"))!;
    const vista = toProyecto({
      ...kontablo,
      published: false,
      links: [...kontablo.links],
      keywords: [...kontablo.keywords],
      evidence: [...kontablo.evidence]
    });
    expect(vista.published).toBe(false);
    const pill = /<span class="project-status ([^"]+)">([^<]*)<\/span>/.exec(vista.html!);
    expect(pill).not.toBeNull();
    expect(pill![1]).toBe("status-private");
    expect(pill![2]).not.toMatch(/Publicado/);
    expect(pill![2]).toContain("Sin artefacto público");
    expect(vista.html).not.toContain("Publicado · v0.1.0 · Open-source");
  });

  it("src/data/proyectos.ts no vuelve a decidir la etapa ni carga hechos", () => {
    const source = readFileSync(resolve(process.cwd(), "src", "data", "proyectos.ts"), "utf8");
    expect(source).not.toMatch(/etapa\s*:/);
    expect(source).not.toMatch(/\b(19|20)\d{2} – (19|20)\d{2}\b/);
    expect(source).not.toMatch(/USFQ|Magic Dreams|Grupo Angel/);
  });
});
