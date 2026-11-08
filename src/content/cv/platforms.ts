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
 * perfil. Es el precio declarado de un orden estable: agregar una plataforma
 * visible = entrada acá + clave de copy + icono, y el build falla con el nombre
 * exacto si falta cualquiera de las tres.
 *
 * Una plataforma DECLARADA pero sin fila en el SSOT no se inventa: la fila
 * desaparece hasta que el dato exista.
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
