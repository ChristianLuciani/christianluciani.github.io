import { describe, expect, it } from "vitest";
import { sectionsOf } from "../../../tools/golden/sections.ts";
import { clavesDePublicaciones } from "../../data/publicaciones.ts";
import { publicados, enDesarrollo } from "../../data/proyectos.ts";
import { assembleHtml } from "../../templates/index.ts";
import { MUSEO_CURATION } from "./museo.ts";
import { factId } from "./keys.ts";

/**
 * DERIVA CURACIÓN ↔ RENDER (#128).
 *
 * La capa de curación es la fuente declarada de "qué se presenta y en qué
 * orden". Dos superficies todavía NO la consumen (deuda #99):
 *
 *   · La Biblioteca renderiza sus filas desde el template/pack de copy.
 *   · Las tarjetas de proyecto ya consumen `order.proyectos` (vía
 *     `data/proyectos.ts`), pero este gate fija el contrato contra el DOM.
 *
 * Mientras la deuda exista, este test exige que el DOM y la curación coincidan:
 * cambiar una sin la otra deja el suite rojo en vez de publicar dos verdades.
 * Cuando la Biblioteca consuma `publicacionesDe()` (#99), el test sigue valiendo
 * como paridad render ↔ proyección.
 */

const HTML = assembleHtml();
const SECCIONES = sectionsOf(HTML);
const seccion = (nombre: string): string => {
  const found = SECCIONES.find((item) => item.name === nombre);
  if (!found) throw new Error(`falta la sección ${nombre} en el render`);
  return found.html;
};

/** Filas de La Biblioteca, en orden DOM. */
function filasBiblioteca(): { href?: string; esInstitucional: boolean }[] {
  const bloques = seccion("sala-fisica").split('class="pub-item"').slice(1);
  return bloques.map((bloque) => {
    const href = /<a class="pub-doi" href="([^"]+)"/.exec(bloque)?.[1];
    return { ...(href ? { href } : {}), esInstitucional: !href };
  });
}

/** Clave de publicación a partir del href del DOM (DOI o URL). */
function claveDeHref(href: string): string {
  return href.startsWith("https://doi.org/") ? href.slice("https://doi.org/".length) : href;
}

/** Nombres de proyecto de las tarjetas de una sala, en orden DOM. */
function tarjetasDeSala(nombre: string): string[] {
  return [...seccion(nombre).matchAll(/<div class="project-title"><em>([^<]+)<\/em>/g)].map(
    (match) => match[1]
  );
}

describe("render ↔ curación", () => {
  it("La Biblioteca publica las publicaciones incluidas, en el orden curado", () => {
    const filas = filasBiblioteca();
    const conLink = filas.filter((fila) => fila.href).map((fila) => claveDeHref(fila.href!));
    expect(conLink).toEqual(clavesDePublicaciones());
  });

  it("la fila institucional de «guías» no es una publicación: es el proyecto Physics Lab Book", () => {
    const filas = filasBiblioteca();
    // 9 publicaciones del SSOT + 1 fila institucional del proyecto (SPEC §4).
    expect(filas).toHaveLength(clavesDePublicaciones().length + 1);
    expect(filas.filter((fila) => fila.esInstitucional)).toHaveLength(1);
    expect(MUSEO_CURATION.include).toContain(factId("proyectos", "Physics Lab Book"));
  });

  it("El Marco conserva el orden curado y el split derivado de `published`", () => {
    // Drahma se publica, pero su ficha es el showcase dedicado: no es tarjeta.
    const esperadas = publicados.filter((project) => !project.sinTarjeta).map((project) => project.id);
    expect(tarjetasDeSala("sala-proyectos")).toEqual(esperadas);
  });

  it("El Bastidor conserva el orden curado", () => {
    expect(tarjetasDeSala("sala-bastidor")).toEqual(enDesarrollo.map((project) => project.id));
  });
});
