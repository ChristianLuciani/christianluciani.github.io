import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * NADA QUE ENVEJEZCA EN PROSA (#190): el pin del brand kit vive únicamente en
 * `brand-kit.lock.json`. Los docs evergreen lo CITAN, no lo repiten — si alguien
 * vuelve a escribir el tag vigente en README o prosa, este test falla y avisa
 * en el próximo bump en vez de dejar un `vX.Y.Z` muerto repartido por los docs.
 *
 * Quedan fuera a propósito los docs con notas FECHADAS (docs/CDN_MIGRATION.md,
 * docs/cdn-decision.md): son historial append-only, no prosa evergreen.
 */
const ROOT = resolve(process.cwd());
const lock = JSON.parse(readFileSync(resolve(ROOT, "brand-kit.lock.json"), "utf8")) as {
  source: string;
  tag: string;
  cdnBase: string;
};

const EVERGREEN = [
  "README.md",
  ".env.example",
  "assets/brand/logo/README.md",
  "docs/brand/logo.md"
] as const;

describe("brand-kit.lock.json — única fuente del pin en prosa evergreen", () => {
  it("el lock declara source, tag inmutable y cdnBase coherente", () => {
    expect(lock.tag).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(lock.cdnBase).toBe(`https://cdn.jsdelivr.net/gh/${lock.source}@${lock.tag}`);
  });

  it("los docs evergreen no repiten el tag vigente ni una URL @tag", () => {
    for (const rel of EVERGREEN) {
      const text = readFileSync(resolve(ROOT, rel), "utf8");
      expect(text.includes(lock.tag), `${rel} repite el tag ${lock.tag}: citar brand-kit.lock.json`).toBe(false);
      expect(text.includes(`@${lock.tag}`), `${rel} contiene una URL @${lock.tag}`).toBe(false);
    }
  });

  it("los docs evergreen sí citan brand-kit.lock.json como fuente del pin", () => {
    for (const rel of EVERGREEN) {
      const text = readFileSync(resolve(ROOT, rel), "utf8");
      expect(text.includes("brand-kit.lock.json"), `${rel} debe citar brand-kit.lock.json`).toBe(true);
    }
  });

  it("muerde: un tag hardcodeado en prosa evergreen falla", () => {
    const sembrada = readFileSync(resolve(ROOT, "README.md"), "utf8") + `\n(tag \`${lock.tag}\`)\n`;
    expect(sembrada.includes(lock.tag)).toBe(true);
  });
});
