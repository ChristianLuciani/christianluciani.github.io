/**
 * Módulo "Provenance" (#145 §2.4): el badge del footer muestra el commit real
 * del SSOT; "Verify" vuelve a pedir public/agent/profile.json y compara 3
 * hechos con el DOM renderizado por el mismo build. Es verificación del
 * snapshot commiteado, no una promesa "live".
 */
import { checkFacts, type DomFact } from "../agent/verify.ts";
import { publicUrl } from "../agent/urls.ts";
import { LAB_I18N, type LabLocale } from "./i18n.ts";

export function domFacts(doc: Document): DomFact[] {
  return [...doc.querySelectorAll<HTMLElement>("[data-verify]")]
    .map((el) => ({ id: el.dataset.verify as DomFact["id"], value: el.textContent ?? "" }))
    .filter((fact) => fact.id === "name" || fact.id === "lastRole" || fact.id === "project");
}

export function mountProvenance(root: Element, doc: Document, getLocale: () => LabLocale): void {
  const button = root.querySelector<HTMLButtonElement>("#prov-verify");
  const results = root.querySelector<HTMLElement>("#prov-results");
  if (!button || !results) return;
  button.addEventListener("click", () => {
    void (async () => {
      const dict = LAB_I18N[getLocale()];
      button.disabled = true;
      button.textContent = dict["mod.provenance.checking"];
      results.replaceChildren();
      try {
        const response = await fetch(publicUrl("/agent/profile.json"));
        if (!response.ok) throw new Error(`profile.json → ${response.status}`);
        const json = (await response.json()) as Parameters<typeof checkFacts>[1];
        for (const check of checkFacts(domFacts(doc), json)) {
          const li = document.createElement("li");
          const badge = document.createElement("span");
          badge.className = check.ok ? "prov-badge-ok" : "prov-badge-fail";
          badge.textContent = check.ok ? dict["mod.provenance.ok"] : dict["mod.provenance.fail"];
          li.append(badge, document.createTextNode(` ${check.id}`));
          results.append(li);
        }
      } catch {
        const li = document.createElement("li");
        const badge = document.createElement("span");
        badge.className = "prov-badge-fail";
        badge.textContent = dict["mod.provenance.fail"];
        li.append(badge, document.createTextNode(" profile.json"));
        results.append(li);
      } finally {
        button.disabled = false;
        button.textContent = dict["mod.provenance.verify"];
      }
    })();
  });
}
