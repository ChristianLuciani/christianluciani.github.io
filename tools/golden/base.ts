/**
 * GOLDEN — disponibilidad de la base del PR.
 *
 * El gate compara contra el `BASE_SHA` que le pasa el workflow, pero ese commit
 * no tiene por qué estar en un clon cualquiera. Traerlo vive en un solo lugar
 * por una razón medida (#167): la guarda corría `git fetch --depth=1 origin
 * <base>` SIEMPRE, así que correr un gate del propio repo convertía un clon
 * completo en un clon shallow, truncaba `git log` y rompía el pre-gate de
 * trabajo (que exige historial completo antes de abrir un PR). Un gate no
 * muta el clon que lo corre.
 */
import { spawnSync } from "node:child_process";

/** ¿El commit existe ya en el clon? */
export function hasCommit(base: string, cwd = process.cwd()): boolean {
  const r = spawnSync("git", ["cat-file", "-e", `${base}^{commit}`], { cwd, stdio: "ignore" });
  return r.status === 0;
}

/**
 * Deja `base` disponible en `cwd`, sin degradar el clon. Idempotente: si el
 * commit ya está, no toca la red.
 *
 * El fetch va **sin `--depth`**: `--depth=1` es la forma de convertir un clon
 * completo en shallow, y no hace falta para obtener un commit. Si la base no
 * es alcanzable, falla con la instrucción en vez de degradar el clon.
 */
export function ensureBase(base: string, cwd = process.cwd()): void {
  if (hasCommit(base, cwd)) return;

  const fetch = spawnSync("git", ["fetch", "origin", base], { cwd, encoding: "utf8" });
  if (fetch.status !== 0 || !hasCommit(base, cwd)) {
    const detail = (fetch.stderr ?? "").trim();
    throw new Error(
      `no se pudo traer la base ${base} desde origin` +
        (detail ? ` (${detail})` : "") +
        "; el commit no es alcanzable — usá un clon completo y un sha alcanzable, nunca `git fetch --depth=1`" +
        " (degrada el clon: --is-shallow pasa a true)"
    );
  }
}
