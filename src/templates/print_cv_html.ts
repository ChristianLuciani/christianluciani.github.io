/**
 * PRINT-CV: CV imprimible A4 (oculto en pantalla); el copy lo resuelve
 * `printCvCuration()` en cada render con el tema activo.
 *
 * Renderer determinista: recibe `PROFILE` (CvProfile) y no contiene hechos.
 * Los textos de este museo viven en `src/content/cv/print.ts` (curación D2);
 * fechas, cargos, organizaciones, publicaciones, conteos, idiomas y skills
 * salen del SSOT. La prosa de perfil NO es curación: se deriva de
 * `PROFILE.positioning.statement` (`profile-prose.ts`, #122) y es la misma
 * pieza que imprime la sala de Perfil del sitio. El layout/CSS es el histórico:
 * sólo cambian los hechos.
 *
 * Solo print: el bloque entero está oculto en pantalla (`#print-cv { display:none }`)
 * y el footer de procedencia vive dentro de él — nunca en la página.
 */
import type {
  CvProfile,
  EducationItem,
  ExperienceItem,
  LangText,
  PublicationItem
} from "../data/profile.types.ts";
import {
  EXPERIENCE_SECTION_ORDER,
  printCvCuration,
  experienceKey,
  experienceSectionOf
} from "../content/cv/print.ts";
import type { ExperienceSectionId } from "../content/cv/print.ts";
import { orgEs } from "../content/cv/org.ts";
import { profileProse } from "../content/cv/profile-prose.ts";
import { assetAttrsFor } from "../ts/assets/url.ts";
import { PRINT_LOGO_PATH, PRINT_RULE_COLOR } from "./print-tokens.ts";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

/**
 * ES es el idioma del print; EN queda como fallback si faltara la traducción.
 * `||` y no `??`: un `es` presente pero VACÍO también cae a EN (la prosa de
 * perfil documenta esa caída en `profile-prose.ts`, y con `??` el párrafo
 * salía vacío — F1 del pase fresco de #122).
 */
function esText(text: LangText | undefined): string {
  return text?.es || text?.en || "";
}

function year(date: string): string {
  return date.slice(0, 4);
}

/** Clave de recencia: `present` es el futuro y va primero; el resto compara ISO. */
function recencyKey(item: { start: string; end?: string }): string {
  const end = item.end ?? item.start;
  return end === "present" ? "9999-12-31" : end;
}

/** end desc / start desc — el orden que pide el contrato del print. */
function sortByRecency<T extends { start: string; end?: string }>(items: readonly T[]): T[] {
  return [...items].sort(
    (a, b) => recencyKey(b).localeCompare(recencyKey(a)) || b.start.localeCompare(a.start)
  );
}

function period(start: string, end?: string): string {
  if (!end) return year(start);
  const from = year(start);
  const to = end === "present" ? printCvCuration().labels.present : year(end);
  return from === to ? from : `${from} – ${to}`;
}

/** URL legible: sin protocolo ni slash final. */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function levelLabel(level: string | undefined): string {
  if (!level) return "";
  return printCvCuration().levelLabels[level] ?? level;
}

function languageName(code: string): string {
  return printCvCuration().languageNames[code] ?? code.toUpperCase();
}

function websiteLink(profile: CvProfile): string {
  return profile.identity.links.find((link) => link.platform === "website")?.url ?? "";
}

/**
 * Contacto del print: SÓLO las plataformas de `identity.links` que cura
 * `printCvCuration().contactPlatforms`.
 *
 * El email queda afuera porque NO ESTÁ EN `PROFILE` (la proyección pública lo
 * excluye desde #107), no por una decisión editorial de esta superficie: no se
 * reintroduce hardcodeado. La sala Contacto sí lo publica, pero derivado de
 * `ENTITY` (nodo `Person`, `contactEmail()`): la misma fuente que el JSON-LD.
 */
function contactHtml(profile: CvProfile): string {
  return printCvCuration().contactPlatforms
    .map((platform) => profile.identity.links.find((link) => link.platform === platform))
    .filter((link) => link != null)
    .map((link) => `<a href="${esc(link.url)}">${esc(displayUrl(link.url))}</a>`)
    .join(" · ");
}

function highlightsFor(item: ExperienceItem): string[] {
  return item.highlights?.es?.length ? item.highlights.es : (item.highlights?.en ?? []);
}

/** Primer año de TODO `experience[]` (empleo + formación): se deriva, no se escribe. */
function trajectoryStart(profile: CvProfile): string {
  return (
    profile.experience
      .map((item) => year(item.start))
      .filter((y) => /^\d{4}$/.test(y))
      .sort()[0] ?? ""
  );
}

function experienceHtml(item: ExperienceItem): string {
  const bullets = highlightsFor(item)
    .map((highlight) => `        <li>${esc(highlight)}</li>`)
    .join("\n");
  const list = bullets ? `\n      <ul>\n${bullets}\n      </ul>` : "";
  return `    <div class="p-entry p-exp">
      <h3>${esc(esText(item.role))} — ${esc(orgEs(item.org))}</h3>
      <div class="p-meta">${period(item.start, item.end)}</div>${list}
    </div>`;
}

/** Subsección curada de `experience[]`; el título es curación D2, no un hecho. */
function experienceSectionTitle(id: ExperienceSectionId): string {
  return id === "professional"
    ? printCvCuration().sections.professional
    : printCvCuration().sections.training;
}

/**
 * Las 23 filas de `experience[]` se reparten en dos subsecciones (F1 de #116)
 * según `Curation.experienceSections` del tema activo (la del museo vive en
 * `src/content/curation/museo.ts`).
 *
 * Una fila sin clasificar NO se adivina ni se esconde: el render falla. Así una
 * entrada nueva del SSOT rompe el test en vez de aterrizar en la sección
 * equivocada — la tabla es una lista explícita, no un default.
 */
function experienceSectionsHtml(items: readonly ExperienceItem[]): string {
  const groups: Record<ExperienceSectionId, string[]> = {
    professional: [],
    training: []
  };
  for (const item of sortByRecency(items)) {
    const section = experienceSectionOf(item);
    if (!section) {
      throw new Error(
        `print-CV: entrada de experience sin clasificar en EXPERIENCE_SECTIONS: ${experienceKey(item)}`
      );
    }
    groups[section].push(experienceHtml(item));
  }
  return EXPERIENCE_SECTION_ORDER.map(
    (id) => `    <div class="p-subsection">
      <h3 class="p-subhead">${esc(experienceSectionTitle(id))}</h3>
${groups[id].join("\n")}
    </div>`
  ).join("\n");
}

function educationHtml(item: EducationItem): string {
  const meta = [
    period(item.start, item.end),
    esText(item.field),
    esText(item.note)
  ]
    .filter((part) => part.length > 0)
    .map((part) => esc(part))
    .join(" · ");
  return `    <div class="p-entry p-edu">
      <h3>${esc(esText(item.degree))} — ${esc(item.institution)}</h3>
      <div class="p-meta">${meta}</div>
    </div>`;
}

function publicationHtml(item: PublicationItem): string {
  const link = item.url
    ? ` <a href="${esc(item.url)}">${esc(item.doi ? `doi.org/${item.doi}` : displayUrl(item.url))}</a>`
    : "";
  return `      <li class="p-pub"><strong>${item.year}</strong> — ${esc(item.title)}. <em>${esc(item.venue)}</em>.${link}</li>`;
}

function skillsHtml(profile: CvProfile): string {
  const languages = profile.languages
    .map((language) => `${esc(languageName(language.code))} (${esc(levelLabel(language.level))})`)
    .join(" · ");
  const skills = profile.skills
    .map(
      (skill) =>
        `      <li class="p-skill"><strong>${esc(skill.name)}</strong> — ${esc(levelLabel(skill.level))}</li>`
    )
    .join("\n");
  return [
    `      <li class="p-lang"><strong>${printCvCuration().labels.languages}:</strong> ${languages}</li>`,
    skills
  ].join("\n");
}

export function printCvHtml(profile: CvProfile): string {
  const site = displayUrl(websiteLink(profile));
  const prose = esText(profileProse(profile));
  const logo = assetAttrsFor("src", PRINT_LOGO_PATH);
  const contact = contactHtml(profile);
  const experience = experienceSectionsHtml(profile.experience);
  const trajectoryNote = `${esText(printCvCuration().sections.experienceNote)} · ${trajectoryStart(profile)} – ${printCvCuration().labels.present}`;
  const education = sortByRecency(profile.education).map(educationHtml).join("\n");
  const publications = profile.publications.map(publicationHtml).join("\n");
  const footerDate = profile.source.commitDate ?? printCvCuration().labels.footerNoDate;

  return `<!-- ── CV PLANO PARA IMPRESIÓN / PDF (oculto en pantalla, visible al imprimir) ── -->
<div id="print-cv" aria-hidden="true">
  <style>
    /* QR del CV impreso: arriba a la derecha */
    #print-cv .p-head { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:1rem; }
    #print-cv .p-head > div:first-child { flex:1; min-width:200px; }
    /* Logo de marca (#122): variante print-A4 del brand kit, acotada para no
       competir con el QR (30 mm) ni empujar el A4. */
    #print-cv .p-logo { width:16mm; height:auto; display:block; margin-bottom:4pt; }
    #print-cv .qr-wrap { text-align:center; }
    #print-cv .qr-wrap img { width:30mm; height:30mm; }
    #print-cv .qr-wrap .qr-note { font-size:6.5pt; color:#555; margin-top:2pt; }
    /* Subsecciones de Trayectoria: empleo vs formación (curación D2) */
    #print-cv .p-subsection { margin-top:10pt; }
    #print-cv .p-subsection > .p-subhead { font-size:10.5pt; text-transform:uppercase; letter-spacing:.04em; color:#555; margin:10pt 0 4pt; }
    /* Footer de procedencia: solo print (dentro del bloque oculto en pantalla) */
    /* Reglas del CV: UNA fuente declarada, el teal del brand (#122). */
    #print-cv .p-footer { margin-top:18pt; padding-top:4pt; border-top:1pt solid ${PRINT_RULE_COLOR}; font-size:7pt; color:#777; break-inside:avoid; break-before:avoid; }
    /* F2: el footer no queda huérfano — tampoco se separa del bloque que lo precede */
    #print-cv .p-section.p-keep { break-inside:avoid; break-before:avoid; }
  </style>
  <div class="p-head">
    <div>
      <img class="p-logo" ${logo} alt="Logotipo de ${esc(profile.identity.name)}">
      <h1>${esc(profile.identity.name)}</h1>
      <div class="p-meta">
        ${esc(profile.identity.location ?? "")}<br>
        ${contact}
      </div>
    </div>
    <div class="qr-wrap">
      <img src="assets/qr-site.svg" alt="QR · ${esc(profile.identity.name)} — ${esc(site)}">
      <div class="qr-note">${esc(site)}</div>
    </div>
  </div>

  <div class="p-section">
    <h2>${printCvCuration().sections.profile}</h2>
    <p>${esc(prose)}</p>
  </div>

  <div class="p-section">
    <h2>${esc(esText(printCvCuration().sections.experience))}</h2>
    <div class="p-meta">${esc(trajectoryNote)}</div>
${experience}
  </div>

  <div class="p-section">
    <h2>${printCvCuration().sections.education}</h2>
${education}
  </div>

  <div class="p-section">
    <h2>${printCvCuration().sections.publications}</h2>
    <ul>
${publications}
    </ul>
  </div>

  <div class="p-section p-keep">
    <h2>${printCvCuration().sections.skills}</h2>
    <ul>
${skillsHtml(profile)}
    </ul>
  </div>

  <div class="p-footer">${printCvCuration().labels.footer} ${esc(profile.source.commit)} · ${esc(footerDate)}</div>
</div>
`;
}
