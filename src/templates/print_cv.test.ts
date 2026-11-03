/**
 * print-CV (#108): el artefacto que un reclutador descarga se DERIVA del SSOT.
 *
 * Contrato:
 * - `print_cv_html.ts` no contiene hechos (fechas, cargos, publicaciones, conteos):
 *   todo sale de `PROFILE` + `src/content/cv/print.ts` (curación D2).
 * - Los drifts históricos del print quedan corregidos: Magic Dreams 2011–2014
 *   (no 2010–2013), las dos etapas de Grupo Angel (2016–2018 y 2025–2026) y las
 *   publicaciones completas del SSOT (sin conteos escritos a mano).
 * - El footer de procedencia vive dentro de `#print-cv`: aparece en print/PDF y
 *   nunca en pantalla (el bloque está oculto por CSS).
 * - El layout histórico (A4, mismas clases/secciones, mismo CSS del QR) se sostiene.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PRINT_CV } from "../content/cv/print";
import { PROFILE } from "../data/profile.generated";
import type { CvProfile } from "../data/profile.types";
import { assembleHtml } from "./index";
import { printCvHtml } from "./print_cv_html";

const profile = PROFILE as unknown as CvProfile;
const HTML = printCvHtml(profile);
const RENDERER = readFileSync(resolve(process.cwd(), "src", "templates", "print_cv_html.ts"), "utf8");
const ASSEMBLED = assembleHtml();

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("print-CV — renderer sin hechos hardcodeados", () => {
  it("el template no contiene años, cargos, orgs, nombres ni títulos", () => {
    expect(RENDERER).not.toMatch(/\b(19|20)\d{2}\b/);
    for (const fact of ["Christian Luciani", "USFQ", "Magic Dreams", "Grupo Angel", "Kontablo", "CERN"]) {
      expect(RENDERER).not.toContain(fact);
    }
  });

  it("no quedan conteos ni rangos escritos a mano", () => {
    expect(RENDERER).not.toMatch(/co-autoradas|arbitradas|5 publicaciones/);
    expect(HTML).not.toContain("5 publicaciones");
    expect(HTML).not.toContain("2010 – 2013");
  });

  it("un fixture con otro `role` cambia el HTML (los hechos entran por parámetro)", () => {
    const original = profile.experience[0].role.es!;
    const fixture: CvProfile = {
      ...profile,
      experience: [
        { ...profile.experience[0], role: { en: "Compliance Officer", es: "Oficial de Cumplimiento" } },
        ...profile.experience.slice(1)
      ]
    };
    const changed = printCvHtml(fixture);
    expect(changed).toContain("Oficial de Cumplimiento");
    expect(changed).not.toContain(original);
    expect(changed).not.toBe(HTML);
  });

  it("un fixture con otra publicación cambia el número de filas", () => {
    const fixture: CvProfile = {
      ...profile,
      publications: [
        ...profile.publications,
        { title: "Fixture paper", venue: "Fixture venue", year: 2030, url: "https://example.org/fixture" }
      ]
    };
    const changed = printCvHtml(fixture);
    expect(occurrences(changed, 'class="p-pub"')).toBe(profile.publications.length + 1);
    expect(changed).toContain("Fixture paper");
  });
});

describe("print-CV — drifts del SSOT corregidos", () => {
  it("Magic Dreams: 2011 – 2014 (el rango viejo no aparece)", () => {
    expect(HTML).toContain("Magic Dreams Productions — Panamá");
    expect(HTML).toContain("2011 – 2014");
    expect(HTML).not.toContain("2010 – 2013");
    expect(HTML).toContain("2011");
  });

  it("Grupo Angel: dos empleadores y dos períodos, incluido el rol 2025–2026", () => {
    expect(occurrences(HTML, "Grupo Angel — Panamá")).toBe(2);
    expect(HTML).toContain("Auditor y Consultor");
    expect(HTML).toContain("2025 – 2026");
    expect(HTML).toContain("Oficial de Bóveda — Diseño del Sistema de Registro y Auditoría");
  });

  it("publicaciones: una fila por publicación del SSOT, con sus títulos", () => {
    expect(occurrences(HTML, 'class="p-pub"')).toBe(profile.publications.length);
    for (const publication of profile.publications) {
      expect(HTML).toContain(publication.title.replace(/&/g, "&amp;").slice(0, 40));
    }
    expect(HTML).not.toContain("36 guías de prácticas de laboratorio");
  });

  it("experiencia ordenada por end desc / start desc", () => {
    const present = HTML.indexOf("Consultor Estratégico de Sistemas");
    const angel2025 = HTML.indexOf("Auditor y Consultor");
    const usfq = HTML.indexOf("Coordinador de Laboratorios de Física");
    expect(present).toBeGreaterThan(-1);
    expect(present).toBeLessThan(angel2025);
    expect(angel2025).toBeLessThan(usfq);
    expect(HTML).toContain("2025 – PRESENTE");
  });

  it("formación, skills e idiomas se renderizan desde PROFILE", () => {
    expect(occurrences(HTML, "p-edu")).toBe(profile.education.length);
    expect(occurrences(HTML, 'class="p-skill"')).toBe(profile.skills.length);
    expect(HTML).toContain("Licenciatura en Física");
    expect(HTML).toContain("Español (nativo)");
    expect(HTML).toContain("Inglés (intermedio)");
    expect(HTML).toContain("Francés (intermedio)");
  });

  it("contacto derivado de identity + links (sin email fuera del snapshot)", () => {
    expect(HTML).toContain("Christian Luciani");
    expect(HTML).toContain("Cuenca, Ecuador");
    expect(HTML).toContain("christianluciani.github.io");
    expect(HTML).toContain("wa.me/593993716335");
    expect(HTML).toContain("orcid.org/0000-0002-6955-5384");
    expect(HTML).toContain("github.com/ChristianLuciani");
    expect(HTML).not.toContain("cluciani@gmail.com");
  });
});

describe("print-CV — footer de procedencia (solo print)", () => {
  it("contiene el pin del SSOT y su fecha", () => {
    expect(HTML).toContain(`generado desde profile-data @ ${profile.source.commit}`);
    expect(HTML).toContain(profile.source.commitDate!);
  });

  it("declara la ausencia de fecha en vez de inventarla", () => {
    const fixture: CvProfile = {
      ...profile,
      source: { ...profile.source, commitDate: null }
    };
    expect(printCvHtml(fixture)).toContain(PRINT_CV.labels.footerNoDate);
  });

  it("vive dentro de #print-cv, que está oculto en pantalla y visible al imprimir", () => {
    expect(occurrences(ASSEMBLED, 'class="p-footer"')).toBe(1);
    const footer = ASSEMBLED.indexOf('class="p-footer"');
    expect(footer).toBeGreaterThan(ASSEMBLED.indexOf('id="print-cv"'));
    expect(footer).toBeLessThan(ASSEMBLED.indexOf('<header class="hud">'));
    expect(ASSEMBLED).toContain("#print-cv { display:none; }");
  });
});

describe("print-CV — layout A4 intacto", () => {
  it("conserva A4, secciones y CSS del QR", () => {
    expect(ASSEMBLED).toContain("@page { margin:2cm; size:A4; }");
    for (const klass of ['class="p-head"', 'class="p-section"', 'class="p-entry p-exp"']) {
      expect(HTML).toContain(klass);
    }
    expect(HTML).toContain("#print-cv .qr-wrap img { width:30mm; height:30mm; }");
    expect(HTML).toContain('src="assets/qr-site.svg"');
  });

  it("es determinista: mismo PROFILE → mismo HTML byte a byte", () => {
    expect(printCvHtml(profile)).toBe(HTML);
  });
});
