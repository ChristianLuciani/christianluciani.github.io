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
import {
  assertSchemaVersion,
  emptyReport,
  engineProblems,
  MIN_ENGINE_VERSION,
  projectProfile
} from "../../tools/sync-profile";
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

/** `unlisted` tampoco es render público: el fixture lo ejercita aparte para que
 *  una regresión `visibility !== "private"` no pase verde. Los URLs son opacos
 *  (no llevan los marcadores canónicos): el filtro debe morder por target. */
const UNLISTED_MARKERS = [
  "unlisted-artifact",
  "https://example.test/anon/artifact-42",
  "unlisted-credential",
  "https://example.test/anon/credential-42"
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
    // Identidad REAL del engine (v0.4.0): no un literal inventado por el fixture.
    expect(RAW.engine.name).toBe("@profile-as-code/cli");
    expect(RAW.engine.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(RAW.source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(RAW.source.commitDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(RAW.profile).toBeTypeOf("object");
  });

  it("el engine del fixture satisface el contrato (nombre aceptado + versión >= mínimo)", () => {
    expect(engineProblems(RAW.engine)).toEqual([]);
    const [major, minor, patch] = RAW.engine.version.split(".").map(Number);
    const [minMajor, minMinor, minPatch] = MIN_ENGINE_VERSION.split(".").map(Number);
    expect(major * 1e6 + minor * 1e3 + patch).toBeGreaterThanOrEqual(
      minMajor * 1e6 + minMinor * 1e3 + minPatch
    );
  });

  it("un engine con nombre inventado o versión vieja es un problema reportado", () => {
    const wrongName = { name: "profile-as-code", version: RAW.engine.version };
    expect(engineProblems(wrongName).some((p) => p.includes("engine.name"))).toBe(true);

    const old = { name: RAW.engine.name, version: "0.3.6" };
    expect(engineProblems(old).some((p) => p.includes("mínimo"))).toBe(true);

    const clone = JSON.parse(JSON.stringify(RAW)) as FixtureEnvelope;
    clone.engine.name = "profile-as-code";
    expect(checkFixture(clone).problems.some((p) => p.includes("engine.name"))).toBe(true);
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

  it("publica sólo el artifact público (locator del privado y del unlisted fuera)", () => {
    const p = project();
    expect(p.artifacts.map((a) => a.id)).toEqual(["art-public"]);
    expect(p.artifacts[0].locator).toEqual({ url: "https://example.test/public/artifact" });
  });

  it("publica sólo la credential pública (verifyUrl de la privada y la unlisted fuera)", () => {
    const p = project();
    expect(p.credentials.map((c) => c.id)).toEqual(["cred-public"]);
    expect(p.credentials[0].verifyUrl).toBe("https://example.test/public/credential");
  });

  it("descarta referencias a locators/verifyUrls no públicos desde projects[]", () => {
    const p = project();
    const publicado = p.projects.find((x) => x.name === "Public Fixture Project")!;
    expect(publicado.links).toEqual(["https://example.test/public/repo"]);
    expect(publicado.evidence.map((e) => e.source)).toEqual(["https://example.test/public/evidence"]);
  });

  it("descarta una referencia opaca unlisted desde identity.links (filtro por target)", () => {
    const p = project();
    expect(p.identity.links.map((link) => link.url)).toEqual(["https://example.test/ada"]);
  });

  it("el snapshot proyectado no contiene NINGÚN marcador private ni unlisted", () => {
    const rendered = JSON.stringify(project());
    for (const marker of [...PRIVATE_MARKERS, ...UNLISTED_MARKERS]) {
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

  it("si `unlisted` se tratara como público, la referencia opaca se reporta", () => {
    const leaky = JSON.parse(JSON.stringify(RAW)) as FixtureEnvelope;
    const unlisted = (leaky.profile.artifacts as Record<string, unknown>[]).find(
      (a) => a.id === "unlisted-artifact"
    )!;
    unlisted.visibility = "public";
    const { problems } = checkFixture(leaky);
    // El URL opaco deja de ser target privado y sobrevive en identity.links:
    // el chequeo tiene que nombrar la raíz, no depender de un marcador canónico.
    expect(problems.some((p) => p.includes("identity.links"))).toBe(true);
    expect(problems.some((p) => p.includes("https://example.test/anon/artifact-42"))).toBe(true);
  });
});
