/**
 * CONTRATO DE CURACIÓN (SPEC §5.3/§5.5 · ADR-001 §6 · I3).
 *
 * QUÉ ES: la decisión explícita de qué hechos del perfil se PRESENTAN y cuáles
 * se ocultan en un tema, en qué orden, y por qué. Excluir NUNCA borra: el hecho
 * sigue en `profile-data` y en los demás temas.
 *
 * IDS: cada hecho del universo (`facts.ts`) tiene un id `colección:clave`, p.
 * ej. `proyectos:Kontablo`, `publicaciones:10.5281/zenodo.20738795`,
 * `experiencia:Grupo Angel — Panamá|Auditor y Consultor|2025-08-01`. El prefijo
 * evita colisiones entre colecciones (un proyecto y una credencial pueden
 * llamarse igual) y hace legible el reporte. `order` es por colección
 * (`Record<colección, claves>`), así que sus valores van SIN prefijo.
 *
 * `include`/`exclude`/`order` son la forma ratificada en ADR-001 §6; este
 * archivo sólo la tipa. La cobertura (todo hecho con decisión) la verifica
 * `validate.ts` y la expone `tools/curation.ts --report`.
 */

/** Colecciones curables del perfil público + las salas de la narrativa. */
export type CollectionId =
  | "proyectos"
  | "publicaciones"
  | "experiencia"
  | "formacion"
  | "competencias"
  | "idiomas"
  | "credenciales"
  | "artefactos"
  | "salas";

/** Exclusión explícita: el `reason` es obligatorio y va redactado al operador. */
export interface CurationExclusion {
  readonly id: string;
  readonly reason: string;
}

export interface Curation {
  /**
   * Hechos que el tema declara presentar (ids `colección:clave`). No oculta
   * nada: el default es presentar, y sólo `exclude` quita. Sirve para la
   * cobertura I3 y para declarar el orden.
   */
  readonly include: readonly string[];
  /** Hechos que el tema oculta, cada uno con su razón. */
  readonly exclude: readonly CurationExclusion[];
  /** Orden de presentación por colección (claves sin prefijo). */
  readonly order?: Partial<Record<CollectionId, readonly string[]>>;
}

/** Un hecho del universo, con la superficie que HOY lo presenta (si existe). */
export interface Fact {
  readonly id: string;
  readonly collection: CollectionId;
  readonly key: string;
  readonly label: string;
  /** Dónde se presenta hoy dentro del tema; `undefined` = sin superficie. */
  readonly surface?: string;
}

/** Colección del universo con sus hechos, en orden estable. */
export interface FactCollection {
  readonly id: CollectionId;
  readonly label: string;
  readonly facts: readonly Fact[];
}
