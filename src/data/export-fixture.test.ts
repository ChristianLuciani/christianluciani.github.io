/**
 * Fixture export (`export-profile.json`) — el pipeline sin el repo privado.
 *
 * Un payload anonimizado con la forma del engine (`pasco export profile`) que
 * permite probar en CI la proyección/filtros que antes sólo se ejercitaban con
 * el workspace real (skipIf sin PROFILE_DATA_PATH). Prueba el criterio del
 * issue #110: credenciales/artefactos privados NO entran al snapshot, tampoco
 * como REFERENCIAS desde `projects[]`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkFixture, renderFixture, type FixtureEnvelope } from "../../tools/sync-check";
import { assertSchemaVersion, emptyReport, projectProfile } from "../../tools/sync-profile";
import type { CvProfile, CvSource } from "./profile.types";

const RAW = JSON.parse(
  readFileSync(resolve(process.cwd(), "src", "data", "fixtures", "export-profile.json"), "utf8")
) as FixtureEnvelope;

const PRIVATE_MARKERS = [
  "private-artifact",
  "https://example.test/private/artifact",
  "private-credential",
  "https://example.test/private/credential"
];

function sourceOf(fixture: FixtureEnvelope): CvSource {
  return {
    repo: fixture.source.repo ?? "",
    commit: fixture.source.commit,
    commitDate: fixture.source.commitDate ?? null,
    generatedAt: null
  };
}

function project(): CvProfile {
  return projectProfile(RAW.profile, sourceOf(RAW), emptyReport());
}

describe("fixture export — contrato y forma", () => {
  it("trae el envelope del engine: schemaVersion, engine, source, profile", () => {
    expect(RAW.schemaVersion).toBe("1");
    expect(RAW.engine.name).toBe("profile-as-code");
    expect(RAW.engine.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(RAW.source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(RAW.source.commitDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(RAW.profile).toBeTypeOf("object");
  });

  it("schemaVersion desconocida FAIL (nunca se adivina otra generación)", () => {
    expect(() => assertSchemaVersion(RAW.schemaVersion)).not.toThrow();
    expect(() => assertSchemaVersion("2")).toThrow(/desconocida/);
  });
});

describe("fixture export — proyección pública", () => {
  it("proyecta los roots que el CV usa con los conteos del fixture", () => {
    const p = project();
    expect(p.identity.name).toBe("Ada Lovelace");
    expect(p.experience).toHaveLength(2);
    expect(p.education).toHaveLength(1);
    expect(p.languages).toHaveLength(2);
    expect(p.projects).toHaveLength(2);
    expect(p.publications).toHaveLength(1);
    expect(p.skills).toHaveLength(2);
    expect(p.credentials).toHaveLength(1);
    expect(p.artifacts).toHaveLength(1);
  });

  it("publica sólo el artifact público (locator del privado fuera)", () => {
    const p = project();
    expect(p.artifacts.map((a) => a.id)).toEqual(["art-public"]);
    expect(p.artifacts[0].locator).toEqual({ url: "https://example.test/public/artifact" });
  });

  it("publica sólo la credential pública (verifyUrl de la privada fuera)", () => {
    const p = project();
    expect(p.credentials.map((c) => c.id)).toEqual(["cred-public"]);
    expect(p.credentials[0].verifyUrl).toBe("https://example.test/public/credential");
  });

  it("descarta referencias a locators/verifyUrls privados desde projects[]", () => {
    const p = project();
    const publicado = p.projects.find((x) => x.name === "Public Fixture Project")!;
    expect(publicado.links).toEqual(["https://example.test/public/repo"]);
    expect(publicado.evidence.map((e) => e.source)).toEqual(["https://example.test/public/evidence"]);
  });

  it("el snapshot proyectado no contiene NINGÚN marcador privado", () => {
    const rendered = JSON.stringify(project());
    for (const marker of PRIVATE_MARKERS) {
      expect(rendered).not.toContain(marker);
    }
  });

  it("nada de roots/fields que el CV no usa viaja al snapshot", () => {
    const p = project();
    for (const key of ["bios", "faq", "active", "email", "handle", "timezone"]) {
      expect(p).not.toHaveProperty(key);
    }
    expect(p.identity).not.toHaveProperty("email");
    expect(p.identity).not.toHaveProperty("handle");
    expect(p.identity).not.toHaveProperty("timezone");
  });

  it("es determinista: mismo fixture → mismo render byte a byte", () => {
    expect(renderFixture(RAW).source).toBe(renderFixture(RAW).source);
  });
});

describe("fixture export — chequeo de sync:check", () => {
  it("pasa sus invariantes sin workspace", () => {
    const { problems, profile } = checkFixture(RAW);
    expect(problems).toEqual([]);
    expect(profile.credentials).toHaveLength(1);
    expect(profile.artifacts).toHaveLength(1);
  });

  it("un fixture que deja pasar un privado es un problema reportado", () => {
    const leaky = JSON.parse(JSON.stringify(RAW)) as FixtureEnvelope;
    (leaky.profile.artifacts as Record<string, unknown>[]).push({
      id: "private-artifact",
      kind: "repository",
      title: "Leak",
      locator: { url: "https://example.test/private/artifact" }
    });
    // El filtro lo descarta: el fixture sigue pasando. El chequeo detecta la
    // fuga sólo si el filtro se rompe; forzamos el caso quitando la marca.
    (leaky.profile.artifacts as Record<string, unknown>[])[2].visibility = "public";
    const { problems } = checkFixture(leaky);
    expect(problems.some((p) => p.includes("private-artifact"))).toBe(true);
  });
});
