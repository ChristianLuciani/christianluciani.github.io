import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { contactLinks } from "./contacto";
import { PROFILE } from "../../data/profile.generated";
import type { CvProfile } from "../../data/profile.types";

const profile = PROFILE as unknown as CvProfile;
const LINKS = contactLinks(profile);

const platformOf = (platform: string) => LINKS.find((link) => link.platform === platform);

describe("El Buzón — links derivados de identity.links", () => {
  it("cada fila es una fila del SSOT: href y orden salen de ahí, no del template", () => {
    const expected = profile.identity.links
      .filter((link) => link.platform !== "website")
      .map((link) => link.platform)
      .filter((platform, index, all) => all.indexOf(platform) === index);
    expect(LINKS.map((link) => link.platform)).toEqual(expected);
    for (const link of LINKS) {
      expect(profile.identity.links.some((row) => row.url === link.url)).toBe(true);
    }
  });

  it("Substack entra solo desde el SSOT (#33 → #157): el template no lo declara", () => {
    const substack = platformOf("substack");
    expect(substack).toBeDefined();
    expect(substack?.url).toBe("https://cluciani.substack.com");
    expect(substack?.icon).toBe("substack");
  });

  it("una plataforma repetida se muestra una vez: la cuenta de GitHub, no sus repos", () => {
    const github = LINKS.filter((link) => link.platform === "github");
    expect(github).toHaveLength(1);
    expect(github[0].url).toBe("https://github.com/ChristianLuciani");
  });

  it("todo icono derivado existe en assets/icons (una plataforma nueva sin icono no publica)", () => {
    for (const link of LINKS) {
      const file = resolve(process.cwd(), "assets", "icons", `${link.icon}.svg`);
      expect(existsSync(file), `falta ${link.icon}.svg`).toBe(true);
    }
  });

  it("el label del pack del tema gana; el `label` del SSOT es el fallback", () => {
    // WhatsApp y ORCID muestran número/identificador que sólo vive en el pack.
    expect(platformOf("whatsapp")?.label).toBe("WhatsApp (+593) 99 371 6335");
    expect(platformOf("orcid")?.label).toBe("ORCID 0000-0002-6955-5384");
    // Substack no tiene clave en el pack: cae al label del SSOT, no a un literal.
    expect(platformOf("substack")?.label).toBe("Substack");
  });
});
