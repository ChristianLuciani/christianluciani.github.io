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

interface ProfileJsonLike {
  name?: string;
  experience?: { role: { en: string; es?: string } }[];
  projects?: { name: string }[];
}

/**
 * `facts` salen del DOM (atributos data-verify renderizados desde PROFILE en
 * el build); `json` es el profile.json servido. Devuelve OK/FAIL por hecho.
 */
export function checkFacts(facts: readonly DomFact[], json: ProfileJsonLike): FactCheck[] {
  return facts.map((fact) => {
    let ok = false;
    if (fact.id === "name") ok = json.name === fact.value;
    else if (fact.id === "lastRole") ok = json.experience?.[0]?.role?.en === fact.value;
    else if (fact.id === "project") ok = (json.projects ?? []).some((p) => p.name === fact.value);
    return { id: fact.id, ok };
  });
}
