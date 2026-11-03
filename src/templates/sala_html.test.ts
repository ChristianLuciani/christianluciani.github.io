import { describe, expect, it } from "vitest";
import { primerArtefacto } from "./sala_html";

describe("primerArtefacto — el hit de tarjeta completa", () => {
  it("toma el primer enlace y conserva target=_blank", () => {
    const html = '<div><a class="pub-doi" href="https://x.test/repo" target="_blank">↗ Repositorio</a></div>';
    expect(primerArtefacto(html)).toEqual({ href: "https://x.test/repo", blank: true });
  });

  it("sin enlace no hay hit: la ficha no finge un click", () => {
    expect(primerArtefacto(undefined)).toBeNull();
    expect(primerArtefacto('<div class="project-note">Sin artefacto</div>')).toBeNull();
  });
});
