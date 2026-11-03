/**
 * PRINT_CV: CV imprimible A4 (oculto en pantalla).
 *
 * Renderer determinista: recibe `PROFILE` (CvProfile) y no contiene hechos.
 * Los textos de este museo viven en `src/content/cv/print.ts` (curación D2);
 * fechas, cargos, organizaciones, publicaciones, conteos, idiomas y skills
 * salen del SSOT. El layout/CSS es el histórico: sólo cambian los hechos.
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
import { PRINT_CV } from "../content/cv/print.ts";

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

/** ES es el idioma del print; EN queda como fallback si faltara la traducción. */
function esText(text: LangText | undefined): string {
  return text?.es ?? text?.en ?? "";
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
  const to = end === "present" ? PRINT_CV.labels.present : year(end);
  return from === to ? from : `${from} – ${to}`;
}

/** URL legible: sin protocolo ni slash final. */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function levelLabel(level: string | undefined): string {
  if (!level) return "";
  return PRINT_CV.levelLabels[level] ?? level;
}

function languageName(code: string): string {
  return PRINT_CV.languageNames[code] ?? code.toUpperCase();
}

function websiteLink(profile: CvProfile): string {
  return profile.identity.links.find((link) => link.platform === "website")?.url ?? "";
}

function contactHtml(profile: CvProfile): string {
  return PRINT_CV.contactPlatforms
    .map((platform) => profile.identity.links.find((link) => link.platform === platform))
    .filter((link) => link != null)
    .map((link) => `<a href="${esc(link.url)}">${esc(displayUrl(link.url))}</a>`)
    .join(" · ");
}

function highlightsFor(item: ExperienceItem): string[] {
  return item.highlights?.es?.length ? item.highlights.es : (item.highlights?.en ?? []);
}

function experienceHtml(item: ExperienceItem): string {
  const bullets = highlightsFor(item)
    .map((highlight) => `        <li>${esc(highlight)}</li>`)
    .join("\n");
  const list = bullets ? `\n      <ul>\n${bullets}\n      </ul>` : "";
  return `    <div class="p-entry p-exp">
      <h3>${esc(esText(item.role))} — ${esc(item.org)}</h3>
      <div class="p-meta">${period(item.start, item.end)}</div>${list}
    </div>`;
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
    `      <li class="p-lang"><strong>${PRINT_CV.labels.languages}:</strong> ${languages}</li>`,
    skills
  ].join("\n");
}

export function printCvHtml(profile: CvProfile): string {
  const site = displayUrl(websiteLink(profile));
  const contact = contactHtml(profile);
  const experience = sortByRecency(profile.experience).map(experienceHtml).join("\n");
  const education = sortByRecency(profile.education).map(educationHtml).join("\n");
  const publications = profile.publications.map(publicationHtml).join("\n");
  const footerDate = profile.source.commitDate ?? PRINT_CV.labels.footerNoDate;

  return `<!-- ── CV PLANO PARA IMPRESIÓN / PDF (oculto en pantalla, visible al imprimir) ── -->
<div id="print-cv" aria-hidden="true">
  <style>
    /* QR del CV impreso: arriba a la derecha */
    #print-cv .p-head { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:1rem; }
    #print-cv .p-head > div:first-child { flex:1; min-width:200px; }
    #print-cv .qr-wrap { text-align:center; }
    #print-cv .qr-wrap img { width:30mm; height:30mm; }
    #print-cv .qr-wrap .qr-note { font-size:6.5pt; color:#555; margin-top:2pt; }
    /* Footer de procedencia: solo print (dentro del bloque oculto en pantalla) */
    #print-cv .p-footer { margin-top:18pt; padding-top:4pt; border-top:1pt solid #ddd; font-size:7pt; color:#777; }
  </style>
  <div class="p-head">
    <div>
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
    <h2>${PRINT_CV.sections.profile}</h2>
    <p>${esc(esText(PRINT_CV.profile))}</p>
  </div>

  <div class="p-section">
    <h2>${PRINT_CV.sections.experience}</h2>
${experience}
  </div>

  <div class="p-section">
    <h2>${PRINT_CV.sections.education}</h2>
${education}
  </div>

  <div class="p-section">
    <h2>${PRINT_CV.sections.publications}</h2>
    <ul>
${publications}
    </ul>
  </div>

  <div class="p-section">
    <h2>${PRINT_CV.sections.skills}</h2>
    <ul>
${skillsHtml(profile)}
    </ul>
  </div>

  <div class="p-footer">${PRINT_CV.labels.footer} ${esc(profile.source.commit)} · ${esc(footerDate)}</div>
</div>
`;
}
