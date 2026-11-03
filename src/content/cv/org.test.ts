import { describe, expect, it } from "vitest";
import { orgEs } from "./org";

/**
 * `orgEs` es la ÚNICA localización del `org` del SSOT (página + print-CV).
 * El `org` es un string invariante: sólo se traducen tokens completos, nunca
 * substrings, así los nombres propios que CONTIENEN esos tokens quedan intactos.
 */
describe("orgEs — tokens completos, nombres propios intactos", () => {
  it("los 3 orgs del SSOT se presentan en ES", () => {
    expect(orgEs("Independent — Panama / Ecuador")).toBe("Independiente — Panamá / Ecuador");
    expect(orgEs("CERN — San Miguel Regla, Mexico (scholarship)")).toBe(
      "CERN — San Miguel Regla, México (beca)"
    );
    expect(orgEs("Grupo Angel — Panamá")).toBe("Grupo Angel — Panamá");
  });

  it("nombres propios que contienen los tokens no se traducen (F8)", () => {
    for (const proper of [
      "New Mexico State University",
      "Independent University",
      "Panama Canal Authority"
    ]) {
      expect(orgEs(proper)).toBe(proper);
    }
  });
});
