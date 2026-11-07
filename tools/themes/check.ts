/**
 * GATE MULTI-TEMA (#133 · SPEC §8 FASE 5.6 · ADR-001 I4/I5).
 *
 * QUÉ HACE: verifica, tema por tema, las cuatro dimensiones que el issue #133
 * declara —y que antes vivían sólo como tests del tema default—:
 *
 *   1. COPY: cada clave del pack tiene ES y EN no vacíos y el render del tema
 *      publica toda clave no `runtime` (0 huérfanas).
 *   2. CURACIÓN: el tema tiene curación registrada, cubre el 100% de los hechos
 *      del SSOT con `reason` en cada exclusión y clasifica TODA fila de
 *      `experience[]` para el print-CV.
 *   3. PIEL: `src/themes/<id>/skin.css` no declara literales de color fuera de
 *      sus bloques de tokens.
 *   4. CONTRASTE: todo color de texto y toda combinación texto/tinte de la piel
 *      tiene par declarado y pasa AA; las deudas son explícitas y se
 *      auto-eliminan cuando el par empieza a cumplir.
 *
 * Además exige el GOLDEN de cada tema registrado (`tests/golden/<id>.html`):
 * el snapshot por tema es el instrumento de I1 y un tema sin baseline no tiene
 * gate de render. El job de CI corre `npm test` (que compara esos baselines) y
 * `npm run golden:policy` (que protege el baseline del tema default).
 *
 * POR QUÉ UN GATE Y NO CUATRO TESTS: `skin.test.ts` y `curation.test.ts`
 * verifican el tema `museo` con más detalle (byte-identidad del CSS, ratios
 * citados a mano, canon de tokens). Este gate es el denominador común que corre
 * `npm run themes:check` sobre TODOS los temas del registro: un tema nuevo no
 * hereda la cobertura por estar al lado de `museo`. Las funciones son puras y
 * reciben la piel/el render/la curación inyectados para que los tests puedan
 * recorrer los caminos rojos sin crear un tema real.
 *
 * LÍMITE DECLARADO: mientras `NarrativeManifest` no exponga `skin` (ADR-001
 * §D11, S4), la piel se resuelve por CONVENCIÓN: `src/themes/<id>/skin.css` +
 * `src/themes/<id>/contrast.ts`. Un tema sin `skin.css` propio HEREDA la piel
 * del tema default (ya validada en su propia entrada) y el reporte lo declara.
 * Cuando el manifest exponga `skin`, el resolver cambia en este único punto.
 *
 * Uso: npm run themes:check
 *      (no necesita `dist/`; `themes:assets` sí, y corre después del build)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CURATIONS } from "../../src/content/curation/index.ts";
import { factUniverse } from "../../src/content/curation/facts.ts";
import { experienceKey } from "../../src/content/curation/keys.ts";
import type { Curation, FactCollection } from "../../src/content/curation/types.ts";
import { validateCuration } from "../../src/content/curation/validate.ts";
import { PROFILE } from "../../src/data/profile.generated.ts";
import type { CvProfile } from "../../src/data/profile.types.ts";
import { assembleHtml } from "../../src/templates/index.ts";
import {
  resolvePair,
  type ContrastDebt,
  type ContrastPair
} from "../../src/themes/museo/contrast.ts";
import {
  scanColorLiterals,
  tintedTextRules,
  tokenDeclarations
} from "../../src/themes/museo/skin.ts";
import { DEFAULT_THEME, THEMES, themeIds } from "../../src/themes/index.ts";
import { resolveThemeAddress } from "../../src/themes/site.ts";
import type { NarrativeManifest } from "../../src/themes/types.ts";
import { COPY_ATTRS } from "../copy/lint.ts";
import { baselinePathFor } from "../golden/paths.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Piel de un tema: el CSS fuente y el contrato de contraste que lo acompaña. */
export interface SkinInput {
  readonly source: string;
  readonly contrastPairs: readonly ContrastPair[];
  readonly debt: readonly ContrastDebt[];
  /** Ruta lógica para el mensaje; default: `src/themes/<id>/skin.css`. */
  readonly file?: string;
}

/** Un tema con todo lo que el gate necesita; el render es opcional. */
export interface ThemeInput {
  readonly narrative: NarrativeManifest;
  /** HTML del render del tema; sin él no se pueden detectar claves huérfanas. */
  readonly html?: string;
  /** Error de `assembleHtml` (el render tiene que fallar ruidoso, no tumbar el gate). */
  readonly renderError?: string;
  readonly curation?: Curation;
  readonly skin?: SkinInput;
  /** La piel no se pudo cargar (contrato incompleto): error del tema, no crash. */
  readonly skinError?: string;
}

export interface ThemeReport {
  readonly id: string;
  readonly errors: readonly string[];
  /** Observaciones que no son problemas (p. ej. piel heredada). */
  readonly notes: readonly string[];
}

export interface CheckOptions {
  readonly themes: readonly ThemeInput[];
  /** Universo de hechos curable; default: el del SSOT commiteado. */
  readonly facts?: readonly FactCollection[];
  /** Filas de `experience[]` para la clasificación del print-CV. */
  readonly experience?: readonly {
    id?: string;
    org: string;
    role: { en: string; es?: string };
    start: string;
  }[];
  /** Raíz del repo donde viven `tests/golden/<id>.html`. */
  readonly root?: string;
  /** Exigir el baseline de cada tema (default: true). */
  readonly requireGolden?: boolean;
}

export interface ThemesReport {
  readonly themes: readonly ThemeReport[];
  /** Baseline esperado por tema, con su presencia. */
  readonly golden: readonly { id: string; path: string; present: boolean }[];
  /** Errores del registro (paths duplicados, goldens faltantes). */
  readonly errors: readonly string[];
  readonly ok: boolean;
}

/* ──────────────────────────────────────────────
   COPY
────────────────────────────────────────────── */

const norm = (value: string): string => value.replace(/\s+/g, " ").trim();

/** Desescapa las entidades que el render emite (mismo criterio que el diccionario). */
function decode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Superficie de copy del render: texto visible (sin scripts, estilos, comentarios
 * ni tags) + valores de atributos de copy. El marcado inline NO cuenta: `t()`
 * puede emitir `<em>` dentro de una clave y el nodo de texto es el mismo copy
 * (F9 del pase fresco de #158).
 */
function renderedCopy(html: string): { text: string; attrs: string[] } {
  const decoded = decode(html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ");
  const text = norm(decoded.replace(/<[^>]*>/g, " "));
  const attrs: string[] = [];
  const tagRe = /<([a-zA-Z][\w-]*)([^>]*)>/g;
  let tag: RegExpExecArray | null;
  while ((tag = tagRe.exec(decoded))) {
    const tagName = tag[1].toLowerCase();
    const attrRe = /([\w:-]+)="([^"]*)"/g;
    let attr: RegExpExecArray | null;
    while ((attr = attrRe.exec(tag[2]))) {
      const name = attr[1].toLowerCase();
      if (COPY_ATTRS.has(name) || (name === "content" && tagName === "meta")) {
        attrs.push(norm(decode(attr[2]).replace(/<[^>]*>/g, " ")));
      }
    }
  }
  return { text, attrs };
}

/** Copy comparable: markup inline fuera y entidades desescapadas. */
function copyText(value: string): string {
  return norm(decode(value).replace(/<[^>]*>/g, " "));
}

/**
 * ¿La clave aparece en `container`?
 *
 * Una coincidencia NO cuenta si está DENTRO de la ocurrencia de OTRA clave más
 * larga (F2 del pase fresco de #158: "Física" ⊂ "Licenciatura en Física" hacía
 * pasar una clave huérfana). El contenedor exacto (un nodo de texto que ES la
 * clave) siempre cuenta: ahí la ocurrencia es la del dueño, no la de un
 * contenedor ajeno. Las claves anidadas legítimas siguen pasando si además
 * aparecen por su cuenta en otra superficie.
 */
function credited(
  container: string,
  es: string,
  covers: readonly { es: string; offset: number }[]
): boolean {
  if (!es) return false;
  for (let at = container.indexOf(es); at >= 0; at = container.indexOf(es, at + 1)) {
    const covered = covers.some(
      (cover) => at - cover.offset >= 0 && container.startsWith(cover.es, at - cover.offset)
    );
    if (!covered) return true;
  }
  return false;
}

/** Claves más largas que contienen a esta (con su offset), para no acreditar substrings. */
function coveringKeys(
  es: string,
  all: readonly { key: string; es: string }[]
): { es: string; offset: number }[] {
  return all
    .filter((other) => other.es.length > es.length && other.es.includes(es))
    .map((other) => ({ es: other.es, offset: other.es.indexOf(es) }));
}

/**
 * Errores de copy de un tema: ES/EN completos (sin fallback silencioso) y toda
 * clave no `runtime` publicada por el render.
 *
 * Se comparan TODAS las claves, incluidas las que tienen ES === EN (F1 del pase
 * fresco de #158: `pairsOf` las omitía y 52 claves nunca se verificaban contra
 * el render). El marcador `runtime` cubre el copy que el HTML inicial no
 * garantiza (intro, canvas, estados); sin la marca, una clave muerta es deuda y
 * falla.
 */
export function copyErrors(narrative: NarrativeManifest, html?: string): string[] {
  const errors: string[] = [];
  const entries = Object.entries(narrative.copy);
  if (entries.length === 0) {
    errors.push("copy: el pack del tema está vacío");
    return errors;
  }

  for (const [key, entry] of entries) {
    if (typeof entry.es !== "string" || entry.es.trim().length === 0) {
      errors.push(`copy["${key}"]: falta ES (no hay fallback silencioso)`);
    }
    if (typeof entry.en !== "string" || entry.en.trim().length === 0) {
      errors.push(`copy["${key}"]: falta EN (la clave no está traducida)`);
    }
  }
  if (!html) return errors;

  const { text, attrs } = renderedCopy(html);
  const all = entries.map(([key, entry]) => ({ key, es: copyText(entry.es) }));
  for (const [key, entry] of entries) {
    if (entry.runtime) continue;
    const es = copyText(entry.es);
    // Un ES vacío ya se reportó arriba; sin texto no hay superficie que buscar.
    if (!es) continue;
    const covers = coveringKeys(
      es,
      all.filter((other) => other.key !== key)
    );
    const rendered =
      credited(text, es, covers) ||
      attrs.some((value) => credited(value, es, covers));
    if (!rendered) {
      errors.push(
        `copy["${key}"]: clave huérfana — "${es}" no aparece en el render del tema ` +
          `(¿la sacaste del template? ¿o le falta \`runtime: true\`?) [EN: "${copyText(entry.en)}"]`
      );
    }
  }
  return errors;
}

/* ──────────────────────────────────────────────
   CURACIÓN
────────────────────────────────────────────── */

/**
 * Errores de curación de un tema: registro, cobertura 100%, razones y
 * clasificación de `experience[]` (el print-CV es un renderer compartido y una
 * fila sin sección lo deja en fallo ruidoso, no en una sección adivinada).
 */
export function curationErrors(
  themeId: string,
  curation: Curation | undefined,
  facts: readonly FactCollection[],
  experience: readonly {
    id?: string;
    org: string;
    role: { en: string; es?: string };
    start: string;
  }[]
): string[] {
  if (!curation) {
    return [
      `curación: el tema "${themeId}" no tiene entrada en CURATIONS; ` +
        `declarala en src/content/curation/${themeId}.ts y registrala en ` +
        "src/content/curation/index.ts"
    ];
  }

  const report = validateCuration(curation, facts);
  const errors: string[] = [...report.errors];
  for (const fact of report.undecided) {
    errors.push(`curación: hecho sin decisión — ${fact.id}`);
  }
  const table = curation.experienceSections;
  for (const item of experience) {
    const key = experienceKey(item);
    if (!table || !Object.hasOwn(table, key)) {
      errors.push(
        `curación: experienceSections no clasifica la fila "${key}" ` +
          "(professional | training) que imprime el print-CV"
      );
      continue;
    }
    const section = table[key];
    if (section !== "professional" && section !== "training") {
      errors.push(`curación: experienceSections["${key}"] tiene una sección inválida: ${section}`);
    }
  }
  return errors;
}

/* ──────────────────────────────────────────────
   PIEL Y CONTRASTE
────────────────────────────────────────────── */

/** Pares de contraste, indexados por el par real (`fg|bg|bases`). */
function pairKey(pair: { fg: string; bg: string; bases?: readonly string[] }): string {
  return `${pair.fg}|${pair.bg}|${(pair.bases ?? []).join(">")}`;
}

/**
 * Errores de la piel de un tema:
 *
 *   · literales de color fuera del bloque de tokens (la paleta se declara una vez);
 *   · todo `color: var(--x)` de una regla tiene par declarado (no hay texto sin medir);
 *   · toda regla que pinta texto sobre un tinte derivado tiene su par (el par por
 *     tokens no modela el alpha: F1 del pase fresco de #130);
 *   · cada par resuelve, declara tokens existentes y pasa AA salvo deuda explícita;
 *   · cada deuda pertenece a un par, cita el ratio MEDIDO y no sobrevive al arreglo.
 */
export function skinErrors(themeId: string, skin: SkinInput): string[] {
  const errors: string[] = [];
  const file = skin.file ?? `src/themes/${themeId}/skin.css`;
  const { source } = skin;

  for (const hit of scanColorLiterals(source)) {
    if (hit.inTokenBlock) continue;
    errors.push(
      `piel: literal de color fuera del bloque de tokens — ${file}:${hit.line} ${hit.value}`
    );
  }

  const tokens = new Map(tokenDeclarations(source).map((token) => [token.name, token.value]));
  const declared = new Set(skin.contrastPairs.map((pair) => pairKey(pair)));
  // Las reglas con tinte se declaran por par `fg|bg`, sin la pila `bases`: la
  // pila es cómo se mide el par, no una segunda combinación que declarar.
  const declaredTints = new Set(skin.contrastPairs.map((pair) => `${pair.fg}|${pair.bg}`));
  const fgTokens = new Set(skin.contrastPairs.map((pair) => pair.fg));

  const usedFg = [
    ...source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .matchAll(/(?<![-\w])color\s*:\s*var\((--[a-z0-9-]+)\)/g)
  ].map((match) => match[1]);
  for (const token of usedFg) {
    if (!fgTokens.has(token)) {
      errors.push(`piel: color:var(${token}) sin par de contraste declarado — ${file}`);
    }
  }

  for (const rule of tintedTextRules(source)) {
    if (!declaredTints.has(`${rule.fg}|${rule.bg}`)) {
      errors.push(
        `piel: ${rule.selector} pinta ${rule.fg} sobre ${rule.bg} sin par de contraste ` +
          `declarado — ${file}`
      );
    }
  }

  const debts = new Map(skin.debt.map((debt) => [pairKey(debt), debt]));
  for (const pair of skin.contrastPairs) {
    if (!tokens.has(pair.fg)) errors.push(`contraste: token desconocido ${pair.fg}`);
    if (!tokens.has(pair.bg)) errors.push(`contraste: token desconocido ${pair.bg}`);
    for (const base of pair.bases ?? []) {
      if (!tokens.has(base)) errors.push(`contraste: token desconocido ${base}`);
    }
    if (!pair.usage || pair.usage.trim().length <= 10) {
      errors.push(`contraste: el par ${pair.fg}/${pair.bg} no declara para qué se usa`);
    }
    // F3 del pase fresco de #158: el umbral no es autodeclarable. AA admite 4,5:1
    // para texto normal y 3:1 para texto grande/piezas de UI; un `min: 1` (o
    // cualquier otro valor) haría pasar un par ilegible por debajo de AA.
    if (pair.min !== 4.5 && pair.min !== 3) {
      errors.push(
        `contraste: el par ${pairKey(pair)} declara un umbral inválido (${pair.min}:1); ` +
          "AA es 4,5:1 para texto normal y 3:1 para texto grande o pieza de UI"
      );
    }

    let ratio: number;
    try {
      ratio = resolvePair(pair, tokens);
    } catch (error) {
      errors.push(`contraste: ${pairKey(pair)} no resuelve — ${(error as Error).message}`);
      continue;
    }

    const debt = debts.get(pairKey(pair));
    if (debt) {
      // Auto-eliminación: una deuda que ya cumple es una excepción podrida.
      if (ratio >= pair.min) {
        errors.push(
          `contraste: AA_DEBT quedó obsoleta — ${pairKey(pair)} ya cumple ` +
            `${pair.min}:1 (${ratio.toFixed(2)}:1); borrá la deuda`
        );
      }
      if (Math.abs(ratio - debt.ratio) >= 0.005) {
        errors.push(
          `contraste: ratio citado ≠ medido para ${pairKey(pair)} — ` +
            `declara ${debt.ratio.toFixed(2)}:1, mide ${ratio.toFixed(2)}:1`
        );
      }
      if (debt.min !== pair.min) {
        errors.push(`contraste: la deuda ${pairKey(pair)} declara otro umbral que el par`);
      }
      if (!debt.reason || debt.reason.trim().length <= 20) {
        errors.push(`contraste: la deuda ${pairKey(pair)} no declara una razón real`);
      }
      if (!source.includes(debt.selector)) {
        errors.push(
          `contraste: la deuda ${pairKey(pair)} cita un selector que no está en ${file}: ` +
            `${debt.selector}`
        );
      }
      continue;
    }
    if (ratio < pair.min) {
      errors.push(
        `contraste: ${pairKey(pair)} = ${ratio.toFixed(2)}:1 < ${pair.min}:1 ` +
          `(${pair.usage}); corregí el token o declará la deuda con su razón`
      );
    }
  }

  for (const debt of skin.debt) {
    if (!declared.has(pairKey(debt))) {
      errors.push(
        `contraste: la deuda ${debt.selector} (${pairKey(debt)}) no tiene par declarado`
      );
    }
  }
  return errors;
}

/* ──────────────────────────────────────────────
   MANIFEST, REGISTRO Y GOLDEN
────────────────────────────────────────────── */

/** Errores propios del manifest: id, metadata y dirección publicable. */
function manifestErrors(narrative: NarrativeManifest): string[] {
  const errors: string[] = [];
  if (!/^[a-z0-9-]+$/.test(narrative.id)) {
    errors.push(`manifest: el id "${narrative.id}" no es un slug [a-z0-9-]`);
  }
  if (narrative.meta.title.trim().length === 0) errors.push("manifest: meta.title vacío");
  if (narrative.meta.description.trim().length === 0) {
    errors.push("manifest: meta.description vacío");
  }
  if (narrative.meta.ogImage.trim().length === 0) errors.push("manifest: meta.ogImage vacío");
  try {
    resolveThemeAddress(narrative, {});
  } catch (error) {
    errors.push(`manifest: dirección de publicación inválida — ${(error as Error).message}`);
  }
  return errors;
}

/** Reporte de UN tema: manifest + render + copy + curación + piel. */
export function checkTheme(
  theme: ThemeInput,
  options: {
    facts?: readonly FactCollection[];
    experience?: CheckOptions["experience"];
  } = {}
): ThemeReport {
  const id = theme.narrative.id;
  const errors: string[] = [...manifestErrors(theme.narrative)];
  const notes: string[] = [];

  if (theme.renderError) {
    errors.push(`render: el tema no renderiza — ${theme.renderError}`);
  }

  errors.push(...copyErrors(theme.narrative, theme.html));
  errors.push(
    ...curationErrors(
      id,
      theme.curation,
      options.facts ?? factUniverse(),
      options.experience ?? (PROFILE as unknown as CvProfile).experience
    )
  );

  if (theme.skinError) {
    errors.push(`piel: ${theme.skinError}`);
  } else if (theme.skin) {
    // F4 del pase fresco de #158: `src/themes/skin.ts` emite SÓLO la piel de
    // museo (ADR-001 §D11/S4 pendiente). Certificar la piel de un tema
    // no-default sería certificar CSS que nunca llega al render.
    if (id !== DEFAULT_THEME) {
      errors.push(
        `piel: el tema "${id}" declara skin.css propio pero el emisor ` +
          `(src/themes/skin.ts) sólo emite la piel de "${DEFAULT_THEME}"; esta piel no ` +
          "llega al render, así que el gate no puede certificarla (ADR-001 §D11/S4)"
      );
    }
    errors.push(...skinErrors(id, theme.skin));
  } else if (id === DEFAULT_THEME) {
    errors.push(
      `piel: el tema default "${id}" no tiene src/themes/${id}/skin.css; ` +
        "sin piel no hay nada que emitir (¿la movieron?)"
    );
  } else {
    notes.push(`piel: el tema no tiene skin.css propio; hereda la del tema default`);
  }

  return { id, errors, notes };
}

/**
 * Reporte del artefacto multi-tema: un reporte por tema, paths únicos y el
 * baseline de render de cada tema registrado.
 */
export function checkThemes(options: CheckOptions): ThemesReport {
  const root = options.root ?? ROOT;
  const errors: string[] = [];
  const themes = options.themes.map((theme) =>
    checkTheme(theme, { facts: options.facts, experience: options.experience })
  );

  // Un artefacto publica una página por path: dos temas en el mismo subpath se
  // pisan en silencio y el sitemap lista una sola URL.
  const byPath = new Map<string, string[]>();
  for (const theme of options.themes) {
    const key = theme.narrative.path;
    byPath.set(key, [...(byPath.get(key) ?? []), theme.narrative.id]);
  }
  for (const [path, ids] of byPath) {
    if (ids.length > 1) {
      errors.push(
        `registro: los temas ${ids.join(", ")} publican en el mismo path ` +
          `("${path || "/"}"); un artefacto tiene una página por subpath`
      );
    }
  }

  const golden = options.themes.map((theme) => {
    const id = theme.narrative.id;
    const path = baselinePathFor(id);
    return { id, path, present: existsSync(join(root, path)) };
  });
  if (options.requireGolden !== false) {
    for (const item of golden) {
      if (!item.present) {
        errors.push(
          `golden: falta el baseline del tema "${item.id}" (${item.path}); ` +
            "corré `npm run golden:update` y commiteá el snapshot"
        );
      }
    }
  }

  return {
    themes,
    golden,
    errors,
    ok: errors.length === 0 && themes.every((theme) => theme.errors.length === 0)
  };
}

/* ──────────────────────────────────────────────
   CARGA DEL REGISTRO (CLI y test de integración)
────────────────────────────────────────────── */

interface ContrastModule {
  readonly SKIN_CONTRAST_PAIRS?: readonly ContrastPair[];
  readonly AA_DEBT?: readonly ContrastDebt[];
}

/**
 * Piel por convención (ver límite declarado en el encabezado): lee
 * `src/themes/<id>/skin.css` y carga su `contrast.ts`. Sin `skin.css` propio
 * devuelve `undefined` (hereda la del default).
 */
async function resolveSkin(themeId: string): Promise<SkinInput | undefined> {
  const cssFile = join(ROOT, "src/themes", themeId, "skin.css");
  if (!existsSync(cssFile)) return undefined;

  const contrastFile = join(ROOT, "src/themes", themeId, "contrast.ts");
  if (!existsSync(contrastFile)) {
    throw new Error(
      `piel: ${themeId} tiene skin.css pero no contrast.ts; sin el contrato de pares ` +
        "no hay forma de verificar contraste AA"
    );
  }
  const module = (await import(pathToFileURL(contrastFile).href)) as ContrastModule;
  if (
    !Array.isArray(module.SKIN_CONTRAST_PAIRS) ||
    !Array.isArray(module.AA_DEBT)
  ) {
    throw new Error(
      `piel: ${themeId}/contrast.ts no exporta SKIN_CONTRAST_PAIRS y AA_DEBT`
    );
  }
  return {
    source: readFileSync(cssFile, "utf8"),
    contrastPairs: module.SKIN_CONTRAST_PAIRS,
    debt: module.AA_DEBT,
    file: `src/themes/${themeId}/skin.css`
  };
}

/**
 * Registro real: cada tema con su render, su curación y su piel. Un render que
 * explota no tumba el gate: se reporta como error del tema (el mensaje del
 * render es el que necesita el operador).
 */
export async function loadThemes(): Promise<ThemeInput[]> {
  const themes: ThemeInput[] = [];
  for (const id of themeIds()) {
    const narrative = THEMES[id];
    let html: string | undefined;
    let renderError: string | undefined;
    try {
      html = assembleHtml({ theme: narrative });
    } catch (error) {
      renderError = (error as Error).message;
    }

    let skin: SkinInput | undefined;
    let skinError: string | undefined;
    try {
      skin = await resolveSkin(id);
    } catch (error) {
      // La piel ilegible se reporta como error del tema, no como crash: el
      // reporte tiene que nombrar el archivo y el motivo.
      skinError = (error as Error).message;
    }

    themes.push({
      narrative,
      ...(html === undefined ? {} : { html }),
      ...(renderError === undefined ? {} : { renderError }),
      curation: CURATIONS[id],
      ...(skin === undefined ? {} : { skin }),
      ...(skinError === undefined ? {} : { skinError })
    });
  }
  return themes;
}

/* ──────────────────────────────────────────────
   CLI
────────────────────────────────────────────── */

async function main(): Promise<number> {
  let themes: ThemeInput[];
  try {
    themes = await loadThemes();
  } catch (error) {
    console.error(`❌ themes:check no pudo cargar el registro: ${(error as Error).message}`);
    return 1;
  }

  const report = checkThemes({ themes });
  for (const theme of report.themes) {
    const state = theme.errors.length === 0 ? "✓" : "✗";
    console.log(`· ${state} ${theme.id}`);
    for (const note of theme.notes) console.log(`    ${note}`);
    for (const error of theme.errors) console.error(`❌ ${theme.id}: ${error}`);
  }
  for (const error of report.errors) console.error(`❌ ${error}`);
  if (report.ok) {
    const goldens = report.golden.filter((item) => item.present).length;
    const own = themes.filter((theme) => theme.skin !== undefined).length;
    const inherited = themes.filter(
      (theme) => theme.skin === undefined && theme.skinError === undefined
    ).length;
    console.log(
      `✅ themes:check — ${report.themes.length} tema(s), copy ES/EN, curación, ` +
        `piel y contraste verdes · piel: ${own} propia(s)` +
        `${inherited > 0 ? `, ${inherited} heredada(s)` : ""} · ${goldens} golden(s)`
    );
    return 0;
  }
  const problems =
    report.errors.length +
    report.themes.reduce((total, theme) => total + theme.errors.length, 0);
  console.error(`❌ themes:check FAIL — ${problems} problema(s)`);
  return 1;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) void main().then((code) => process.exit(code));
