/**
 * Citations del chat (#145 §2.5): el system prompt le pide al modelo citar
 * los ids de sección como `[id]`. Acá se extraen y se validan contra los ids
 * reales del contexto — un id que no existe en el contexto no se muestra.
 */
export function extractCitations(text: string, sectionIds: readonly string[]): string[] {
  const known = new Set(sectionIds);
  const found = new Set<string>();
  for (const match of text.matchAll(/\[([a-z][a-z0-9-]*)\]/g)) {
    if (known.has(match[1])) found.add(match[1]);
  }
  return [...found];
}
