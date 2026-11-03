/**
 * Traza de procedencia del CV (señal de demo, #109 / #108).
 *
 * `profile-data @ <sha>` sale del snapshot commiteado (`PROFILE.source.commit`);
 * `pasco <version>` y `schema vX.Y` se leen del HEADER autogenerado del snapshot
 * (lo escribe `tools/sync-profile.ts` desde `pasco doctor`). No se duplican
 * versiones a mano: la etiqueta vive en un solo lugar (el archivo generado) y
 * acá sólo se parsea, con test de contrato sobre el formato.
 *
 * El print-CV (#108) comparte el mismo pin con su propio footer: página y PDF
 * declaran la misma procedencia verificable.
 */
import { readFileSync } from "node:fs";
import { PROCEDENCIA } from "../content/cv/museo.ts";
import { PROFILE } from "./profile.generated.ts";

const GENERATED_URL = new URL("./profile.generated.ts", import.meta.url);

/** Header autogenerado (primeras líneas de `profile.generated.ts`). */
function generatedHeader(): string {
  return readFileSync(GENERATED_URL, "utf8").split("\n").slice(0, 8).join("\n");
}

const HEADER = generatedHeader();
const ENGINE = /\/\/ engine @ (\d+\.\d+\.\d+) · schema v(\d+\.\d+)/.exec(HEADER);

/** Versión del engine y del contrato con el que se generó el snapshot. */
export const PROFILE_ENGINE = {
  version: ENGINE?.[1] ?? null,
  schema: ENGINE?.[2] ?? null
} as const;

/** Pin del SSOT: sha completo del commit de `profile-data`. */
export const PROFILE_COMMIT: string = PROFILE.source.commit;

/** URL pública del motor que compila el perfil. */
export const ENGINE_URL = "https://github.com/ChristianLuciani/profile-as-code";

/**
 * Línea discreta del hero: `generado desde profile-data @ <sha> · pasco <ver>`.
 * El texto ES es clave del MAP i18n (`src/content/cv/i18n.ts`).
 */
export function provenanceHtml(): string {
  const engine = PROFILE_ENGINE.version ? ` ${PROCEDENCIA.enginePrefix.es} ${PROFILE_ENGINE.version}` : "";
  const title = `profile-data @ ${PROFILE_COMMIT}${engine}${PROFILE_ENGINE.schema ? ` · schema v${PROFILE_ENGINE.schema}` : ""}`;
  return `    <p class="hero-provenance">
      <a href="${ENGINE_URL}" target="_blank" rel="noopener" title="${title}">${PROCEDENCIA.label.es} <code>${PROFILE_COMMIT}</code>${engine}</a>
    </p>
`;
}
