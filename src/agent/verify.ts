/**
 * Verificación de provenance (#145 §2.4): compara 3 hechos del DOM de la
 * página con el snapshot commiteado `public/agent/profile.json`. No promete
 * "live": verifica el snapshot contra el documento renderizado por el mismo
 * build. El test inyecta una divergencia y exige que el panel la detecte.
 */
export interface DomFact {
  id: "name" | "lastRole" | "project";
  value: string;
}

export interface FactCheck {
  id: DomFact["id"];
  ok: boolean;
}

interface ExperienceLike {
  role: { en: string; es?: string };
  start: string;
  end?: string;
}

interface ProfileJsonLike {
  name?: string;
  experience?: ExperienceLike[];
  projects?: { name: string }[];
}

/**
 * Clave de recencia — la MISMA regla del repo (print_cv_html.ts /
 * sala_html.ts): `end === "present"` es el futuro y va primero; el resto
 * compara ISO. El SSOT no garantiza orden, así que `experience[0]` NO es
 * necesariamente el rol vigente.
 */
export function recencyKey(item: { start: string; end?: string }): string {
  const end = item.end ?? item.start;
  return end === "present" ? "9999-12-31" : end;
}

/** Rol vigente: primero por recencia (end desc, start desc). */
export function currentRoleEn(profile: { experience?: ExperienceLike[] }): string {
  const experience = profile.experience ?? [];
  if (experience.length === 0) return "";
  const sorted = [...experience].sort(
    (a, b) => recencyKey(b).localeCompare(recencyKey(a)) || b.start.localeCompare(a.start)
  );
  return sorted[0]?.role?.en ?? "";
}

/**
 * `facts` salen del DOM (atributos data-verify renderizados desde PROFILE en
 * el build); `json` es el profile.json servido. Devuelve OK/FAIL por hecho.
 */
export function checkFacts(facts: readonly DomFact[], json: ProfileJsonLike): FactCheck[] {
  return facts.map((fact) => {
    let ok = false;
    if (fact.id === "name") ok = json.name === fact.value;
    else if (fact.id === "lastRole") ok = currentRoleEn(json) === fact.value;
    else if (fact.id === "project") ok = (json.projects ?? []).some((p) => p.name === fact.value);
    return { id: fact.id, ok };
  });
}
