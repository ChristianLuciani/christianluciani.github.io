import { describe, expect, it } from "vitest";
import { SALAS } from "../../cv/salas.ts";
import { assembleHtml } from "../../templates/index.ts";
import { MUSEO_COPY } from "./copy.ts";
import { MUSEO_ILLUSIONS } from "./illusions.ts";
import { museo } from "./narrative.ts";

/**
 * NARRATIVA DEL TEMA `museo` (SPEC §5.4 · ADR-001).
 *
 * El manifest es DATOS: salas (orden y metáfora), pack de copy, ilusiones y
 * metadata. Este test fija que el tema default DERIVA de las fuentes vigentes
 * (`SALAS` + pack) en vez de duplicarlas: si aparece una segunda copia que
 * pueda quedar stale, el test la delata.
 */

describe("themes/museo — manifest", () => {
  it("declara su id y publica en la raíz", () => {
    expect(museo.id).toBe("museo");
    expect(museo.path).toBe("");
  });

  it("sus salas SON las de SALAS: mismo orden, misma data (sin copia)", () => {
    expect(museo.rooms).toEqual(SALAS);
    for (let i = 0; i < SALAS.length; i++) {
      expect(museo.rooms[i]).toBe(SALAS[i]);
    }
  });

  it("su copy ES el pack del tema museo (una sola fuente)", () => {
    expect(museo.copy).toBe(MUSEO_COPY);
  });
});

describe("themes/museo — ilusiones", () => {
  /** Bloque renderizado de la sala: `id="room-<id>"` hasta su `</section>`. */
  function sectionOf(html: string, roomId: string): string {
    const start = html.indexOf(`id="room-${roomId}"`);
    expect(start, `sala ${roomId} en el render`).toBeGreaterThan(-1);
    return html.slice(start, html.indexOf("</section>", start));
  }

  it("declara exactamente un canvas por sala, igual a la asignación de SALAS", () => {
    // Igualdad contra la fuente que hoy declara la asignación (SALAS.ilusion).
    // Si el mapa y la estructura divergen, este test falla por sala.
    const expected = Object.fromEntries(
      SALAS.filter((s) => s.ilusion).map((s) => [s.id, s.ilusion!])
    );
    expect(MUSEO_ILLUSIONS).toEqual(expected);
    for (const [roomId, canvasId] of Object.entries(expected)) {
      expect(museo.illusions[roomId], `sala ${roomId}`).toBe(canvasId);
    }
  });

  /**
   * BINDING REAL POR SALA — el mapa es metadata hasta S8/S9, pero el canvas que
   * el documento monta vive en `ROOM_SHELL`/`ROOM_BODY` (`sala_html.ts`). El
   * test no se conforma con "el id existe en algún lado": exige que el canvas
   * declarado esté DENTRO del `<section>` de SU sala. Si `SALAS.ilusion` de
   * `perfil` pasara a `c-proyectos` (id vivo en otra sala), esto falla.
   */
  it("el canvas declarado es el que monta esa sala, y sólo esa sala", () => {
    const html = assembleHtml();
    const sections = new Map(
      museo.rooms.map((room) => [room.id, sectionOf(html, room.id)] as const)
    );
    for (const [roomId, canvasId] of Object.entries(museo.illusions)) {
      expect(sections.get(roomId), `sala ${roomId} debe montar ${canvasId}`).toContain(
        `id="${canvasId}"`
      );
      const montan = [...sections.entries()].filter(([, block]) =>
        block.includes(`id="${canvasId}"`)
      );
      expect(montan.map(([id]) => id), `canvas ${canvasId} en una sola sala`).toEqual([roomId]);
    }
  });

  it("ninguna sala oculta o sin ilusión monta un canvas de otra sala", () => {
    const html = assembleHtml();
    const declaradas = new Set(Object.keys(museo.illusions));
    for (const room of museo.rooms.filter((r) => !declaradas.has(r.id))) {
      const block = sectionOf(html, room.id);
      for (const canvasId of Object.values(museo.illusions)) {
        expect(block, `sala ${room.id} no debe montar ${canvasId} (es de otra sala)`).not.toContain(
          `id="${canvasId}"`
        );
      }
    }
  });
});

describe("themes/museo — metadata", () => {
  it("title/description salen del pack: no hay texto duplicado", () => {
    expect(museo.meta.title).toBe(MUSEO_COPY["meta.title"]!.es);
    expect(museo.meta.description).toBe(MUSEO_COPY["meta.description"]!.es);
    expect(museo.meta.ogImage).toBe("/assets/og-image.png");
  });

  it("declara su dirección de publicación (el deploy la overridea)", () => {
    expect(museo.site).toEqual({ origin: "https://christianluciani.github.io", base: "" });
    expect(museo.path).toBe("");
  });

  it("la metadata del manifest es la que hoy publica el head (paridad de fuente)", () => {
    const html = assembleHtml();
    expect(html).toContain(`<title>${museo.meta.title}</title>`);
    expect(html).toContain(`content="${museo.meta.description}"`);
    expect(html).toContain(`content="https://christianluciani.github.io${museo.meta.ogImage}"`);
  });
});
