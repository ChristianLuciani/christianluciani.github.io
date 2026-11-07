import { describe, expect, it } from "vitest";
import { AUDIO_TRACKS, LAB_ASSET, runtimeAsset, runtimeBase } from "./runtime-assets.ts";

/**
 * RECURSOS DEL RUNTIME (SPEC §8 FASE 5.5 · F1 del pase fresco de #153).
 *
 * El audio y el laboratorio los pide JS, no el HTML: su URL tiene que llevar la
 * base del artefacto o bajo `SITE_BASE` dan 404 aunque el smoke de HTML esté
 * verde. `runtimeAsset` es la única composición de esas URLs.
 */

describe("runtime-assets — base del artefacto", () => {
  it("sin Vite (tests/smoke) la base es la raíz", () => {
    expect(runtimeBase()).toBe("/");
    expect(runtimeAsset("audio/x.mp3")).toBe("/audio/x.mp3");
  });

  it("con prefijo de deploy, la URL sale bajo la base", () => {
    expect(runtimeAsset("audio/x.mp3", "/repo/")).toBe("/repo/audio/x.mp3");
    expect(runtimeAsset("audio/x.mp3", "/repo")).toBe("/repo/audio/x.mp3");
    expect(runtimeAsset("/audio/x.mp3", "/repo/")).toBe("/repo/audio/x.mp3");
  });

  it("expone las pistas del audio y el laboratorio como rutas relativas", () => {
    const tracks = Object.values(AUDIO_TRACKS);
    expect(tracks.length).toBeGreaterThan(0);
    expect(new Set(tracks).size).toBe(tracks.length);
    for (const track of tracks) {
      expect(track).toMatch(/^audio\/[a-z0-9-]+\.mp3$/);
      expect(runtimeAsset(track, "/repo/")).toBe(`/repo/${track}`);
    }
    expect(LAB_ASSET).toBe("laboratorio/");
  });
});
