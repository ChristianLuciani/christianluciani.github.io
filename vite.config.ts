import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  build: {
    sourcemap: true
  },
  test: {
    globals: true,
    // Tests cover pure functions only (no DOM/canvas), so the lighter
    // node environment is sufficient and avoids the jsdom ESM load failure.
    environment: "node"
  }
});
