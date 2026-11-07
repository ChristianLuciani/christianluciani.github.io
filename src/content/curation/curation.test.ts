import { describe, expect, it } from "vitest";
import { SALAS } from "../../cv/salas.ts";
import { museo } from "../../themes/museo/narrative.ts";
import { projectKey } from "../cv/proyectos.ts";
import { PROFILE } from "../../data/profile.generated.ts";
import type { CvProfile } from "../../data/profile.types.ts";
import { proyectosDe, publicadosDe } from "../../data/proyectos.ts";
import { THEMES, themeIds } from "../../themes/index.ts";
import { factUniverse, allFacts } from "./facts.ts";
import { CURATIONS, curationFor, curatedOrder, isExcluded } from "./index.ts";
import { activeCuration } from "./active.ts";
import { experienceSectionOf } from "./experience.ts";
import { EXPERIENCE_SECTIONS, MUSEO_CURATION } from "./museo.ts";
import { experienceKey, factId } from "./keys.ts";
import { isGreen, reasonProblem, validateCuration } from "./validate.ts";
import { renderRoom } from "../../templates/sala_html.ts";
import type { Curation } from "./types.ts";

/**
 * I3 — TODO HECHO TIENE DECISIÓN DE CURACIÓN (SPEC §5.5 · ADR-001 · #128).
 *
 * El test no compara contra una lista copiada a mano: el universo sale del
 * `CvProfile` commiteado (`factUniverse`) y la decisión de la curación del tema.
 * Un hecho nuevo del SSOT sin decisión, una exclusión sin razón o un `order`
 * que no cubre lo incluido ponen el suite rojo.
 */

const UNIVERSO = factUniverse();
const HECHOS = allFacts(UNIVERSO);
const REPORTE = validateCuration(MUSEO_CURATION, UNIVERSO);
const PERFIL = PROFILE as unknown as CvProfile;

const ids = (collection: string): string[] =>
  UNIVERSO.find((item) => item.id === collection)?.facts.map((fact) => fact.id) ?? [];

describe("universo de hechos — sale del SSOT, no de una lista", () => {
  it("cada colección cubre exactamente las filas del perfil", () => {
    expect(ids("proyectos")).toHaveLength(PERFIL.projects.length);
    expect(ids("publicaciones")).toHaveLength(PERFIL.publications.length);
    expect(ids("experiencia")).toHaveLength(PERFIL.experience.length);
    expect(ids("formacion")).toHaveLength(PERFIL.education.length);
    expect(ids("competencias")).toHaveLength(PERFIL.skills.length);
    expect(ids("idiomas")).toHaveLength(PERFIL.languages.length);
    expect(ids("credenciales")).toHaveLength(PERFIL.credentials.length);
    expect(ids("artefactos")).toHaveLength(PERFIL.artifacts.length);
    expect(ids("salas")).toHaveLength(SALAS.length);
  });

  it("ids únicos y namespaced por colección", () => {
    expect(new Set(HECHOS.map((fact) => fact.id)).size).toBe(HECHOS.length);
    for (const fact of HECHOS) {
      expect(fact.id.startsWith(`${fact.collection}:`)).toBe(true);
      expect(fact.key.length).toBeGreaterThan(0);
    }
  });

  it("la sala se deriva de `published`, no de una decisión editorial", () => {
    const kontablo = HECHOS.find((fact) => fact.id === "proyectos:Kontablo")!;
    const zentropy = HECHOS.find((fact) => fact.id === "proyectos:ZENTROPY")!;
    expect(kontablo.surface).toBe("El Marco");
    expect(zentropy.surface).toBe("El Bastidor");
  });
});

describe("I3 — cobertura de la curación del museo", () => {
  it("100% de los hechos tiene decisión y no hay errores", () => {
    expect(REPORTE.errors).toEqual([]);
    expect(REPORTE.undecided).toEqual([]);
    expect(isGreen(REPORTE)).toBe(true);
    expect(REPORTE.totals.facts).toBe(HECHOS.length);
    expect(REPORTE.totals.included + REPORTE.totals.excluded).toBe(HECHOS.length);
  });

  it("toda exclusión tiene una razón redactada (no `n/a` ni TBD)", () => {
    expect(MUSEO_CURATION.exclude.length).toBeGreaterThan(0);
    for (const exclusion of MUSEO_CURATION.exclude) {
      expect(reasonProblem(exclusion.reason), exclusion.id).toBeUndefined();
    }
  });

  it("excluir sin `reason` es error del reporte", () => {
    const sinRazon: Curation = {
      ...MUSEO_CURATION,
      exclude: [{ id: factId("salas", "galeria"), reason: "" }]
    };
    const report = validateCuration(sinRazon, UNIVERSO);
    expect(report.errors.join("\n")).toMatch(/falta `reason`/);
    expect(isGreen(report)).toBe(false);
  });

  it("una razón placeholder no explica la decisión", () => {
    for (const reason of ["n/a", "TBD", "pendiente", "-"]) {
      expect(reasonProblem(reason), reason).not.toBeUndefined();
    }
  });

  it("un hecho nuevo del SSOT aparece SIN DECISIÓN y pone el reporte rojo", () => {
    const nuevo: CvProfile = {
      ...PERFIL,
      projects: [
        ...PERFIL.projects,
        { name: "Proyecto nuevo — sin curación", published: false, links: [], keywords: [], evidence: [] }
      ]
    };
    const universo = factUniverse(nuevo, SALAS);
    const report = validateCuration(MUSEO_CURATION, universo);
    expect(report.undecided.map((fact) => fact.id)).toContain("proyectos:Proyecto nuevo");
    expect(isGreen(report)).toBe(false);
  });

  it("una decisión sobre un hecho inexistente es error (no cobertura fantasma)", () => {
    const report = validateCuration(
      { ...MUSEO_CURATION, include: [...MUSEO_CURATION.include, "proyectos:No existe"] },
      UNIVERSO
    );
    expect(report.errors.join("\n")).toMatch(/inexistente: proyectos:No existe/);
  });

  it("un hecho incluido y excluido a la vez es error", () => {
    const report = validateCuration(
      {
        ...MUSEO_CURATION,
        exclude: [
          ...MUSEO_CURATION.exclude,
          { id: factId("proyectos", "Kontablo"), reason: "doble decisión de prueba" }
        ]
      },
      UNIVERSO
    );
    expect(report.errors.join("\n")).toMatch(/incluido y excluido a la vez/);
  });
});

describe("order — el orden se declara en la curación", () => {
  it("proyectos y publicaciones son permutaciones exactas de lo incluido", () => {
    for (const collection of ["proyectos", "publicaciones"] as const) {
      const ordered = MUSEO_CURATION.order?.[collection] ?? [];
      const included = MUSEO_CURATION.include
        .filter((id) => id.startsWith(`${collection}:`))
        .map((id) => id.slice(collection.length + 1));
      expect([...ordered].sort()).toEqual([...included].sort());
      expect(new Set(ordered).size).toBe(ordered.length);
    }
  });

  it("el orden de proyectos coincide con las fechas `recencia`", () => {
    // Si divergen, o la fecha está mal o el orden es otro: hay que decidirlo,
    // no publicar dos verdades. La fecha es la que emite `data-recencia`.
    expect(publicadosDe(PERFIL).map((project) => project.id)).toEqual([
      "profile-as-code",
      "Kontablo",
      "Drahma"
    ]);
    const ordenados = proyectosDe(PERFIL).filter((project) => project.recencia);
    const fechas = ordenados.map((project) => project.recencia!);
    expect(fechas).toEqual([...fechas].sort().reverse());
  });

  it("reordenar un proyecto cambia SÓLO la curación (DoD #128)", () => {
    const original = MUSEO_CURATION.order!.proyectos!;
    const invertido: Curation = {
      ...MUSEO_CURATION,
      order: { ...MUSEO_CURATION.order, proyectos: [...original].reverse() }
    };
    expect(proyectosDe(PERFIL).map((project) => project.id)).toEqual([...original]);
    expect(proyectosDe(PERFIL, invertido).map((project) => project.id)).toEqual([...original].reverse());
    // El resto del render no depende del orden: mismas fichas, mismas salas.
    expect(proyectosDe(PERFIL, invertido)).toHaveLength(PERFIL.projects.length);
  });

  it("excluir un proyecto lo saca de la vista sin tocar el SSOT", () => {
    const sinKontablo: Curation = {
      ...MUSEO_CURATION,
      include: MUSEO_CURATION.include.filter((id) => id !== factId("proyectos", "Kontablo")),
      exclude: [
        ...MUSEO_CURATION.exclude,
        { id: factId("proyectos", "Kontablo"), reason: "prueba de exclusión que no borra el hecho" }
      ]
    };
    expect(proyectosDe(PERFIL, sinKontablo).map((project) => project.id)).not.toContain("Kontablo");
    expect(PERFIL.projects.some((project) => project.name.startsWith("Kontablo"))).toBe(true);
  });
});

describe("salas y registro de temas", () => {
  it("la galería está oculta porque la curación la excluye (no por un literal)", () => {
    expect(isExcluded(MUSEO_CURATION, factId("salas", "galeria"))).toBe(true);
    expect(museo.rooms.filter((sala) => sala.hidden).map((sala) => sala.id)).toEqual(["galeria"]);
  });

  it("todo tema registrado tiene curación (agregar un tema sin curación es rojo)", () => {
    for (const id of themeIds()) {
      expect(CURATIONS[id], `falta curación para el tema ${id}`).toBeDefined();
      expect(curationFor(id)).toBe(CURATIONS[id]);
    }
    expect(Object.keys(THEMES).sort()).toEqual(Object.keys(CURATIONS).sort());
  });

  it("un tema desconocido falla listando los que tienen curación", () => {
    expect(() => curationFor("noexiste")).toThrow(/Temas con curación: museo/);
  });

  it("SALAS no declara visibilidad: la aplica la narrativa con SU curación", () => {
    // La estructura compartida no puede quedar atada a la curación de un tema.
    expect(SALAS.every((sala) => !("hidden" in sala))).toBe(true);
    expect(museo.rooms.filter((sala) => sala.hidden).map((sala) => sala.id)).toEqual(["galeria"]);
  });

  it("una sala presentada no hereda la clase `room--hidden` del shell", () => {
    const galeria = museo.rooms.find((sala) => sala.id === "galeria")!;
    expect(renderRoom(galeria)).toContain("room--hidden");
    expect(renderRoom({ ...galeria, hidden: false })).not.toContain("room--hidden");
  });

  it("la curación activa es la del tema vigente (render)", () => {
    expect(activeCuration()).toBe(MUSEO_CURATION);
  });
});

describe("contrato — la clasificación de experiencia es del tema", () => {
  it("MUSEO_CURATION lleva la tabla como campo del contrato", () => {
    expect(MUSEO_CURATION.experienceSections).toBe(EXPERIENCE_SECTIONS);
    expect(Object.keys(MUSEO_CURATION.experienceSections ?? {}).sort()).toEqual(
      PERFIL.experience.map(experienceKey).sort()
    );
  });

  it("experienceSectionOf resuelve con la curación que recibe (no con un import fijo)", () => {
    const row = PERFIL.experience[0]!;
    expect(experienceSectionOf(MUSEO_CURATION, row)).toBe(EXPERIENCE_SECTIONS[experienceKey(row)]);
    // Un tema sin tabla no adivina: la fila queda sin clasificar.
    const sinTabla: Curation = { include: [], exclude: [] };
    expect(experienceSectionOf(sinTabla, row)).toBeUndefined();
  });
});

describe("curatedOrder — consumidor canónico (excluye + ordena)", () => {
  it("devuelve los hechos en el orden de la colección y sin los excluidos", () => {
    const invertido: Curation = {
      ...MUSEO_CURATION,
      order: { ...MUSEO_CURATION.order, proyectos: [...MUSEO_CURATION.order!.proyectos!].reverse() }
    };
    const claves = (curation: Curation): string[] =>
      curatedOrder(curation, "proyectos", PERFIL.projects, (project) => projectKey(project.name)).map(
        (project) => projectKey(project.name)
      );
    expect(claves(invertido)).toEqual([...MUSEO_CURATION.order!.proyectos!].reverse());
    const sinKontablo: Curation = {
      ...MUSEO_CURATION,
      exclude: [
        ...MUSEO_CURATION.exclude,
        { id: factId("proyectos", "Kontablo"), reason: "exclusión de prueba, no borra el hecho" }
      ]
    };
    expect(claves(sinKontablo)).not.toContain("Kontablo");
  });
});

describe("tabla de experiencia — una sola definición", () => {
  it("clasifica exactamente las filas del SSOT", () => {
    expect(Object.keys(EXPERIENCE_SECTIONS).sort()).toEqual(
      PERFIL.experience.map(experienceKey).sort()
    );
  });
});
