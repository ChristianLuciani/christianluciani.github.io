import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { contactLinks } from "./contacto";
import { copy } from "../copy";
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

  it("el label es SIEMPRE copy del pack, también en las filas con número/identificador", () => {
    expect(platformOf("whatsapp")?.label).toBe(copy("room.contacto.whatsapp").es);
    expect(platformOf("orcid")?.label).toBe("ORCID 0000-0002-6955-5384");
    expect(platformOf("substack")?.label).toBe("Substack");
  });

  it("el `label` del SSOT NO llega a El Buzón: el pack manda aunque difiera (F2 de #161)", () => {
    const fixture: CvProfile = {
      ...profile,
      identity: {
        ...profile.identity,
        links: profile.identity.links.map((link) =>
          link.platform === "linkedin" ? { ...link, label: "ETIQUETA DEL SSOT" } : link
        )
      }
    };
    expect(platformOf("linkedin")?.label).toBe("LinkedIn");
    expect(contactLinks(fixture).find((link) => link.platform === "linkedin")?.label).toBe(
      "LinkedIn"
    );
  });

  it("una plataforma visible sin clave en el pack rompe el render (F1 de #161: sin fallback silencioso)", () => {
    const fixture: CvProfile = {
      ...profile,
      identity: {
        ...profile.identity,
        links: [
          ...profile.identity.links,
          {
            platform: "mastodon",
            label: "@cluciani@mastodon.social",
            url: "https://mastodon.social/@cluciani"
          }
        ]
      }
    };
    // Contra la implementación anterior (fallback al `label` del SSOT) esto NO
    // lanzaba: publicaba «@cluciani@mastodon.social» en silencio.
    expect(() => contactLinks(fixture)).toThrow(/room\.contacto\.mastodon/);
  });
});
