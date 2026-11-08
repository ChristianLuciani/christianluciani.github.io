import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SALAS } from "../cv/salas";
import { enDesarrolloDe } from "../data/proyectos";
import { profileProse } from "../content/cv/profile-prose";
import { PROFILE } from "../data/profile.generated";
import { contactEmail, contactLinks } from "../content/cv/contacto";
import { ENTITY } from "../data/entity.generated";
import { PROFILE_COMMIT, PROFILE_ENGINE, provenanceHtml } from "../data/profile.provenance";
import type { CvProfile } from "../data/profile.types";
import {
  bastidorHtml,
  drahmaShowcase,
  frisoHtml,
  marcoHtml,
  primerArtefacto,
  roomBody,
  roomsHtml
} from "./sala_html";

const profile = PROFILE as unknown as CvProfile;
const FRISO = frisoHtml(profile);

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("primerArtefacto — el hit de tarjeta completa", () => {
  it("toma el primer enlace y conserva target=_blank", () => {
    const html = '<div><a class="pub-doi" href="https://x.test/repo" target="_blank">↗ Repositorio</a></div>';
    expect(primerArtefacto(html)).toEqual({ href: "https://x.test/repo", blank: true });
  });

  it("sin enlace no hay hit: la ficha no finge un click", () => {
    expect(primerArtefacto(undefined)).toBeNull();
    expect(primerArtefacto('<div class="project-note">Sin artefacto</div>')).toBeNull();
  });
});

describe("El Friso — hechos desde PROFILE.experience (#109)", () => {
  it("renderiza una entrada por experiencia del SSOT, sin cargos hardcodeados", () => {
    expect(occurrences(FRISO, 'class="entry"')).toBe(profile.experience.length);
    expect(occurrences(FRISO, 'class="entry-period"')).toBe(profile.experience.length);
    // El período 2025–2026 de Grupo Angel y el rol que lo explica están visibles.
    expect(FRISO).toContain("2025 – 2026");
    expect(FRISO).toContain("Auditor y Consultor");
    expect(FRISO).toContain("Grupo Angel — Panamá");
    expect(FRISO).toContain("2025 – PRESENTE");
  });

  it("corrige los drifts históricos: Magic Dreams 2011–2014 y sin «5 publicaciones»", () => {
    expect(FRISO).toContain("2011 – 2014");
    expect(FRISO).not.toContain("2010 – 2013");
    expect(FRISO).not.toContain("5 publicaciones");
    expect(FRISO).toContain("co-autor de 3 arbitradas");
  });

  it("ordena por end desc / start desc", () => {
    const present = FRISO.indexOf("Consultor Estratégico de Sistemas");
    const angel2025 = FRISO.indexOf("Auditor y Consultor");
    const usfq = FRISO.indexOf("Coordinador de Laboratorios de Física");
    const magic = FRISO.indexOf("Productor y Ejecutivo de Cuentas");
    expect(present).toBeGreaterThan(-1);
    expect(present).toBeLessThan(angel2025);
    expect(angel2025).toBeLessThan(usfq);
    expect(usfq).toBeLessThan(magic);
  });

  it("el rótulo de la sala no miente sobre el inicio del empleo (F2)", () => {
    // El SSOT mezcla empleo y eventos formativos sin un campo que los distinga;
    // rotular «EXPERIENCIA PROFESIONAL» con el mínimo de TODO experience[] daría
    // 1998 como inicio de empleo. La sala declara «TRAYECTORIA» y el rango real.
    const experiencia = SALAS.find((s) => s.id === "experiencia")!;
    const minYear = profile.experience
      .map((e) => e.start.slice(0, 4))
      .sort()[0];
    expect(experiencia.subtitulo).toBe(`TRAYECTORIA · ${minYear} – PRESENTE`);
    expect(experiencia.subtitulo).not.toMatch(/EXPERIENCIA PROFESIONAL/);
    // La mitad EN tiene el mismo contrato: un cambio futuro que reintroduzca
    // «PROFESSIONAL EXPERIENCE» en `subtituloEn` tiene que ponerse rojo (F5).
    expect(experiencia.subtituloEn).toBe(`TRAJECTORY · ${minYear} – PRESENT`);
    expect(experiencia.subtituloEn).not.toMatch(/PROFESSIONAL EXPERIENCE/);
    expect(experiencia.funcion).toContain("empleo, formación y talleres");
    expect(experiencia.funcion).not.toContain("Trayectoria profesional");
  });

  it("presenta el org en ES sin traducir nombres propios (F5)", () => {
    expect(FRISO).toContain("Independiente — Panamá / Ecuador");
    expect(FRISO).not.toContain("Independent — Panama / Ecuador");
    expect(FRISO).toContain("CERN — San Miguel Regla, México (beca)");
    // El org del SSOT sigue siendo string invariante (regla de #115).
    for (const e of profile.experience) expect(typeof e.org).toBe("string");
  });

  it("un fixture con otro `role` cambia el HTML de El Friso", () => {
    const fixture: CvProfile = {
      ...profile,
      experience: [
        { ...profile.experience[0], role: { en: "Compliance Officer", es: "Oficial de Cumplimiento" } },
        ...profile.experience.slice(1)
      ]
    };
    const changed = frisoHtml(fixture);
    expect(changed).toContain("Oficial de Cumplimiento");
    expect(changed).not.toContain("Auditor y Consultor");
    expect(changed).not.toBe(FRISO);
  });

  it("el renderer de El Friso no contiene cargos, orgs ni fechas", () => {
    const source = readFileSync(resolve(process.cwd(), "src", "templates", "sala_html.ts"), "utf8");
    // Sólo el bloque de El Friso: el resto de las salas conserva sus hechos
    // hasta el resto de #99 (no-goal explícito de este issue).
    const from = source.indexOf("function compararExperiencia");
    const to = source.indexOf("export function roomBodies");
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const frisoSource = source.slice(from, to);
    expect(frisoSource).not.toMatch(/\b(19|20)\d{2}\b/);
    for (const fact of ["Consultor Estratégico", "Magic Dreams", "Grupo Angel", "USFQ"]) {
      expect(frisoSource).not.toContain(fact);
    }
  });
});

describe("El Marco / El Bastidor — split desde artifactRefs (#109)", () => {
  const MARCO = marcoHtml(profile);
  const BASTIDOR = bastidorHtml(profile);

  it("El Marco cuelga exactamente las fichas publicadas (menos el showcase)", () => {
    const publicadas = profile.projects.filter((p) => p.published);
    expect(occurrences(MARCO, '<div class="project-card')).toBe(publicadas.length - 1); // Drahma = showcase
    expect(MARCO).toContain('class="drahma-showcase"');
    expect(occurrences(BASTIDOR, '<div class="project-card')).toBe(
      profile.projects.filter((p) => !p.published).length
    );
    expect(BASTIDOR).not.toContain('class="drahma-showcase"');
  });

  it("el showcase de Drahma deriva nombre, estado, descripción, link y fecha", () => {
    const drahma = profile.projects.find((p) => p.name.startsWith("Drahma"))!;
    expect(MARCO).toContain("<em>Drahma</em>");
    // La píldora curada restaura el detalle de `main`; el SSOT decide la sala.
    expect(MARCO).toContain("Publicado · Agosto 2024 · Repositorio público");
    expect(MARCO).toContain(drahma.description!.es!.slice(0, 60));
    expect(MARCO).toContain('href="https://github.com/DRAHMAN-ORG/drahman-org"');
    expect(MARCO).toContain("AGOSTO 2024");
  });

  it("El Bastidor declara la razón curada de cada ficha", () => {
    expect(occurrences(BASTIDOR, 'class="project-falta"')).toBe(
      profile.projects.filter((p) => !p.published).length
    );
    expect(BASTIDOR).toContain("Para publicarse");
    expect(BASTIDOR).toContain("el primer número publicado.");
  });

  it("la píldora curada no pisa el status del SSOT si `published` no coincide (F4)", () => {
    // Fixture cruzado: Drahma tiene statusLabel curado («Publicado · Agosto
    // 2024 ·…»). Si el SSOT deja de publicarlo, la ficha no puede seguir
    // afirmando «Publicado» desde la curación.
    const noPublicado: CvProfile = {
      ...profile,
      projects: profile.projects.map((p) =>
        p.name.startsWith("Drahma") ? { ...p, published: false } : p
      )
    };
    const showcase = drahmaShowcase(noPublicado);
    const pill = /<span class="project-status ([^"]+)">([^<]*)<\/span>/.exec(showcase);
    expect(pill).not.toBeNull();
    expect(pill![1]).toBe("status-private");
    expect(pill![2]).not.toMatch(/Publicado/);
    expect(pill![2]).toContain("Sin artefacto público");
    expect(showcase).not.toContain("Publicado · Agosto 2024 · Repositorio público");
  });

  it("el cierre cuantifica el dato real: hoy una sola ficha enlaza material público (F3)", () => {
    // 8 fichas en El Bastidor; sólo Upstream Open Source Contributions (4 PRs)
    // enlaza material público. Afirmar «varias» sería falso: el cuantificador
    // se deriva del número de fichas con links.
    const conLinks = enDesarrolloDe(profile).filter((p) => p.links.length > 0);
    expect(conLinks.map((p) => p.id)).toEqual(["Upstream Open Source Contributions"]);
    expect(BASTIDOR).toContain("una ya enlaza material público");
    expect(BASTIDOR).not.toContain("varias ya enlazan material público");
    // El plural también es derivado: una segunda ficha con link → «varias».
    const dosConLinks: CvProfile = {
      ...profile,
      projects: profile.projects.map((p) =>
        p.name.startsWith("NOOS") ? { ...p, links: ["https://example.test/noos"] } : p
      )
    };
    expect(bastidorHtml(dosConLinks)).toContain("varias ya enlazan material público");
    // Sin links públicos, vuelve la variante fuerte.
    const sinLinks: CvProfile = {
      ...profile,
      projects: profile.projects.map((p) => ({ ...p, links: [], evidence: [] }))
    };
    expect(bastidorHtml(sinLinks)).toContain(
      "Ninguna ficha de esta sala tiene todavía un artefacto que un tercero pueda abrir"
    );
  });

  it("el cierre se deriva del dato: una ficha sin `falta` cambia la afirmación (F2)", () => {
    // Fixture: un proyecto nuevo del SSOT, no publicado y sin curación. La
    // tarjeta no tiene `falta`; el cierre no puede seguir afirmando que cada
    // una dice qué le falta (lo hacía por accidente del SSOT 8/8).
    const sinCuracion: CvProfile = {
      ...profile,
      projects: [
        ...profile.projects,
        {
          name: "Proyecto sin curación",
          published: false,
          links: [],
          keywords: [],
          evidence: []
        }
      ]
    };
    const html = bastidorHtml(sinCuracion);
    expect(occurrences(html, '<div class="project-card')).toBe(9);
    expect(occurrences(html, 'class="project-falta"')).toBe(8);
    expect(html).toContain("sólo 8 de 9 declaran qué les falta");
    expect(html).not.toContain("y cada una dice qué le falta");
  });

  it("sala vacía: 0 tarjetas y un cierre que no afirma sobre entradas (F1)", () => {
    const todasPublicadas: CvProfile = {
      ...profile,
      projects: profile.projects.map((p) => ({ ...p, published: true }))
    };
    const html = bastidorHtml(todasPublicadas);
    expect(occurrences(html, '<div class="project-card')).toBe(0);
    expect(html).toContain("Esta sala está vacía");
    expect(html).not.toContain("y cada una dice qué le falta");
    expect(html).not.toContain("Ninguna ficha");
  });

  it("restaura la curación de `main` que el SSOT no lleva (F4)", () => {
    expect(MARCO).toContain("Publicado · v0.1.0 · Open-source");
    expect(MARCO).toContain("Publicado · MIT · v0.3.6");
    expect(MARCO).toContain("Business Source License 1.1");
    expect(MARCO).toContain("convierte a Apache 2.0");
    expect(MARCO).toContain("papers.ssrn.com/sol3/papers.cfm?abstract_id=6960598");
    expect(MARCO).toContain("researchgate.net/publication/407549570");
    expect(MARCO).toContain("Publicado bajo licencia MIT, con releases etiquetados.");
  });

  it("un proyecto que pasa a publicado cambia de sala (fixture)", () => {
    const fixture: CvProfile = {
      ...profile,
      projects: profile.projects.map((p) =>
        p.name.startsWith("Topia") ? { ...p, published: true } : p
      )
    };
    expect(occurrences(marcoHtml(fixture), '<div class="project-card')).toBe(
      occurrences(MARCO, '<div class="project-card') + 1
    );
    expect(occurrences(bastidorHtml(fixture), '<div class="project-card')).toBe(
      occurrences(BASTIDOR, '<div class="project-card') - 1
    );
  });
});

describe("traza de procedencia (#109 / #108)", () => {
  it("la página muestra profile-data @ <sha> y la versión de pasco", () => {
    const html = provenanceHtml();
    expect(PROFILE_COMMIT).toMatch(/^[0-9a-f]{40}$/);
    expect(html).toContain(`profile-data @`);
    expect(html).toContain(`<code>${PROFILE_COMMIT}</code>`);
    expect(PROFILE_ENGINE.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(html).toContain(`pasco ${PROFILE_ENGINE.version}`);
    expect(html).toContain('href="https://github.com/ChristianLuciani/profile-as-code"');
  });

  it("engine/schema se leen del header autogenerado, no de una copia a mano", () => {
    const header = readFileSync(resolve(process.cwd(), "src", "data", "profile.generated.ts"), "utf8")
      .split("\n")
      .slice(0, 8)
      .join("\n");
    expect(header).toContain(`engine @ ${PROFILE_ENGINE.version}`);
    expect(header).toContain(`schema v${PROFILE_ENGINE.schema}`);
  });
});

describe("sala Perfil — una sola prosa, derivada del SSOT (#122)", () => {
  const SALA_PERFIL = SALAS.find((s) => s.id === "perfil")!;
  const ROOMS = roomsHtml();

  it("la sala imprime `positioning.statement` y pierde el claim de años", () => {
    expect(ROOMS).toContain(profileProse(profile).es!);
    expect(ROOMS).not.toContain("más de 20 años");
    expect(ROOMS).not.toContain("20 años");
  });

  it("mover el statement en el SSOT mueve la sala (misma pieza que el print)", () => {
    const fixture: CvProfile = {
      ...profile,
      positioning: {
        ...profile.positioning,
        statement: { es: "Prosa fixture del SSOT.", en: "Fixture statement." }
      }
    };
    const body = roomBody(SALA_PERFIL, fixture);
    expect(body).toContain("Prosa fixture del SSOT.");
    expect(body).not.toContain(profileProse(profile).es!);
  });

  it("F1: un `es` vacío imprime el EN del MISMO campo (no un párrafo vacío)", () => {
    const fixture: CvProfile = {
      ...profile,
      positioning: {
        ...profile.positioning,
        statement: { es: "", en: "Statement only in English." } as never
      }
    };
    const body = roomBody(SALA_PERFIL, fixture);
    expect(body).toContain("Statement only in English.");
    expect(body).not.toContain('<p class="profile-text"></p>');
  });

  it("sin `statement` la sala usa el fallback declarado (no una copia a mano)", () => {
    const fixture: CvProfile = {
      ...profile,
      positioning: { ...profile.positioning, statement: undefined as never }
    };
    expect(roomBody(SALA_PERFIL, fixture)).toContain(
      profile.positioning.audiences.recruiters.es!
    );
  });
});

/**
 * El Buzón copiaba las URL a mano en el template: el link de Substack del SSOT
 * (#33) llegó al JSON-LD pero nunca a la página (#157 no lo renderizó). La
 * paridad 1:1 con `identity.links` cierra la clase: agregar un link al SSOT lo
 * hace aparecer acá, y una fila literal nueva rompe este test.
 */
describe("El Buzón — paridad 1:1 con identity.links", () => {
  const HTML = roomsHtml();
  const HREFS = [...HTML.matchAll(/<a class="contact-link" href="([^"]+)"/g)].map((m) => m[1]);

  it("renderiza una fila por link de contacto del SSOT, en su orden", () => {
    expect(HREFS.slice(1)).toEqual(contactLinks(profile).map((link) => link.url));
  });

  it("el mailto es el email del JSON-LD (ENTITY), no un literal que puede divergir", () => {
    // La sala y el `<script type="application/ld+json">` leen el MISMO `ENTITY`
    // (`contactEmail()`): si profile-data cambia `Person.email`, cambian los dos.
    const person = ENTITY.nodes.find((node) => node["@type"] === "Person") as
      | { email?: string }
      | undefined;
    expect(contactEmail()).toBe(person?.email);
    expect(HREFS[0]).toBe(`mailto:${person!.email}`);
    expect(HTML).toContain(`>${person!.email}</a>`);
  });

  it("el Substack del SSOT llega a la página, no sólo al JSON-LD", () => {
    expect(HREFS).toContain("https://cluciani.substack.com");
    expect(HTML).toContain('src="assets/icons/substack.svg"');
  });
});
