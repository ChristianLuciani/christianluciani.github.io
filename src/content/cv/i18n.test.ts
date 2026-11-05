import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { projectLinks } from "../../data/proyectos";
import { PROFILE } from "../../data/profile.generated";
import type { CvProfile } from "../../data/profile.types";
import { profileI18nPairs } from "./i18n";
import { MARCO } from "./museo";

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

  it("el org presentado en ES vuelve al string invariante del SSOT en EN (F5)", () => {
    expect(PAIRS["Independiente — Panamá / Ecuador"]).toBe("Independent — Panama / Ecuador");
    expect(PAIRS["CERN — San Miguel Regla, México (beca)"]).toBe(
      "CERN — San Miguel Regla, Mexico (scholarship)"
    );
    // Nombres propios sin cambio no generan par (el MAP los deja tal cual).
    expect(PAIRS["Grupo Angel — Panamá"]).toBeUndefined();
  });

  it("la curación restaurada de `main` también se traduce (F4)", () => {
    expect(PAIRS["Publicado · v0.1.0 · Open-source"]).toBe("Published · v0.1.0 · Open-source");
    expect(PAIRS["Publicado · MIT · v0.3.6"]).toBe("Published · MIT · v0.3.6");
    expect(PAIRS["Publicado · Agosto 2024 · Repositorio público"]).toBe(
      "Published · August 2024 · Public repository"
    );
    expect(PAIRS["Publicado bajo licencia MIT, con releases etiquetados."]).toBe(
      "Published under the MIT license, with tagged releases."
    );
  });

  it("los labels de link derivados tienen par EN, con el prefijo del ancla (F1)", () => {
    // El walker traduce el nodo completo («↗ Repositorio · 618»), no el label
    // pelado: el par se emite con el mismo prefijo que renderiza la tarjeta.
    for (const project of profile.projects) {
      for (const { label } of projectLinks(project)) {
        if (label.es !== label.en) {
          expect(PAIRS[`↗ ${label.es}`]).toBe(`↗ ${label.en}`);
        }
      }
    }
    expect(PAIRS["↗ Repositorio · 618"]).toBe("↗ Repository · 618");
    expect(PAIRS["↗ Repositorio · ci-cd.md"]).toBe("↗ Repository · ci-cd.md");
  });

  it("el cierre de El Bastidor traduce las dos variantes derivadas (F3)", () => {
    for (const count of [1, 2]) {
      const closing = MARCO.closingSomePublic(count);
      expect(closing.es).toBeDefined();
      expect(PAIRS[closing.es!]).toBe(closing.en);
    }
    expect(MARCO.closingSomePublic(1).es).toContain("una ya enlaza material público");
    expect(MARCO.closingSomePublic(2).es).toContain("varias ya enlazan material público");
    // Sala vacía: la variante también viaja al MAP (F1 del 4.º pase).
    expect(PAIRS[MARCO.closingEmpty.es]).toBe(MARCO.closingEmpty.en);
  });

  it("#122: la prosa de perfil del SSOT entra al MAP como par derivado", () => {
    // Una sola pieza: el toggle EN traduce el statement por el mismo camino que
    // los demás hechos del SSOT, sin clave escrita a mano.
    expect(PAIRS[profile.positioning.statement.es!]).toBe(
      profile.positioning.statement.en
    );
    expect(PAIRS[profile.positioning.audiences.recruiters.es!]).toBe(
      profile.positioning.audiences.recruiters.en
    );
  });

  it("#122: el claim de años no sobrevive en el diccionario", () => {
    const mapSource = readFileSync(resolve(process.cwd(), "src", "cv", "i18n.ts"), "utf8");
    for (const claim of ["más de 20 años", "over 20 years", "more than 20 years"]) {
      expect(mapSource, claim).not.toContain(claim);
      for (const [es, en] of Object.entries(PAIRS)) {
        expect(`${es}\n${en}`, claim).not.toContain(claim);
      }
    }
  });

  it("el MAP no transporta el claim prohibido de claims.json (F7)", () => {
    // El claim vive en `claims.json → forbidden[]` del SSOT. El diccionario
    // runtime lo tenía hardcodeado y viajaba en el bundle: este guard falla si
    // vuelve, por la vía del MAP o de cualquier par derivado.
    const forbidden = [
      "5 publicaciones co-autoradas",
      "5 co-authored publications",
      "5 co-authored papers"
    ];
    const mapSource = readFileSync(resolve(process.cwd(), "src", "cv", "i18n.ts"), "utf8");
    for (const claim of forbidden) expect(mapSource, claim).not.toContain(claim);
    for (const [es, en] of Object.entries(PAIRS)) {
      for (const claim of forbidden) {
        expect(`${es}\n${en}`, claim).not.toContain(claim);
      }
    }
  });
});
