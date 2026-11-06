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
  it("asigna un canvas a cada sala que declara ilusión en SALAS", () => {
    const expected = Object.fromEntries(
      SALAS.filter((s) => s.ilusion).map((s) => [s.id, s.ilusion!])
    );
    expect(MUSEO_ILLUSIONS).toEqual(expected);
    expect(Object.keys(museo.illusions).sort()).toEqual(Object.keys(expected).sort());
  });

  it("cada canvas asignado existe en el documento renderizado", () => {
    const html = assembleHtml();
    for (const [roomId, canvasId] of Object.entries(museo.illusions)) {
      expect(html, `sala ${roomId} → canvas ${canvasId}`).toContain(`id="${canvasId}"`);
    }
  });

  it("ninguna sala oculta (sin DOM) recibe ilusión", () => {
    for (const room of museo.rooms.filter((r) => r.hidden)) {
      expect(museo.illusions, `sala oculta ${room.id}`).not.toHaveProperty(room.id);
    }
  });
});

describe("themes/museo — metadata", () => {
  it("title/description salen del pack: no hay texto duplicado", () => {
    expect(museo.meta.title).toBe(MUSEO_COPY["meta.title"]!.es);
    expect(museo.meta.description).toBe(MUSEO_COPY["meta.description"]!.es);
    expect(museo.meta.ogImage).toBe("/assets/og-image.png");
  });

  it("la metadata del manifest es la que hoy publica el head (paridad de fuente)", () => {
    const html = assembleHtml();
    expect(html).toContain(`<title>${museo.meta.title}</title>`);
    expect(html).toContain(`content="${museo.meta.description}"`);
    expect(html).toContain(`content="https://christianluciani.github.io${museo.meta.ogImage}"`);
  });
});
