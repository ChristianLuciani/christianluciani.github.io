# Crear un tema (narrativa + piel) — instructivo para agentes

> Contrato operativo. Un tema nuevo = **un PR** que crea `src/themes/<id>/` y añade
> **una línea** al registro. Si necesitás tocar cualquier otro archivo, el contrato
> falló: pará y reportá (ADR-001, `docs/SPEC.md` §5.4–§5.6).
>
> **Alcance:** `Cubre: crear o modificar un tema del sitio · No cubre: hechos del perfil (profile-data), ilusiones (src/ts/illusions), deploy · as_of: 2026-11-05`

## 1. Definiciones

| Capa | Vive en | Un tema puede |
|---|---|---|
| **Hechos** | `src/data/profile.generated.ts` | sólo **leerlos** (por tipo); nunca mutarlos ni copiarlos |
| **Curación** | `src/content/curation/<id>.ts` | decidir qué se presenta, orden y exclusiones **con razón** |
| **Narrativa** | `src/themes/<id>/narrative.ts` + `copy.ts` | elegir salas, orden, metáforas, labels, ilusiones, metadata |
| **Piel** | `src/themes/<id>/skin.css` | tokens, tipografía, densidad, radios, sombras |

**Regla de oro:** un hecho se edita una vez en el SSOT; un copy una vez en el pack del
tema. Si un valor debe cambiar en dos archivos para seguir coherente, es un bug.

## 2. Estructura obligatoria

```
src/themes/<id>/
├── narrative.ts   # ThemeNarrative: rooms, copy (tipado), illusions, meta
├── copy.ts        # claves semánticas → { es, en } — 100% obligatorio
├── skin.css       # tokens + reglas del tema; cero literales de color fuera de tokens
└── illusions.ts   # roomId → canvas id existente en src/ts/illusions
```

Registro (única línea permitida fuera del directorio):

```ts
// src/themes/index.ts
import { ingenieria } from "./ingenieria/narrative.ts";
export const THEMES = { museo, ingenieria } as const;
export const DEFAULT_THEME = "museo";
```

Selector: `SITE_THEME=<id>` en build. `path` del tema define el subpath
(`""` = raíz; `"ingenieria"` → `/ingenieria/`). Prohibido hardcodear el id en templates,
CSS o JS: todo sale de `THEMES`/`SITE_THEME`.

## 3. Claves semánticas (no strings exactos)

```
hero.tagline
cover.title | cover.hint
room.<roomId>.title | .subtitle | .function
room.<roomId>.<item>.<campo>
nav.<roomId>.label
meta.title | meta.description
```

- Toda clave existe **ES y EN**. Falta una → el build falla (no hay fallback silencioso).
- El mismo `roomId` puede tener copy distinto por tema sin tocar templates.
- Prohibido keyear por texto visible: rompe en cuanto cambia una coma.

## 4. Curación: mostrar sin borrar

```ts
// src/content/curation/ingenieria.ts
export const CURATION: Curation = {
  include: ["kontablo", "zentropy", "clapps"],
  exclude: [{ id: "drahma", reason: "storytelling de aula; fuera del marco de ingeniería" }],
  order: { proyectos: ["kontablo", "zentropy", "clapps"] }
};
```

- `exclude` **nunca** borra: el hecho sigue en el SSOT y en los demás temas.
- Toda exclusión exige `reason` redactada para el operador, no "n/a".
- `curation --report` debe salir sin hechos sin decisión (gate I3).

## 5. Hechos: referencia, jamás copia

```ts
// correcto
const proyectos = PROFILE.projects.filter(p => curation.include.includes(p.id));
// prohibido
const proyectos = [{ name: "Kontablo", status: "Publicado", … }];
```

Si el tema necesita un hecho que no existe en `CvProfile`: **STOP**. Se reporta como
hallazgo; no se inventa ni se escribe a mano (ADR-025: el issue lo decide el operador).

## 6. Ilusiones y piel

- Elegí canvas existentes de `src/ts/illusions/` por sala; **no** se editan.
- La piel sólo declara tokens y reglas: `--bg-0/1`, `--ink*`, `--line*`, `--teal/--gold/…`,
  `--radius`, `--container`, tipografía. Cero `#hex`/`rgba()` fuera del bloque de tokens.
- Todo par texto/fondo declara contraste y **pasa AA** (4,5:1 normal, 3:1 grande).
- Prohibido `!important` para pisar otro tema: si hace falta, falta un token.

## 7. Metadata y SEO del tema

`narrative.meta` provee `title`, `description`, `ogImage`. El build deriva de ahí
`<title>`, `og:*`, `twitter:*`, `canonical` y `og:url` con el origen y el subpath del
tema. Sin esto, dos temas compiten con la misma tarjeta social.

## 8. Procedimiento (orden fijo)

1. Reservá el id: `[a-z0-9-]`, único en `THEMES`, sin colisionar con rutas existentes.
2. Copiá la estructura de `src/themes/museo/` como andamiaje (no como contenido).
3. Escribí `copy.ts` completo (ES+EN) antes de tocar `narrative.ts`.
4. Declará `curation/<id>.ts` con include/exclude/orden y razones.
5. Asigná ilusiones; si ninguna encaja, dejá `undefined` y reportalo (no inventes canvas).
6. Escribí `skin.css` con tokens primero; recién después reglas.
7. Registrá el tema en `src/themes/index.ts` (una línea).
8. Corré los gates y pegá la salida en el body del PR.

```bash
npm run build:all                 # construye todos los temas
npm test                          # unidades + golden por tema
npm run themes:check              # completitud de copy, curación, tokens, contraste
npm run themes:assets             # smoke: toda URL de asset del tema existe en dist/
SITE_THEME=<id> npm run build     # build aislado del tema
```

## 9. Checklist de aceptación (el PR no se abre sin esto)

- [ ] `src/themes/<id>/` completo; **0** cambios fuera de ahí salvo la línea de registro.
- [ ] Copy 100% ES+EN; 0 claves huérfanas; 0 strings visibles en templates.
- [ ] `curation` declara include/exclude; toda exclusión con `reason`.
- [ ] `skin.css` sin literales de color; contraste AA verificado.
- [ ] Ilusiones: sólo ids existentes; ninguna modificación en `src/ts/illusions/**`.
- [ ] `npm run build:all` verde; golden del tema `museo` **intacto**.
- [ ] `npm run themes:check` y `themes:assets` verdes.
- [ ] `meta` propio: title, description, ogImage; canonical por subpath.
- [ ] Body del PR: qué narrativa, para qué audiencia, qué se excluye y por qué.

## 10. Anti-patterns (rechazo directo en review)

- Copiar hechos al tema "porque es más rápido".
- Escribir HTML de layout con copy adentro (el copy va al pack).
- Un `if (theme === "…")` en un template o en `main.ts`.
- Duplicar el CSS del default y cambiar dos colores: se extiende por tokens, no por copia.
- Ocultar contenido sin `reason`, o borrar un ítem del SSOT para que "no aparezca".
- Introducir una dependencia de runtime para el tema (fuentes web, iconos remotos).
