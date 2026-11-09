/**
 * Tipo del JSON-LD de la entidad (src/data/entity.generated.ts, pasco entity
 * #140). Vive aparte (type-only) para que export.ts siga siendo puro y no
 * arrastre el módulo generado al bundle del navegador.
 */
export interface EntityJsonLd {
  nodes: Record<string, unknown>[];
}
