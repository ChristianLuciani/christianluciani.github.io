/**
 * PRINT-CV: CV imprimible A4 (oculto en pantalla); el copy lo resuelve
 * `printCvCuration(lang)` en cada render con el tema activo.
 *
 * Renderer determinista: recibe `PROFILE` (CvProfile) y no contiene hechos.
 * Los textos de este museo viven en `src/content/cv/print.ts` (curación D2);
 * fechas, cargos, organizaciones, publicaciones, conteos, idiomas y skills
 * salen del SSOT. La prosa de perfil NO es curación: se deriva de
 * `PROFILE.positioning.statement` (`profile-prose.ts`, #122) y es la misma
 * pieza que imprime la sala de Perfil del sitio. El layout/CSS es el histórico:
 * sólo cambian los hechos.
 *
 * IDIOMA (#160): `printCvHtml(profile, lang)` renderiza UNA variante por
 * idioma. El build emite las dos (`#print-cv` en ES, `#print-cv-en` en EN) y la
 * piel del tema elige la del `html[lang]` activo al imprimir: determinista, sin
 * JS nuevo y sin depender del walker i18n.
 *
 * Solo print: el bloque entero está oculto en pantalla
 * (`#print-cv, #print-cv-en { display:none }`), y el footer de procedencia vive
 * dentro de cada bloque — nunca en la página.
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
import type { ExperienceSectionId, PrintLang } from "../content/cv/print.ts";
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
 * Texto de un campo `LangText` en el idioma de la variante; cae al otro idioma
 * si falta. `||` y no `??`: un valor presente pero VACÍO también cae al otro
 * (la prosa de perfil documenta esa caída en `profile-prose.ts`, y con `??` el
 * párrafo salía vacío — F1 del pase fresco de #122).
 */
function textFor(text: LangText | undefined, lang: PrintLang): string {
  const primary = lang === "en" ? text?.en : text?.es;
  const fallback = lang === "en" ? text?.es : text?.en;
  return primary || fallback || "";
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

function period(start: string, end: string | undefined, lang: PrintLang): string {
  if (!end) return year(start);
  const from = year(start);
  const to = end === "present" ? printCvCuration(lang).labels.present : year(end);
  return from === to ? from : `${from} – ${to}`;
}

/** URL legible: sin protocolo ni slash final. */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function levelLabel(level: string | undefined, lang: PrintLang): string {
  if (!level) return "";
  return printCvCuration(lang).levelLabels[level] ?? level;
}

function languageName(code: string, lang: PrintLang): string {
  return printCvCuration(lang).languageNames[code] ?? code.toUpperCase();
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

function highlightsFor(item: ExperienceItem, lang: PrintLang): string[] {
  const es = item.highlights?.es;
  const en = item.highlights?.en;
  if (lang === "en") return en?.length ? en : (es ?? []);
  return es?.length ? es : (en ?? []);
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

function experienceHtml(item: ExperienceItem, lang: PrintLang): string {
  const bullets = highlightsFor(item, lang)
    .map((highlight) => `        <li>${esc(highlight)}</li>`)
    .join("\n");
  const list = bullets ? `\n      <ul>\n${bullets}\n      </ul>` : "";
  // `org` es invariante en el SSOT (nunca se traduce): `orgEs()` sólo localiza
  // la glosa ES del dato; la variante EN imprime el valor tal cual.
  const org = lang === "en" ? item.org : orgEs(item.org);
  return `    <div class="p-entry p-exp">
      <h3>${esc(textFor(item.role, lang))} — ${esc(org)}</h3>
      <div class="p-meta">${period(item.start, item.end, lang)}</div>${list}
    </div>`;
}

/** Subsección curada de `experience[]`; el título es curación D2, no un hecho. */
function experienceSectionTitle(id: ExperienceSectionId, lang: PrintLang): string {
  const sections = printCvCuration(lang).sections;
  return id === "professional" ? sections.professional : sections.training;
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
function experienceSectionsHtml(items: readonly ExperienceItem[], lang: PrintLang): string {
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
    groups[section].push(experienceHtml(item, lang));
  }
  return EXPERIENCE_SECTION_ORDER.map(
    (id) => `    <div class="p-subsection">
      <h3 class="p-subhead">${esc(experienceSectionTitle(id, lang))}</h3>
${groups[id].join("\n")}
    </div>`
  ).join("\n");
}

function educationHtml(item: EducationItem, lang: PrintLang): string {
  const meta = [
    period(item.start, item.end, lang),
    textFor(item.field, lang),
    textFor(item.note, lang)
  ]
    .filter((part) => part.length > 0)
    .map((part) => esc(part))
    .join(" · ");
  return `    <div class="p-entry p-edu">
      <h3>${esc(textFor(item.degree, lang))} — ${esc(item.institution)}</h3>
      <div class="p-meta">${meta}</div>
    </div>`;
}

function publicationHtml(item: PublicationItem): string {
  const link = item.url
    ? ` <a href="${esc(item.url)}">${esc(item.doi ? `doi.org/${item.doi}` : displayUrl(item.url))}</a>`
    : "";
  return `      <li class="p-pub"><strong>${item.year}</strong> — ${esc(item.title)}. <em>${esc(item.venue)}</em>.${link}</li>`;
}

function skillsHtml(profile: CvProfile, lang: PrintLang): string {
  const labels = printCvCuration(lang).labels;
  const languages = profile.languages
    .map(
      (language) =>
        `${esc(languageName(language.code, lang))} (${esc(levelLabel(language.level, lang))})`
    )
    .join(" · ");
  // `skills[].name` es invariante en el SSOT; sólo se traduce el nivel.
  const skills = profile.skills
    .map(
      (skill) =>
        `      <li class="p-skill"><strong>${esc(skill.name)}</strong> — ${esc(levelLabel(skill.level, lang))}</li>`
    )
    .join("\n");
  return [
    `      <li class="p-lang"><strong>${labels.languages}:</strong> ${languages}</li>`,
    skills
  ].join("\n");
}

export function printCvHtml(profile: CvProfile, lang: PrintLang = "es"): string {
  const curation = printCvCuration(lang);
  /* Una variante por idioma: `#print-cv` es la histórica (ES) y se mantiene
     byte-idéntica; `#print-cv-en` es su hermana y declara `lang="en"`. La piel
     del tema alterna cuál entra al PDF según `html[lang]` (#160). */
  const id = lang === "en" ? "print-cv-en" : "print-cv";
  const langAttr = lang === "en" ? ' lang="en"' : "";
  const site = displayUrl(websiteLink(profile));
  const prose = textFor(profileProse(profile), lang);
  const logo = assetAttrsFor("src", PRINT_LOGO_PATH);
  const contact = contactHtml(profile);
  const experience = experienceSectionsHtml(profile.experience, lang);
  const trajectoryNote = `${textFor(curation.sections.experienceNote, lang)} · ${trajectoryStart(profile)} – ${curation.labels.present}`;
  const education = sortByRecency(profile.education)
    .map((item) => educationHtml(item, lang))
    .join("\n");
  const publications = profile.publications.map(publicationHtml).join("\n");
  const footerDate = profile.source.commitDate ?? curation.labels.footerNoDate;
  /* `alt` en el idioma de la variante. El ES conserva su forma histórica; el EN
     usa una forma neutra (nombre propio) sin inventar claves `print.*` (#160). */
  const logoAlt =
    lang === "en" ? `Logo · ${profile.identity.name}` : `Logotipo de ${profile.identity.name}`;

  return `<!-- ── CV PLANO PARA IMPRESIÓN / PDF (oculto en pantalla, visible al imprimir) ── -->
<div id="${id}"${langAttr} aria-hidden="true">
  <style>
    /* QR del CV impreso: arriba a la derecha */
    #${id} .p-head { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:1rem; }
    #${id} .p-head > div:first-child { flex:1; min-width:200px; }
    /* Logo de marca (#122): variante print-A4 del brand kit, acotada para no
       competir con el QR (30 mm) ni empujar el A4. */
    #${id} .p-logo { width:16mm; height:auto; display:block; margin-bottom:4pt; }
    #${id} .qr-wrap { text-align:center; }
    #${id} .qr-wrap img { width:30mm; height:30mm; }
    #${id} .qr-wrap .qr-note { font-size:6.5pt; color:#555; margin-top:2pt; }
    /* Subsecciones de Trayectoria: empleo vs formación (curación D2) */
    #${id} .p-subsection { margin-top:10pt; }
    #${id} .p-subsection > .p-subhead { font-size:10.5pt; text-transform:uppercase; letter-spacing:.04em; color:#555; margin:10pt 0 4pt; }
    /* Footer de procedencia: solo print (dentro del bloque oculto en pantalla) */
    /* Reglas del CV: UNA fuente declarada, el teal del brand (#122). */
    #${id} .p-footer { margin-top:18pt; padding-top:4pt; border-top:1pt solid ${PRINT_RULE_COLOR}; font-size:7pt; color:#777; break-inside:avoid; break-before:avoid; }
    /* F2: el footer no queda huérfano — tampoco se separa del bloque que lo precede */
    #${id} .p-section.p-keep { break-inside:avoid; break-before:avoid; }
  </style>
  <div class="p-head">
    <div>
      <img class="p-logo" ${logo} alt="${esc(logoAlt)}">
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
    <h2>${curation.sections.profile}</h2>
    <p>${esc(prose)}</p>
  </div>

  <div class="p-section">
    <h2>${esc(textFor(curation.sections.experience, lang))}</h2>
    <div class="p-meta">${esc(trajectoryNote)}</div>
${experience}
  </div>

  <div class="p-section">
    <h2>${curation.sections.education}</h2>
${education}
  </div>

  <div class="p-section">
    <h2>${curation.sections.publications}</h2>
    <ul>
${publications}
    </ul>
  </div>

  <div class="p-section p-keep">
    <h2>${curation.sections.skills}</h2>
    <ul>
${skillsHtml(profile, lang)}
    </ul>
  </div>

  <div class="p-footer">${curation.labels.footer} ${esc(profile.source.commit)} · ${esc(footerDate)}</div>
</div>
`;
}
