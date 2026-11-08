/**
 * ÓRDENES DE CONTACTO — un contrato, dos superficies.
 *
 * Cada lista declara DOS cosas a la vez: qué plataformas se muestran y en qué
 * orden (`#163`). No declara URLs ni labels: el `href` sale de
 * `PROFILE.identity.links` y el label del pack del tema
 * (`room.contacto.<plataforma>`, accesor estricto).
 *
 * Una plataforma que NO está en la lista no se muestra aunque exista en el
 * SSOT: la membresía es una decisión editorial (documentada en
 * `docs/CREAR-TEMA.md` §5), no una consecuencia automática de re-sincronizar el
 * perfil. Agregar una plataforma visible = entrada acá + clave de copy + icono:
 * el gate de `contacto.test.ts` falla nombrando la plataforma si falta la
 * entrada, y el build de publicación falla con la clave o el archivo exacto si
 * falta el copy o el icono.
 *
 * El silencio no es una opción: `OMITTED_CONTACT_PLATFORMS` declara la razón de
 * cada plataforma del SSOT que NO se publica, y el gate de `contacto.test.ts`
 * falla nombrando cualquier plataforma del snapshot que no esté ni acá ni ahí.
 * Así una plataforma nueva de profile-data obliga a una decisión (mostrarla o
 * justificar la omisión) en vez de desaparecer sin que nadie lo note.
 *
 * Una plataforma DECLARADA pero sin fila en el SSOT no se inventa: la fila
 * desaparece hasta que el dato exista. Ojo: si la clave de copy ya se declaró,
 * queda HUÉRFANA y `themes:check` la rechaza; se da de alta cuando el dato
 * exista, o se marca `runtime: true` mientras tanto (CREAR-TEMA §5).
 *
 *   · `PRINT_CONTACT_PLATFORMS` — encabezado del print-CV: 4 filas, sin redes
 *     (el PDF no imprime chrome web).
 *   · `BUZON_CONTACT_PLATFORMS` — sala Contacto (El Buzón): la lista pública
 *     completa, en el orden en que aparece en el sitio. `website` queda afuera
 *     por diseño: es este mismo sitio.
 */
export const PRINT_CONTACT_PLATFORMS: readonly string[] = [
  "website",
  "whatsapp",
  "orcid",
  "github"
];

export const BUZON_CONTACT_PLATFORMS: readonly string[] = [
  "whatsapp",
  "orcid",
  "scholar",
  "github",
  "linkedin",
  "researchgate",
  "x",
  "instagram",
  "patreon",
  "substack"
];

/**
 * Plataformas del SSOT que NO se publican en El Buzón, con su razón. No es una
 * lista de descarte: es la decisión explícita que el gate exige por cada
 * plataforma del snapshot. Una plataforma nueva se declara en
 * `BUZON_CONTACT_PLATFORMS` o acá; si no está en ninguna, el test falla con su
 * nombre.
 */
export const OMITTED_CONTACT_PLATFORMS: Readonly<Record<string, string>> = {
  website: "es este mismo sitio: un link al sitio dentro del sitio"
};
