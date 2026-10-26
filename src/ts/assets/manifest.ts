/**
 * Logical asset keys → **ruta servida** (la que publica Pages y la que usa la
 * CDN tal cual, ver `cdnRepoPath` en ./url.ts).
 *
 * El hogar canónico de estos archivos es `public/assets/` (Vite publica
 * `public/` en la raíz); no hay copia en `assets/` (dedupe de #84).
 */
export const ASSET_MANIFEST = {
  papers: {
    kontablo2026: "/assets/images/papers/kontablo2026_thumb.jpg",
    trujillo2025: "/assets/images/papers/trujillo2025_thumb.svg",
    landazuri2025: "/assets/images/papers/landazuri2025_thumb.svg",
    zambrano2023: "/assets/images/papers/zambrano2023_thumb.jpg",
    landazuri2023: "/assets/images/papers/landazuri2023_thumb.svg",
    zambrano2022: "/assets/images/papers/zambrano2022_thumb.svg",
    aiche2022: "/assets/images/papers/aiche2022_thumb.svg",
    usfq2019: "/assets/images/papers/usfq2019_thumb.svg",
    cabrera2006: "/assets/images/papers/cabrera2006_thumb.jpg",
    hosaka2006: "/assets/images/papers/hosaka2006_thumb.jpg"
  }
} as const;

export type PaperKey = keyof typeof ASSET_MANIFEST.papers;

