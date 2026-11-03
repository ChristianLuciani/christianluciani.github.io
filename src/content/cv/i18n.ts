/**
 * Pares ES→EN derivados del SSOT y de la curación del museo.
 *
 * El toggle de idioma traduce por NODO de texto, con la cadena ES exacta como
 * clave (`src/cv/i18n.ts`). Antes, cada traducción de El Friso / El Marco /
 * El Bastidor se escribía a mano en el MAP y derivaba del SSOT. Ahora el propio
 * `PROFILE` trae `es`+`en` para roles, highlights, descripciones y falta:
 * estos pares se derivan de la misma fuente, así que un hecho nuevo entra
 * traducido sin tocar el diccionario.
 */
import { PROFILE } from "../../data/profile.generated.ts";
import type { CvProfile } from "../../data/profile.types.ts";
import { DRAHMA, ESTADO, FRISO, MARCO, PROCEDENCIA, formatMonthYear, formatMonthYearEn, formatPeriod, orgEs, statusLabel } from "./museo.ts";
import { PROJECT_CURATION, projectKey } from "./proyectos.ts";

export function profileI18nPairs(profile: CvProfile = PROFILE as unknown as CvProfile): Record<string, string> {
  const pairs: Record<string, string> = {};
  const add = (es: string | undefined, en: string | undefined): void => {
    if (!es || !en || es === en) return;
    pairs[es.normalize("NFC")] = en;
  };

  // El Friso: período, rol, org presentado en ES y bullets. El org del SSOT es
  // un string invariante (nombre propio); el toggle EN lo devuelve tal cual.
  for (const item of profile.experience) {
    add(formatPeriod(item, "es"), formatPeriod(item, "en"));
    add(item.role.es, item.role.en);
    add(orgEs(item.org), item.org);
    const es = item.highlights?.es ?? [];
    const en = item.highlights?.en ?? [];
    for (let i = 0; i < Math.min(es.length, en.length); i++) add(es[i], en[i]);
  }

  // El Marco / El Bastidor: estado, descripción base, subtítulo y falta curados.
  for (const project of profile.projects) {
    add(statusLabel(project.published, project.status).es, statusLabel(project.published, project.status).en);
    add(project.description?.es, project.description?.en);
    const curation = PROJECT_CURATION[projectKey(project.name)];
    if (curation?.subtitle) {
      add(`— ${curation.subtitle.es}`, `— ${curation.subtitle.en}`);
    }
    add(curation?.falta?.es, curation?.falta?.en);
    add(curation?.statusLabel?.es, curation?.statusLabel?.en);
    add(curation?.note?.es, curation?.note?.en);
    for (const link of curation?.extraLinks ?? []) add(link.label.es, link.label.en);
  }

  // Labels compartidos.
  add(FRISO.present.es, FRISO.present.en);
  add(MARCO.faltaLabel.es, MARCO.faltaLabel.en);
  add(MARCO.closing.es, MARCO.closing.en);
  add(MARCO.closingSomePublic.es, MARCO.closingSomePublic.en);
  add(PROCEDENCIA.label.es, PROCEDENCIA.label.en);
  for (const estado of Object.values(ESTADO)) add(estado.es, estado.en);

  // El showcase de Drahma (curación museográfica, no hechos).
  add(DRAHMA.projectLabel.es, DRAHMA.projectLabel.en);
  const drahma = profile.projects.find((p) => projectKey(p.name) === "Drahma");
  const verified = drahma?.evidence.find((e) => e.verified)?.verified;
  const dateEs = formatMonthYear(verified);
  const dateEn = formatMonthYearEn(verified);
  add(
    `${DRAHMA.subtitle.es}${dateEs ? ` · ${dateEs.toUpperCase()}` : ""}`,
    `${DRAHMA.subtitle.en}${dateEn ? ` · ${dateEn.toUpperCase()}` : ""}`
  );
  add(DRAHMA.timelineLabel.es, DRAHMA.timelineLabel.en);
  add(DRAHMA.timeline.es, DRAHMA.timeline.en);
  for (const cell of DRAHMA.cells) {
    add(cell.label.es, cell.label.en);
    add(cell.text.es, cell.text.en);
  }
  add(DRAHMA.labStem.label.es, DRAHMA.labStem.label.en);
  add(DRAHMA.labStem.title.es, DRAHMA.labStem.title.en);
  for (const item of DRAHMA.labStem.items) add(item.es, item.en);
  add(DRAHMA.repo.label.es, DRAHMA.repo.label.en);
  add(DRAHMA.repo.lede.es, DRAHMA.repo.lede.en);
  for (const item of DRAHMA.repo.items) add(item.es, item.en);

  return pairs;
}
