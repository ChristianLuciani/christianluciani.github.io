import { describe, expect, it } from "vitest";
import { PROFILE } from "../../data/profile.generated";
import type { CvProfile } from "../../data/profile.types";
import { profileI18nPairs } from "./i18n";

const profile = PROFILE as unknown as CvProfile;
const PAIRS = profileI18nPairs(profile);

/**
 * El toggle ES/EN traduce por nodo de texto con la cadena ES como clave. Estos
 * pares se DERIVAN del SSOT (rol, highlights, descripción base) y de la curación
 * (falta, labels): un hecho nuevo entra traducido sin editar el diccionario.
 */
describe("i18n del SSOT — pares ES→EN derivados", () => {
  it("cada rol de El Friso y cada descripción de proyecto tienen par EN", () => {
    for (const item of profile.experience) {
      // Un nombre propio ES=EN no necesita par (el MAP traduce sólo si difieren).
      if (item.role.es && item.role.es !== item.role.en) {
        expect(PAIRS[item.role.es]).toBe(item.role.en);
      }
      for (let i = 0; i < (item.highlights?.es?.length ?? 0); i++) {
        const en = item.highlights?.en?.[i];
        if (en) expect(PAIRS[item.highlights!.es![i]]).toBe(en);
      }
    }
    for (const project of profile.projects) {
      const es = project.description?.es;
      const en = project.description?.en;
      if (es && en && es !== en) expect(PAIRS[es]).toBe(en);
    }
  });

  it("los períodos traducen PRESENTE→PRESENT y las etiquetas de estado también", () => {
    expect(PAIRS["2025 – PRESENTE"]).toBe("2025 – PRESENT");
    expect(PAIRS["Publicado · Artefacto público"]).toBe("Published · Public artifact");
    expect(PAIRS["Activo · Sin artefacto público"]).toBe("Active · No public artifact");
  });

});
