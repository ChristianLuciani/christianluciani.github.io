/**
 * CURACIÓN VIGENTE — la del TEMA ACTIVO del render (SPEC §5.3/§5.4).
 *
 * Los renderers compartidos (p. ej. el print-CV) no pueden importar
 * `curation/museo.ts`: clasificarían con la tabla de un tema concreto. Piden la
 * curación vigente, que se resuelve por el `id` de la narrativa activa
 * (`withNarrative` la instala durante `assembleHtml({ theme })`).
 *
 * Un manifest EN MEMORIA (tests, preview) puede no estar en el registro de
 * temas: cae al default en vez de romper el render. Un tema REGISTRADO sin
 * curación no llega acá — `curation.test.ts` exige una entrada por tema.
 *
 * Sin ciclo: este módulo va de `themes/**` a la curación, y la curación no
 * importa `themes/**` (el registro resuelve por id, no por narrativa).
 */
import { activeNarrative, isThemeId } from "../../themes/index.ts";
import { CURATIONS, DEFAULT_CURATION, curationFor } from "./index.ts";
import type { Curation } from "./types.ts";

/**
 * Curación del tema que está renderizando.
 *
 * Tema REGISTRADO sin curación ⇒ `curationFor` falla listando las válidas (un
 * tema nuevo no puede publicar con la curación de otro). Manifest ad-hoc (tests,
 * preview en memoria) ⇒ default, porque no está en ninguno de los dos registros.
 */
export function activeCuration(): Curation {
  const { id } = activeNarrative();
  return isThemeId(id) ? curationFor(id) : CURATIONS[id] ?? DEFAULT_CURATION;
}
