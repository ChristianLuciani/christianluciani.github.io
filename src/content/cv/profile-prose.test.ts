/**
 * Prosa de perfil — una sola pieza derivada del SSOT (issue #122).
 *
 * El claim «más de 20 años» vivía escrito a mano en dos archivos (print y sala)
 * con dos redacciones distintas y sin respaldo en el SSOT. Este contrato fija
 * lo que lo reemplaza: una SELECCIÓN de campo (`PROFILE.positioning`), un
 * fallback declarado y ninguna copia de texto.
 */
import { describe, expect, it } from "vitest";
import { PROFILE } from "../../data/profile.generated";
import type { CvProfile } from "../../data/profile.types";
import {
  PROFILE_PROSE,
  profileProse,
  profileProseField,
  type ProfileProseSelection
} from "./profile-prose";

const profile = PROFILE as unknown as CvProfile;

/** Perfil de fixture: sólo cambia lo que el test necesita mover. */
function fixture(overrides: Partial<CvProfile["positioning"]>): CvProfile {
  return {
    ...profile,
    positioning: { ...profile.positioning, ...overrides } as CvProfile["positioning"]
  };
}

describe("prosa de perfil — selección de campo del SSOT", () => {
  it("la selección canónica es `statement` con `audiences.recruiters` de fallback", () => {
    expect(PROFILE_PROSE.field).toBe("positioning.statement");
    expect(PROFILE_PROSE.fallback).toBe("positioning.audiences.recruiters");
    // La selección NO transporta texto: si alguien vuelve a pegar la prosa acá,
    // este gate lo dice (el valor es una ruta, no una frase).
    expect(JSON.stringify(PROFILE_PROSE)).not.toMatch(/Físico|Physicist|años|years/);
  });

  it("resuelve el campo pedido contra PROFILE (ES y EN del mismo dato)", () => {
    expect(profileProseField(profile, "positioning.statement")).toBe(
      profile.positioning.statement
    );
    expect(profileProseField(profile, "positioning.audiences.recruiters")).toBe(
      profile.positioning.audiences.recruiters
    );
  });

  it("sin statement cae al fallback declarado del SSOT, nunca a una copia a mano", () => {
    const withoutStatement = fixture({ statement: undefined as never });
    expect(profileProse(withoutStatement).es).toBe(
      profile.positioning.audiences.recruiters.es
    );
  });

  it("sin statement ni fallback rompe con la razón exacta (ni vacío ni silencio)", () => {
    const empty = fixture({ statement: undefined as never, audiences: {} });
    expect(() => profileProse(empty)).toThrow(/prosa de perfil/);
    expect(() => profileProse(empty)).toThrow(/positioning\.statement/);
  });

  it("acepta una selección explícita (el campo no está hardcodeado en el lector)", () => {
    const selection: ProfileProseSelection = {
      field: "positioning.audiences.recruiters",
      fallback: "positioning.statement"
    };
    expect(profileProse(profile, selection).es).toBe(
      profile.positioning.audiences.recruiters.es
    );
  });

  it("un `es` vacío cae al EN del MISMO campo antes de saltar al fallback", () => {
    const onlyEn = fixture({
      statement: { en: "Statement only in English.", es: "" } as never
    });
    expect(profileProse(onlyEn)).toEqual({ en: "Statement only in English.", es: "" });
  });
});
