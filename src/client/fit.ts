/**
 * Módulo "Fit" (#145 §2.3): pega un JD, corre el matcher determinista sobre
 * el perfil público servido en /agent/profile.json y muestra evidencia con
 * links o gaps declarados. Sin LLM, sin score opaco.
 */
import { matchJd, type FitResult } from "../fit/matcher.ts";
import type { CvProfile } from "../data/profile.types.ts";
import { LAB_I18N, type LabLocale } from "./i18n.ts";
import type { LabConfig } from "./lab.ts";

interface ProfilePayload {
  experience?: CvProfile["experience"];
  projects?: CvProfile["projects"];
  skills?: CvProfile["skills"];
  languages?: CvProfile["languages"];
  artifacts?: CvProfile["artifacts"];
}

export function renderFitResult(result: FitResult, locale: LabLocale, ol: HTMLElement, summary: HTMLElement): void {
  const dict = LAB_I18N[locale];
  summary.hidden = false;
  summary.textContent = `${result.summary.withEvidence}/${result.summary.total} ${dict["mod.fit.summary"]}`;
  ol.replaceChildren();
  for (const req of result.requirements) {
    const li = document.createElement("li");
    const chip = document.createElement("span");
    chip.className = `fit-status ${req.status}`;
    chip.textContent = req.status === "evidence" ? dict["mod.fit.evidence"] : dict["mod.fit.gap"];
    li.append(chip, document.createTextNode(req.text));
    if (req.evidence.length > 0) {
      const ul = document.createElement("ul");
      ul.className = "fit-evidence";
      for (const ev of req.evidence) {
        const item = document.createElement("li");
        if (ev.url) {
          const a = document.createElement("a");
          a.href = ev.url;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = ev.claim;
          item.append(a);
        } else {
          item.textContent = ev.claim;
        }
        ul.append(item);
      }
      li.append(ul);
    }
    ol.append(li);
  }
}

export function mountFit(root: Element, config: LabConfig, getLocale: () => LabLocale): void {
  const input = root.querySelector<HTMLTextAreaElement>("#fit-input");
  const preset = root.querySelector<HTMLButtonElement>("#fit-preset");
  const run = root.querySelector<HTMLButtonElement>("#fit-run");
  const output = root.querySelector<HTMLElement>("#fit-output");
  const summary = root.querySelector<HTMLElement>("#fit-summary");
  if (!input || !run || !output || !summary) return;

  preset?.addEventListener("click", () => {
    input.value = config.jd;
  });

  run.addEventListener("click", () => {
    void (async () => {
      try {
        const response = await fetch("/agent/profile.json");
        if (!response.ok) throw new Error(`profile.json → ${response.status}`);
        const payload = (await response.json()) as ProfilePayload;
        const profile = {
          experience: payload.experience ?? [],
          projects: payload.projects ?? [],
          skills: payload.skills ?? [],
          languages: payload.languages ?? [],
          artifacts: payload.artifacts ?? []
        } as unknown as CvProfile;
        renderFitResult(matchJd(input.value, profile), getLocale(), output, summary);
      } catch {
        summary.hidden = false;
        summary.textContent = LAB_I18N[getLocale()]["mod.chat.error"];
      }
    })();
  });
}
