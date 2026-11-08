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
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { printCvCuration, experienceKey, experienceSectionOf } from "../content/cv/print";
import { EXPERIENCE_SECTIONS } from "../content/curation/museo";
import { orgEs } from "../content/cv/org";
import { PROFILE_PROSE, profileProse } from "../content/cv/profile-prose";
import { PROFILE } from "../data/profile.generated";
import type { CvProfile } from "../data/profile.types";
import { assembleHtml } from "./index";
import { printCvHtml } from "./print_cv_html";
import { PRINT_LOGO_PATH, PRINT_RULE_COLOR } from "./print-tokens";
import { SKIN_SOURCE, emitSkinCss, tokenDeclarations } from "../themes/museo/skin.ts";

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

  // El `role` es parte de la CLAVE de curación: cambiarlo en un fixture debe
  // romper el render (lo cubre el test F1 de entrada sin clasificar), no
  // cambiar la salida. Acá se mueven hechos que no son clave: nombre y `end`.
  it("un fixture con otros hechos cambia el HTML (los hechos entran por parámetro)", () => {
    const fixture: CvProfile = {
      ...profile,
      identity: { ...profile.identity, name: "Nombre Fixture" },
      experience: profile.experience.map((item, index) =>
        index === 0 ? { ...item, end: "2027-01-01" } : item
      )
    };
    const changed = printCvHtml(fixture);
    expect(changed).toContain("Nombre Fixture");
    expect(changed).toContain("2025 – 2027");
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

  it("contacto derivado de identity + links (el email no está en PROFILE)", () => {
    expect(HTML).toContain("Christian Luciani");
    expect(HTML).toContain("Cuenca, Ecuador");
    expect(HTML).toContain("christianluciani.github.io");
    expect(HTML).toContain("wa.me/593993716335");
    expect(HTML).toContain("orcid.org/0000-0002-6955-5384");
    expect(HTML).toContain("github.com/ChristianLuciani");
    expect(HTML).not.toContain("cluciani@gmail.com");
  });

  it("F3: documenta la omisión del email como «no está en PROFILE», no como privacidad", () => {
    expect(RENDERER).toMatch(/NO ESTÁ EN `PROFILE`/);
    expect(RENDERER).not.toMatch(/privacidad|privacy/i);
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
    expect(printCvHtml(fixture)).toContain(printCvCuration().labels.footerNoDate);
  });

  it("vive dentro de #print-cv, que está oculto en pantalla y visible al imprimir", () => {
    // Una variante por idioma (#160): un footer en cada bloque.
    expect(occurrences(ASSEMBLED, 'class="p-footer"')).toBe(2);
    const footer = ASSEMBLED.indexOf('class="p-footer"');
    expect(footer).toBeGreaterThan(ASSEMBLED.indexOf('id="print-cv"'));
    expect(footer).toBeLessThan(ASSEMBLED.indexOf('<header class="hud">'));
    expect(ASSEMBLED).toContain("#print-cv, #print-cv-en { display:none; }");
  });

  it("F2: es el ÚLTIMO hijo de #print-cv (no abre una página huérfana detrás)", () => {
    const start = HTML.indexOf('<div class="p-footer">');
    const end = HTML.indexOf("</div>", start) + "</div>".length;
    expect(start).toBeGreaterThan(-1);
    // Después del footer sólo queda el cierre del bloque contenedor: nada que
    // pudiera empujarlo a una página propia.
    expect(HTML.slice(end).trim()).toBe("</div>");
    expect(HTML.lastIndexOf('class="p-section')).toBeLessThan(start);
  });

  it("F2: el footer y el bloque que lo precede declaran no-corte", () => {
    expect(HTML).toMatch(/#print-cv \.p-footer\s*\{[^}]*break-inside:avoid;[^}]*break-before:avoid;/);
    expect(HTML).toMatch(/#print-cv \.p-section\.p-keep\s*\{[^}]*break-inside:avoid;[^}]*break-before:avoid;/);
    const sections = [...HTML.matchAll(/<div class="p-section([^"]*)">/g)];
    expect(sections.at(-1)?.[1]).toContain("p-keep");
  });
});

describe("print-CV — F1: dos secciones de Trayectoria (curación D2)", () => {
  // El universo sale de la proyección, no de una lista copiada a mano: si el
  // SSOT agrega, renombra o quita una fila, este gate lo dice. La tabla de
  // curación sólo puede espejar las claves de PROFILE.experience.
  const profileKeys = profile.experience.map(experienceKey);

  it("la tabla cubre exactamente las claves de PROFILE.experience (ni falta ni sobra)", () => {
    expect(new Set(profileKeys).size, "claves de fila únicas").toBe(profile.experience.length);
    const tableKeys = Object.keys(EXPERIENCE_SECTIONS).sort();
    // Las dos direcciones: una fila nueva sin clasificar rompe, y una fila de la
    // tabla que ya no existe en el SSOT (hecho renombrado/eliminado) también.
    expect(tableKeys).toEqual([...profileKeys].sort());
    expect(tableKeys).toHaveLength(profile.experience.length);
    for (const key of profileKeys) expect(EXPERIENCE_SECTIONS[key], key).toBeDefined();
  });

  it("una entrada nueva del SSOT sin fila rompe la cobertura (no queda obsoleta en silencio)", () => {
    const fixtureKeys = [
      ...profileKeys,
      experienceKey({ org: "Fixture Org", role: { en: "Fixture", es: "Fixture" }, start: "2020-01-01" })
    ].sort();
    // La tabla no cubre el universo del fixture: el gate de arriba fallaría con
    // la clave faltante, y el render falla con el mensaje exacto.
    expect(fixtureKeys).not.toEqual(Object.keys(EXPERIENCE_SECTIONS).sort());
    expect(fixtureKeys.filter((key) => key in EXPERIENCE_SECTIONS)).toHaveLength(
      profile.experience.length
    );
  });

  it("las dos secciones se imprimen, en orden, y cada fila cae en la suya", () => {
    const trainingHeading = `<h3 class="p-subhead">${printCvCuration().sections.training}</h3>`;
    const professionalHeading = `<h3 class="p-subhead">${printCvCuration().sections.professional}</h3>`;
    const [beforeTraining, trainingPart] = HTML.split(trainingHeading);
    const [container, professionalPart] = beforeTraining.split(professionalHeading);

    expect(container).toContain("<h2>Trayectoria</h2>");
    expect(container).toContain("Empleo, formación y talleres · 1998 – PRESENTE");
    expect(professionalPart).toBeDefined();
    expect(trainingPart).toBeDefined();

    const expected = (id: "professional" | "training") =>
      profile.experience.filter((item) => experienceSectionOf(item) === id).length;
    const count = (block: string) => occurrences(block, 'class="p-entry p-exp"');
    expect(count(professionalPart)).toBe(expected("professional"));
    expect(count(trainingPart)).toBe(expected("training"));
    expect(count(professionalPart) + count(trainingPart)).toBe(profile.experience.length);

    for (const item of profile.experience) {
      const block = experienceSectionOf(item) === "professional" ? professionalPart : trainingPart;
      expect(block).toContain(item.role.es!);
    }
    // Las tres dudosas son empleo; el postgrado y CERN son formación.
    for (const role of [
      "Pasantía en Transferencia de Video a Cine",
      "Asistente de Fotografía Fija",
      "Profesional en Entrenamiento"
    ]) {
      expect(professionalPart).toContain(role);
      expect(trainingPart).not.toContain(role);
    }
    expect(trainingPart).toContain("Postgrado de Instrumentación");
    expect(trainingPart).toContain("II Latin American School of High Energy Physics");
    expect(professionalPart).not.toContain("Postgrado de Instrumentación");
  });

  it("una entrada sin clasificar rompe el render (no se adivina ni se esconde)", () => {
    const fixture: CvProfile = {
      ...profile,
      experience: [
        ...profile.experience,
        { role: { en: "Fixture", es: "Fixture" }, org: "Fixture Org", start: "2020-01-01", end: "2020-12-31" }
      ]
    };
    expect(() => printCvHtml(fixture)).toThrow(/sin clasificar/);
    expect(() => printCvHtml(fixture)).toThrow(/Fixture Org\|Fixture\|2020-01-01/);
  });

  it("el rango sigue derivado: sin la fila más vieja, la nota arranca en 1999", () => {
    const fixture: CvProfile = {
      ...profile,
      experience: profile.experience.filter((item) => !item.start.startsWith("1998"))
    };
    expect(printCvHtml(fixture)).toContain("Empleo, formación y talleres · 1999 – PRESENTE");
  });
});

describe("print-CV — F2: Trayectoria y org localizado", () => {
  it("el bloque contenedor sigue titulándose «Trayectoria» con su nota", () => {
    expect(printCvCuration().sections.experience.es).toBe("Trayectoria");
    expect(printCvCuration().sections.experience.en).toBe("Trajectory");
    expect(HTML).toContain("<h2>Trayectoria</h2>");
    expect(HTML).toContain("Empleo, formación y talleres");
    expect(HTML).toContain(`<h3 class="p-subhead">${printCvCuration().sections.professional}</h3>`);
    expect(HTML).toContain(`<h3 class="p-subhead">${printCvCuration().sections.training}</h3>`);
  });

  it("localiza el org por token: país y glosa en ES, nombres propios intactos", () => {
    expect(HTML).toContain("Independiente — Panamá / Ecuador");
    expect(HTML).not.toContain("Independent — Panama / Ecuador");
    expect(HTML).toContain("CERN — San Miguel Regla, México (beca)");
    expect(HTML).toContain("Universidad San Francisco de Quito (USFQ) — Quito, Ecuador");
  });

  it("no toca un org cuyo «Mexico» no es el país («New Mexico State University»)", () => {
    expect(orgEs("New Mexico State University")).toBe("New Mexico State University");
    expect(orgEs("Fluge-Panamá")).toBe("Fluge-Panamá");
    expect(orgEs("Panamá")).toBe("Panamá");
  });
});

describe("print-CV — F2 de #119: rótulos de formación desambiguados", () => {
  it("«Formación y talleres» (experience) no compite con «Formación académica» (education)", () => {
    // El subhead de talleres es una decisión registrada del operador (#108 §9):
    // no se renombra; se desambigua el otro lado.
    expect(printCvCuration().sections.training).toBe("Formación y talleres");
    expect(printCvCuration().sections.education).toBe("Formación académica");
    expect(HTML).toContain(`<h3 class="p-subhead">${printCvCuration().sections.training}</h3>`);
    expect(HTML).toContain(`<h2>${printCvCuration().sections.education}</h2>`);
    expect(HTML).not.toContain("<h2>Formación</h2>");
    expect(occurrences(HTML, "Formación académica")).toBe(1);
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

describe("print-CV — #122: logo de marca, reglas teal y prosa de una sola fuente", () => {
  // Desde #130 el CSS global —print incluido— vive en la piel del tema; el
  // renderer del print sigue entrando el color por la MISMA constante.
  const SKIN_CSS = emitSkinCss(PRINT_RULE_COLOR);

  it("el encabezado imprime el logo print-A4 del brand kit, con alt no vacío", () => {
    const img = HTML.match(/<img class="p-logo"[^>]*>/)?.[0] ?? "";
    expect(img).not.toBe("");
    expect(img).toContain(`src="${PRINT_LOGO_PATH}"`);
    expect(img).toMatch(/alt="[^"]+"/);
    expect(img).toMatch(/alt="[^"]*(Christian Luciani|logotipo|Logotipo)[^"]*"/);
  });

  it("el asset del logo existe en el espejo vendored del brand kit (no se inventa la ruta)", () => {
    expect(PRINT_LOGO_PATH.startsWith("/assets/brand/")).toBe(true);
    const file = resolve(process.cwd(), "assets", "brand", "logo", PRINT_LOGO_PATH.split("/").pop()!);
    expect(existsSync(file)).toBe(true);
  });

  it("F2 del pase fresco: la marca impresa no es una hoja A4 (peso y encuadre)", () => {
    // El print-only se descarga en cada visita: una composición de página A4
    // (325 KB) metida en 16 mm no aporta resolución y encuadra mal. El gate
    // fija el techo de peso del asset elegido.
    const file = resolve(process.cwd(), "assets", "brand", "logo", PRINT_LOGO_PATH.split("/").pop()!);
    const bytes = readFileSync(file).byteLength;
    expect(bytes).toBeLessThan(200_000);
  });

  it("las reglas del CV salen de UNA constante declarada: el teal del brand", () => {
    expect(PRINT_RULE_COLOR).toBe("#00c9c0");
    // grep del print: no quedan grises fijos en las reglas del CV.
    expect(RENDERER).not.toMatch(/#(ccc|ddd)\b/i);
    expect(SKIN_SOURCE).not.toMatch(/#(ccc|ddd)\b/i);
    // el color entra por interpolación de la constante, no por un literal
    expect(RENDERER).toContain("${PRINT_RULE_COLOR}");
    // la piel pide el color por placeholder y el emisor lo resuelve
    expect(SKIN_SOURCE).toContain("{{print-rule}}");
    expect(SKIN_CSS).not.toContain("{{");
    // y llega a las dos reglas: secciones (skin) y footer (print_cv).
    expect(ASSEMBLED).toContain(`border-bottom:1pt solid ${PRINT_RULE_COLOR}`);
    expect(HTML).toContain(`border-top:1pt solid ${PRINT_RULE_COLOR}`);
  });

  it("la constante del print no driftea del token `--teal` de pantalla", () => {
    const token = tokenDeclarations(SKIN_SOURCE).find((decl) => decl.name === "--teal")?.value;
    expect(token).toBe(PRINT_RULE_COLOR);
    // el token del print es derivado: su fuente es el placeholder, no un literal
    const printRule = tokenDeclarations(SKIN_SOURCE).find((decl) => decl.name === "--print-rule");
    expect(printRule?.derived).toBe(true);
    expect(printRule?.value).toBe("{{print-rule}}");
  });

  it("la prosa de perfil del print es la del SSOT (no hay copia a mano)", () => {
    expect(HTML).toContain(profileProse(profile).es!);
    expect(HTML).not.toContain("más de 20 años");
    expect(HTML).not.toContain("20 años");
  });

  it("printCvCuration().profile es una SELECCIÓN de campo, no texto", () => {
    expect(printCvCuration().profile).toEqual(PROFILE_PROSE);
    expect(JSON.stringify(printCvCuration().profile)).not.toMatch(/Físico|Physicist|años|years/);
  });

  it("mover `positioning.statement` mueve la prosa del print (#109)", () => {
    const fixture: CvProfile = {
      ...profile,
      positioning: {
        ...profile.positioning,
        statement: { es: "Prosa fixture del SSOT.", en: "Fixture statement." }
      }
    };
    const moved = printCvHtml(fixture);
    expect(moved).toContain("Prosa fixture del SSOT.");
    expect(moved).not.toContain(profileProse(profile).es!);
  });

  it("F1: un `es` vacío imprime el EN del MISMO campo (no un párrafo vacío)", () => {
    const fixture: CvProfile = {
      ...profile,
      positioning: {
        ...profile.positioning,
        statement: { es: "", en: "Statement only in English." } as never
      }
    };
    const html = printCvHtml(fixture);
    expect(html).toContain("Statement only in English.");
    expect(html).not.toContain("<p></p>");
  });

  it("sin `statement` cae al fallback declarado del SSOT, no a una segunda copia", () => {
    const fixture: CvProfile = {
      ...profile,
      positioning: { ...profile.positioning, statement: undefined as never }
    };
    expect(printCvHtml(fixture)).toContain(profile.positioning.audiences.recruiters.es!);
  });
});

/* ── #160: el PDF sigue al selector ES/EN sin JS ──────────────────────
 *
 * Dos variantes deterministas generadas en el build: `#print-cv` (ES, la
 * histórica — su bloque no cambia) y `#print-cv-en` (EN, con `lang="en"`). La
 * piel del tema muestra una u otra en `@media print` según `html[lang]`. Estos
 * gates fijan: el ES sigue byte-idéntico, el EN no mezcla idiomas, los
 * invariantes del SSOT (`org`, `institution`, `skills[].name`, publicaciones)
 * quedan iguales, y el camino sin JS está declarado en la piel. */
describe("print-CV — #160: variante EN y alternancia por idioma", () => {
  const EN = printCvHtml(profile, "en");
  const EN_CURATION = printCvCuration("en");

  it("el ES no cambia: `#print-cv` conserva su bloque y no declara `lang` propio", () => {
    expect(HTML).toContain('<div id="print-cv" aria-hidden="true">');
    expect(HTML).not.toContain('id="print-cv-en"');
    // La variante EN es ADITIVA: el render por defecto sigue siendo el mismo.
    expect(printCvHtml(profile)).toBe(HTML);
  });

  it("el EN es un bloque hermano con id propio y `lang=\"en\"`", () => {
    expect(EN).toContain('<div id="print-cv-en" lang="en" aria-hidden="true">');
    expect(EN).not.toContain('<div id="print-cv" ');
    // El CSS embebido queda scopeado a SU id: el layout del ES no cambia.
    expect(EN).toContain("#print-cv-en .p-footer");
    expect(EN).not.toContain("#print-cv .p-footer");
  });

  it("el ensamblador publica las dos variantes, en orden ES → EN", () => {
    const es = ASSEMBLED.indexOf('id="print-cv"');
    const en = ASSEMBLED.indexOf('id="print-cv-en"');
    expect(es).toBeGreaterThan(-1);
    expect(en).toBeGreaterThan(es);
    expect(occurrences(ASSEMBLED, '<div id="print-cv-en" lang="en"')).toBe(1);
  });

  it("títulos, labels y niveles salen del pack en EN (mismas claves, cero nuevas)", () => {
    expect(EN_CURATION.sections.profile).toBe("Profile");
    expect(EN_CURATION.sections.experience.en).toBe("Trajectory");
    expect(EN_CURATION.sections.professional).toBe("Professional experience");
    expect(EN_CURATION.sections.training).toBe("Education and workshops");
    expect(EN_CURATION.sections.education).toBe("Academic education");
    expect(EN_CURATION.sections.publications).toBe("Selected publications");
    expect(EN_CURATION.sections.skills).toBe("Skills");
    expect(EN_CURATION.labels.present).toBe("PRESENT");
    expect(EN_CURATION.labels.languages).toBe("Languages");
    expect(EN_CURATION.languageNames.en).toBe("English");
    expect(EN_CURATION.levelLabels.intermediate).toBe("intermediate");

    for (const heading of [
      "<h2>Profile</h2>",
      "<h2>Trajectory</h2>",
      "<h2>Academic education</h2>",
      "<h2>Selected publications</h2>",
      "<h2>Skills</h2>",
      '<h3 class="p-subhead">Professional experience</h3>',
      '<h3 class="p-subhead">Education and workshops</h3>'
    ]) {
      expect(EN).toContain(heading);
    }
    expect(EN).toContain("Languages:");
    expect(EN).toContain("English (intermediate)");
    expect(EN).toContain("PRESENT");
    expect(EN).toContain("generated from profile-data @");
    // El ES de las mismas claves NO se filtra al bloque EN.
    for (const leaked of [
      "<h2>Perfil</h2>",
      "<h2>Trayectoria</h2>",
      "<h2>Competencias</h2>",
      "Idiomas:",
      "Inglés (intermedio)",
      "generado desde profile-data @"
    ]) {
      expect(EN).not.toContain(leaked);
    }
  });

  it("los hechos `LangText` se imprimen en EN (roles, formación, prosa)", () => {
    const consultant = profile.experience.find(
      (item) => item.role.es === "Consultor Estratégico de Sistemas"
    );
    expect(consultant?.role.en).toBeTruthy();
    expect(EN).toContain(consultant!.role.en);
    expect(EN).not.toContain("Consultor Estratégico de Sistemas");
    expect(EN).toContain(profile.positioning.statement.en!.slice(0, 40));
    const edu = profile.education.find((item) => item.degree.es === "Especialización en Audiovisuales");
    expect(edu?.degree.en).toBeTruthy();
    expect(EN).toContain(edu!.degree.en);
    expect(EN).not.toContain("Especialización en Audiovisuales");
  });

  it("los invariantes del SSOT quedan iguales en ambos idiomas (org/institution/skills/publicaciones)", () => {
    // Los valores se imprimen escapados en HTML: se comparan en su forma emitida.
    const htmlEsc = (value: string): string =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    // `org` se imprime CRUDO en EN (el ES usa `orgEs()` sólo como glosa).
    expect(EN).toContain("Independent — Panama / Ecuador");
    expect(EN).not.toContain("Independiente — Panamá / Ecuador");
    for (const item of profile.experience) expect(EN).toContain(htmlEsc(item.org));
    for (const item of profile.education) expect(EN).toContain(htmlEsc(item.institution));
    for (const skill of profile.skills) expect(EN).toContain(htmlEsc(skill.name));
    for (const publication of profile.publications) expect(EN).toContain(htmlEsc(publication.title));
  });

  it("un `en` vacío cae al ES del MISMO campo (fallback declarado, no texto inventado)", () => {
    const fixture: CvProfile = {
      ...profile,
      positioning: {
        ...profile.positioning,
        statement: { es: "Prosa disponible sólo en español.", en: "" } as never
      }
    };
    expect(printCvHtml(fixture, "en")).toContain("Prosa disponible sólo en español.");
    expect(printCvHtml(fixture, "en")).not.toContain("<p></p>");
  });

  it("el `alt` del logo sigue al idioma (el del QR ya es neutro: nombre propio + URL)", () => {
    expect(HTML).toContain('alt="Logotipo de Christian Luciani"');
    expect(EN).toContain('alt="Logo · Christian Luciani"');
    expect(EN).not.toContain("Logotipo de");
  });

  it("la piel del tema alterna la variante con `html[lang]` — sin JS", () => {
    const skin = emitSkinCss(PRINT_RULE_COLOR);
    expect(skin).toContain('#print-cv, #print-cv-en { display:none; }');
    expect(skin).toContain("body > *:not(#print-cv):not(#print-cv-en)");
    expect(skin).toContain('html[lang="en"] #print-cv { display:none !important; }');
    expect(skin).toContain('html:not([lang="en"]) #print-cv-en { display:none !important; }');
    // La última sección del EN arranca en página propia (cola de 2 líneas que
    // detectó `print:verify` al medir la variante EN por primera vez).
    expect(skin).toContain(
      'html[lang="en"] #print-cv-en .p-section.p-keep { break-before: page; }'
    );
  });

  it("es determinista también en EN: mismo PROFILE → mismo bloque byte a byte", () => {
    expect(printCvHtml(profile, "en")).toBe(EN);
  });
});
