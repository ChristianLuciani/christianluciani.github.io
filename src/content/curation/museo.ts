/**
 * CURACIÓN DEL TEMA `museo` (SPEC §5.3/§5.5 · ADR-001 §6 · issue #128).
 *
 * QUÉ ES: las decisiones de presentación del tema default, explícitas y con
 * razón. Reproduce la curación que ya existía dispersa:
 *
 *   · El Marco / El Bastidor — NO se decide acá: se DERIVA de
 *     `PROFILE.projects[].published` (artifactRefs → artifact público). La
 *     curación sólo ordena e incluye; nunca mueve un proyecto de sala.
 *   · orden de proyectos — `order.proyectos`, más reciente primero. Cambiar el
 *     orden de una tarjeta es editar SÓLO este archivo (DoD de #128).
 *   · publicaciones — las 9 del SSOT, en el orden en que la Biblioteca las
 *     publica. El renderer todavía las hardcodea (#99): el gate
 *     `render-drift.test.ts` exige que este orden y el DOM coincidan hasta que
 *     la Biblioteca consuma la proyección.
 *   · galería oculta — `salas:galeria` en `exclude`; `SALAS` deriva `hidden`
 *     de acá (la narrativa decide qué salas EXISTEN, la curación qué se
 *     presenta).
 *
 * QUÉ NO ES: hechos (SSOT), copy (pack del tema) ni clasificación por fechas
 * (el Friso ordena por `end`/`start` del SSOT). `EXPERIENCE_SECTIONS` vive acá
 * porque es curación —no copy— y porque el universo de cobertura necesita la
 * MISMA tabla que usa el print-CV: una sola, no dos que puedan divergir.
 *
 * PRESENTAR ES EL DEFAULT: sólo `exclude` oculta. `include` declara la decisión
 * (la cobertura I3 la verifica `validate.ts`) y alimenta el orden, pero un
 * hecho nuevo del SSOT sin entrada acá se SIGUE MOSTRANDO y el reporte lo marca
 * en rojo (`npm run curation:report`). Elegimos eso a propósito: un issue de
 * contenido no puede hacer desaparecer una ficha del sitio en silencio.
 *
 * COBERTURA: `validate.ts` exige que cada hecho del universo tenga decisión;
 * todo `exclude` exige `reason` redactada al operador.
 */
import { factId } from "./keys.ts";
import type { Curation } from "./types.ts";

/* ── Clasificación de `experience[]` en el print-CV ─────────────────────── */

export type ExperienceSectionId = "professional" | "training";

/** Orden en que las subsecciones se imprimen. */
export const EXPERIENCE_SECTION_ORDER: readonly ExperienceSectionId[] = [
  "professional",
  "training"
];

/**
 * CURACIÓN F1 — una fila por entrada de `experience[]`, exactamente una vez.
 *
 * Los valores son CLAVES (identificadores de fila), no hechos que el print
 * muestre: si el SSOT cambia `org`, `role` o `start`, la clave deja de resolver
 * y el render falla en vez de clasificar mal o esconder la fila. Excepción
 * declarada en SPEC §5.3 (la proyección no expone `id` de fila). El test
 * `print_cv.test.ts` exige cobertura total contra `PROFILE.experience`.
 *
 * DUDOSAS (el rótulo no las delata; se resuelven por lo que la fila ES):
 * - «Pasantía en Transferencia de Video a Cine» (Produrama, 2008): pasantía
 *   profesional rentada, no un taller → professional.
 * - «Asistente de Fotografía Fija» (Frank Martínez & Alberto Hernández, 2007):
 *   asistencia de producción en sets, no una escuela → professional.
 * - «Profesional en Entrenamiento — Centro de Física y Reactor Nuclear»
 *   (IVIC, 2003): puesto de entrenamiento del instituto (empleo), no un curso
 *   tomado → professional.
 * El resto de las filas formativas (postgrado 1998, talleres, escuelas de
 * física, CERN y su beca) son training.
 */
export const EXPERIENCE_SECTIONS: Readonly<Record<string, ExperienceSectionId>> = {
  // ── professional ─────────────────────────────────────────────────────────
  "Grupo Angel — Panamá|Auditor y Consultor|2025-08-01": "professional",
  "Independent — Panama / Ecuador|Consultor Estratégico de Sistemas|2025-01-01": "professional",
  "Universidad San Francisco de Quito (USFQ) — Quito, Ecuador|Coordinador de Laboratorios de Física|2019-01-01": "professional",
  "Fluge-Panamá|Luminotécnico (freelance)|2017-11-01": "professional",
  "Grupo Angel — Panamá|Oficial de Bóveda — Diseño del Sistema de Registro y Auditoría|2016-10-01": "professional",
  "Magic Dreams Productions — Panamá|Productor y Ejecutivo de Cuentas — Logística BTL|2011-11-01": "professional",
  // Pasantía rentada, no formación.
  "Produrama — Caracas|Pasantía en Transferencia de Video a Cine|2008-01-01": "professional",
  "Universidad Santa María — Caracas|Técnico del Estudio de TV — Asistente Docente|2007-01-01": "professional",
  // Asistencia en sets, no un taller.
  "Frank Martínez & Alberto Hernández — Caracas|Asistente de Fotografía Fija|2007-01-01": "professional",
  // Docencia y coordinación en una escuela: empleo, no curso.
  "Escuela de Cine y TV — Caracas|Docente de Edición y Montaje · Coordinador de Post-producción|2009-01-01": "professional",
  "Independent — Caracas|Cámara · Edición · Dirección de Fotografía (freelance)|2006-01-01": "professional",
  // Puesto de entrenamiento del IVIC: empleo, no curso.
  "Instituto Venezolano de Investigaciones Científicas (IVIC) — Caracas|Profesional en Entrenamiento — Centro de Física y Reactor Nuclear|2003-01-01": "professional",
  "Universidad Simón Bolívar — Caracas|Profesor de Física|2003-01-01": "professional",
  // ── training ─────────────────────────────────────────────────────────────
  "AVECOFAN — Caracas|Taller de Fotografía de Moda — Alberto Hernández|2010-01-01": "training",
  "MEDIAX — Caracas|Taller de Formulación de Proyectos Audiovisuales|2009-01-01": "training",
  "VIART — Caracas|Taller de Dirección de Fotografía Electrónica — Daniel Mendoza|2007-01-01": "training",
  "ANAC — Caracas|Taller Pasaporte a Cinematografía Electrónica Cinealta — Jesús «Chuchi» Rivero|2006-01-01": "training",
  "Universidad Central de Venezuela — Caracas|Curso de Fotografía Documental|2006-01-01": "training",
  "UNET — San Cristóbal, Venezuela|I Taller Andino de Caos y Complejidad|2004-01-01": "training",
  "CERN — San Miguel Regla, Mexico (scholarship)|II Latin American School of High Energy Physics|2003-01-01": "training",
  "Universidad de Los Andes (ULA) — Mérida, Venezuela|V, VI y VII Escuela de Relatividad, Campos y Astrofísica|2000-01-01": "training",
  "UNESCO-ICTP — Caracas|I Escuela Latinoamericana de Astrobiología|1999-01-01": "training",
  "Universidad Central de Venezuela — Caracas|Postgrado de Instrumentación|1998-01-01": "training"
};

/* ── Órdenes curados (claves sin prefijo; el prefijo lo pone `factId`) ──── */

/**
 * Orden de El Marco / El Bastidor: más reciente primero. `recencia` (en
 * `cv/proyectos.ts`) sigue siendo la fecha que se expone en `data-recencia`;
 * este arreglo es la fuente del ORDEN. El test exige que ambos coincidan: si
 * divergen, o la fecha está mal o el orden es otro, y hay que decidirlo.
 */
const PROYECTOS: readonly string[] = [
  "profile-as-code",
  "Topia",
  "CLAPPS.AI",
  "Nelson Companion",
  "Esteléctica",
  "ZENTROPY",
  "Kontablo",
  "Drahma",
  "Physics Lab Book",
  "NOOS",
  "Upstream Open Source Contributions"
];

/**
 * Orden de La Biblioteca (las 9 publicaciones del SSOT). La fila institucional
 * de «36 guías» NO es una publicación: es la presentación del proyecto
 * `Physics Lab Book` dentro de la sala (SPEC §4) y por eso no entra acá.
 */
const PUBLICACIONES: readonly string[] = [
  "10.5281/zenodo.20738795",
  "10.1016/j.cartre.2025.100502",
  "10.1002/cphc.202400711",
  "10.1016/j.heliyon.2023.e17258",
  "https://www.researchgate.net/publication/383276828",
  "10.2139/ssrn.4307097",
  "https://aiche.confex.com/aiche/2022/meetingapp.cgi/Paper/649030",
  "10.5488/CMP.9.2.373",
  "10.1143/PTPS.161.314"
];

/** Salas que el tema PRESENTA, en orden DOM. La galería va en `exclude`. */
const SALAS_VISIBLES: readonly string[] = [
  "proyectos",
  "bastidor",
  "competencias",
  "experiencia",
  "fisica",
  "grafo",
  "perfil",
  "contacto"
];

/* ── Decisiones de exclusión (siempre con razón) ────────────────────────── */

const SIN_SUPERFICIE_CREDENCIAL =
  "El tema museo no tiene superficie propia de credenciales: la acreditación se " +
  "presenta dentro de Trayectoria/Formación y el hecho sigue en el SSOT para " +
  "otro tema que sí la muestre.";

const SIN_SUPERFICIE_ARTEFACTO =
  "El artefacto se presenta a través de su proyecto (artifactRefs → El Marco); " +
  "el tema museo no publica una ficha de artefacto separada. Excluir acá no " +
  "borra el hecho ni su link.";

/**
 * Credenciales que el tema no publica como entidad propia. Son ids del SSOT
 * (`credentials[].id`), no una lista copiada de hechos.
 */
const CREDENCIALES_NO_PRESENTADAS: readonly string[] = [
  "bsc-physics-ucv",
  "radiological-protection-xrays",
  "french-b1-pau",
  "scholarship-cern-2003",
  "scholarship-ula-relativity",
  "scholarship-ucv-sciences"
];

const ARTEFACTOS_NO_PRESENTADOS: readonly string[] = [
  "profile-as-code",
  "kontablo-accounting-esperanto",
  "drahma-tutors"
];

/* ── La curación ────────────────────────────────────────────────────────── */

export const MUSEO_CURATION: Curation = {
  include: [
    ...PROYECTOS.map((key) => factId("proyectos", key)),
    ...PUBLICACIONES.map((key) => factId("publicaciones", key)),
    ...Object.keys(EXPERIENCE_SECTIONS).map((key) => factId("experiencia", key)),
    // Formación: el print-CV imprime los 4 grados del SSOT, completos.
    ...[
      "exp-specialization-audiovisual",
      "exp-doctoral-candidacy-usb",
      "exp-bsc-physics-ucv",
      "exp-high-school-sciences"
    ].map((key) => factId("formacion", key)),
    // Competencias e idiomas: el print-CV imprime todas las filas del SSOT.
    ...[
      "Synthetic Cognition / Agents",
      "Agentic Coding",
      "Technological Sovereignty",
      "Open Source",
      "Platforms & Ecosystem",
      "Sciences — Physics",
      "Programming & Data",
      "Audiovisual Production"
    ].map((key) => factId("competencias", key)),
    ...["es", "en", "fr"].map((key) => factId("idiomas", key)),
    ...SALAS_VISIBLES.map((key) => factId("salas", key))
  ],
  exclude: [
    {
      id: factId("salas", "galeria"),
      reason:
        "El Archivo no tiene piezas curadas: se oculta la sala vacía en vez de " +
        "publicar un marco sin obra. Ocultar no borra: el día que haya material " +
        "entra a `include`."
    },
    ...CREDENCIALES_NO_PRESENTADAS.map((key) => ({
      id: factId("credenciales", key),
      reason: SIN_SUPERFICIE_CREDENCIAL
    })),
    ...ARTEFACTOS_NO_PRESENTADOS.map((key) => ({
      id: factId("artefactos", key),
      reason: SIN_SUPERFICIE_ARTEFACTO
    }))
  ],
  order: {
    proyectos: PROYECTOS,
    publicaciones: PUBLICACIONES
  }
};
