/**
 * Resolución de rutas raíz-absolutas del sitio bajo el base del artefacto
 * (`import.meta.env.BASE_URL`, que Vite fija con `base` — p. ej. "/foo/" con
 * SITE_BASE). En Node plano (tests) BASE_URL no existe y se usa "/".
 */
export function publicUrl(path: string): string {
  if (!path.startsWith("/")) return path;
  const base =
    (typeof import.meta !== "undefined" && (import.meta.env?.BASE_URL as string | undefined)) || "/";
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
