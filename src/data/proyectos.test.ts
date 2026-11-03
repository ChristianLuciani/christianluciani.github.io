import { describe, expect, it } from "vitest";
import { PROYECTOS, enDesarrollo, publicados } from "./proyectos";

/**
 * El orden de las tarjetas NO es el orden de edición del array: es el que
 * deriva `recencia` (más reciente primero). Estos tests fijan ese contrato y
 * que una ficha sin fecha verificable quede al final, nunca inventada.
 */

const fechas = (lista: readonly { recencia?: string }[]) =>
  lista.map((p) => p.recencia ?? "");

describe("PROYECTOS — orden de tarjetas por recencia", () => {
  it("El Marco: más reciente primero (profile-as-code, Kontablo, Drahma)", () => {
    expect(publicados.map((p) => p.id)).toEqual([
      "profile-as-code",
      "kontablo",
      "drahma"
    ]);
    expect(fechas(publicados)).toEqual([...fechas(publicados)].sort().reverse());
  });

  it("El Bastidor: más reciente primero y la ficha sin fecha al final", () => {
    expect(enDesarrollo.map((p) => p.id)).toEqual([
      "topia",
      "clapps",
      "nelson-companion",
      "estelectica",
      "zentropy",
      "physics-lab-guides",
      "noos"
    ]);
    const conFecha = enDesarrollo.filter((p) => p.recencia);
    expect(fechas(conFecha)).toEqual([...fechas(conFecha)].sort().reverse());
    expect(enDesarrollo.filter((p) => !p.recencia).map((p) => p.id)).toEqual([
      "noos"
    ]);
  });

  it("ids únicos y fechas ISO cuando existen", () => {
    const ids = PROYECTOS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PROYECTOS) {
      if (p.recencia) expect(p.recencia).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("CLAPPS.AI declara el nombre completo, no solo el acrónimo", () => {
    const clapps = PROYECTOS.find((p) => p.id === "clapps");
    expect(clapps).toBeDefined();
    expect(clapps!.html).toContain("Comprehensive Learning Applications");
    expect(clapps!.html).not.toContain("Learning Applications Platform");
  });
});
