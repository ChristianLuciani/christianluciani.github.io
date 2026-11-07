/**
 * PIEL DEL TEMA VIGENTE (SPEC §5.6 · ADR-001 §D11 · S4).
 *
 * Los renderers NO importan la piel del tema directo: piden `emitSkin()` acá.
 * Así ningún template conoce el id del tema (ADR-001 §2) y la resolución de la
 * piel vive en UN punto.
 *
 * S4 — la piel se resuelve POR TEMA (antes `emitSkin` emitía siempre la de
 * `museo`, y un tema no-default con `skin.css` propio publicaba otra piel que
 * la declarada). La convención es la misma que ya usaba el gate: el archivo
 * `src/themes/<id>/skin.css` del tema ACTIVO (`activeNarrative().id`, que
 * `assembleHtml({ theme })` instala durante el render). Un tema sin `skin.css`
 * propio hereda la del default y `skinFor()` lo declara.
 *
 * POR QUÉ NO VIVE EN EL MANIFEST: `NarrativeManifest` se importa también en el
 * bundle del browser (`src/content/copy.ts` → `themes/index.ts`). Leer el CSS
 * exige `node:fs`, así que el manifest no puede cargarlo sin meter Node en el
 * bundle. La piel es un artefacto de BUILD: se resuelve por id acá, y el
 * registro sigue siendo sólo la fuente de ids/narrativas.
 *
 * El emisor conserva el congelamiento de I1 (`@derived` de `museo`): la piel se
 * autora con tokens alpha y el CSS emitido resuelve los derivados. Un tema que
 * no declare bloque derivado no necesita congelar nada: su fuente ya es el
 * CSS emitido (identidad), así que la ausencia del bloque no es un error acá.
 */
import { existsSync, readFileSync } from "node:fs";
import { DEFAULT_THEME, activeNarrative } from "./index.ts";
import { PRINT_RULE_PLACEHOLDER, emitSkinCss } from "./museo/skin.ts";

/** Piel resuelta para un tema. */
export interface SkinFile {
  /** Tema cuya piel se emite (el propio, o el default si hereda). */
  readonly id: string;
  /** Tema que la pidió (puede diferir de `id` cuando hereda). */
  readonly requested: string;
  readonly source: string;
  /** true → el tema no tiene `skin.css` propio y usa la piel del default. */
  readonly inherited: boolean;
  /** Ruta lógica para mensajes (`src/themes/<id>/skin.css`). */
  readonly file: string;
}

const SKIN_DIR = new URL("./", import.meta.url);

/**
 * Piel del tema `id`, por convención de directorio. Un id no registrado (un
 * manifest ad-hoc de tests/preview) hereda la del default en vez de romper el
 * render; un tema registrado sin `skin.css` hace lo mismo y el reporte lo dice.
 */
export function skinFor(id: string): SkinFile {
  const own = new URL(`${id}/skin.css`, SKIN_DIR);
  // El id viaja a una ruta: un slug válido no puede escapar del directorio.
  if (/^[a-z0-9-]+$/.test(id) && existsSync(own)) {
    return {
      id,
      requested: id,
      source: readFileSync(own, "utf8"),
      inherited: false,
      file: `src/themes/${id}/skin.css`
    };
  }
  return {
    id: DEFAULT_THEME,
    requested: id,
    source: readFileSync(new URL(`${DEFAULT_THEME}/skin.css`, SKIN_DIR), "utf8"),
    inherited: true,
    file: `src/themes/${DEFAULT_THEME}/skin.css`
  };
}

/**
 * CSS listo para el `<style>` de una fuente de piel.
 *
 * El placeholder del print se sustituye siempre. Si la fuente declara bloque
 * `@derived` se resuelve (congelamiento I1 de `museo`); si no, la fuente ES el
 * CSS emitido y no hay nada que colapsar.
 */
export function skinCss(source: string, printRuleColor: string): string {
  const substituted = source.split(PRINT_RULE_PLACEHOLDER).join(printRuleColor);
  if (!substituted.includes("/* @derived:begin */")) return substituted;
  return emitSkinCss(printRuleColor, source);
}

/**
 * CSS de la piel vigente listo para el `<style>`.
 *
 * `printRuleColor` entra por parámetro para que la constante del print-CV siga
 * siendo una sola (`src/templates/print-tokens.ts`): la piel la pide por
 * placeholder y el emisor la resuelve; no hay un segundo `#00c9c0` escrito a
 * mano en el CSS.
 */
export function emitSkin(printRuleColor: string): string {
  return skinCss(skinFor(activeNarrative().id).source, printRuleColor);
}
