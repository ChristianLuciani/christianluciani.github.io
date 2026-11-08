import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { contactIcon, contactLabel, contactLinks } from "./contacto";
import { BUZON_CONTACT_PLATFORMS, OMITTED_CONTACT_PLATFORMS } from "./platforms";
import { PROFILE } from "../../data/profile.generated";
import type { CvProfile } from "../../data/profile.types";

const profile = PROFILE as unknown as CvProfile;
const LINKS = contactLinks(profile);

const platformOf = (platform: string) => LINKS.find((link) => link.platform === platform);

/** Perfil con otra tabla de links, para probar los bordes sin editar el snapshot. */
const withLinks = (links: CvProfile["identity"]["links"]): CvProfile => ({
  ...profile,
  identity: { ...profile.identity, links }
});

describe("El Buzón — filas desde platforms.ts + identity.links (#163)", () => {
  it("membresía: la lista declarada filtrada por el SSOT", () => {
    const expected = BUZON_CONTACT_PLATFORMS.filter((platform) =>
      profile.identity.links.some((link) => link.platform === platform)
    );
    expect([...LINKS.map((link) => link.platform)].sort()).toEqual([...expected].sort());
  });

  it("orden: el declarado, NO el del SSOT (fixture con identity.links invertido)", () => {
    // Con el snapshot real el orden coincide por casualidad; invertido, un
    // renderer que iterara `identity.links` publicaría al revés y este test cae.
    const reversed = withLinks([...profile.identity.links].reverse());
    const expected = BUZON_CONTACT_PLATFORMS.filter((platform) =>
      reversed.identity.links.some((link) => link.platform === platform)
    );
    expect(contactLinks(reversed).map((link) => link.platform)).toEqual(expected);
  });

  it("toda plataforma del snapshot tiene decisión: declarada o justificada (F1 de #163)", () => {
    const shown = new Set(BUZON_CONTACT_PLATFORMS);
    const omitted = new Set(Object.keys(OMITTED_CONTACT_PLATFORMS));
    const undecided = [...new Set(profile.identity.links.map((link) => link.platform))].filter(
      (platform) => !shown.has(platform) && !omitted.has(platform)
    );
    // Una plataforma nueva en profile-data rompe acá con su nombre: se declara
    // en BUZON_CONTACT_PLATFORMS o se justifica en OMITTED_CONTACT_PLATFORMS.
    expect(undecided).toEqual([]);
    for (const [platform, reason] of Object.entries(OMITTED_CONTACT_PLATFORMS)) {
      expect(reason.trim(), `${platform} sin razón declarada`).not.toBe("");
    }
  });

  it("cada fila toma el href del SSOT: la PRIMERA coincidencia (la cuenta de GitHub)", () => {
    for (const link of LINKS) {
      const row = profile.identity.links.find((candidate) => candidate.platform === link.platform);
      expect(link.url).toBe(row?.url);
    }
    expect(platformOf("github")?.url).toBe("https://github.com/ChristianLuciani");
  });

  it("una plataforma del SSOT fuera del orden declarado NO se muestra (decisión, no olvido)", () => {
    const fixture = withLinks([
      ...profile.identity.links,
      {
        platform: "mastodon",
        label: "@cluciani@mastodon.social",
        url: "https://mastodon.social/@cluciani"
      }
    ]);
    expect(contactLinks(fixture).map((link) => link.platform)).not.toContain("mastodon");
  });

  it("una plataforma declarada sin fila en el SSOT no inventa la fila", () => {
    const fixture = withLinks(profile.identity.links.filter((link) => link.platform !== "substack"));
    expect(contactLinks(fixture).map((link) => link.platform)).not.toContain("substack");
  });

  it("Substack entra desde el SSOT (#33 → #157): fila, href e icono", () => {
    expect(platformOf("substack")?.url).toBe("https://cluciani.substack.com");
    expect(platformOf("substack")?.icon).toBe("substack");
  });

  it("todo icono declarado existe en assets/icons (sin archivo, el build no publica)", () => {
    for (const platform of BUZON_CONTACT_PLATFORMS) {
      const icon = contactIcon(platform);
      const file = resolve(process.cwd(), "assets", "icons", `${icon}.svg`);
      expect(existsSync(file), `falta assets/icons/${icon}.svg (${platform})`).toBe(true);
    }
  });

  it("el icono resuelve el alias declarado (scholar → googlescholar)", () => {
    expect(contactIcon("scholar")).toBe("googlescholar");
    expect(contactIcon("substack")).toBe("substack");
  });

  it("el label es SIEMPRE copy del pack; una clave faltante falla con su nombre (F1 de #161)", () => {
    expect(contactLabel("whatsapp")).toBe("WhatsApp (+593) 99 371 6335");
    expect(contactLabel("orcid")).toBe("ORCID 0000-0002-6955-5384");
    expect(contactLabel("substack")).toBe("Substack");
    // Accesor estricto: no hay fallback al `label` del SSOT ni texto adivinado.
    expect(() => contactLabel("mastodon")).toThrow(/room\.contacto\.mastodon/);
  });

  it("el `label` del SSOT no llega a El Buzón (F2 de #161)", () => {
    const fixture = withLinks(
      profile.identity.links.map((link) =>
        link.platform === "linkedin" ? { ...link, label: "ETIQUETA DEL SSOT" } : link
      )
    );
    expect(contactLinks(fixture).find((link) => link.platform === "linkedin")?.label).toBe(
      "LinkedIn"
    );
  });
});
