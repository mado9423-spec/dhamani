import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  // Prevent Vite from searching parent directories and picking up the
  // sibling "dhamani" app's postcss/tailwind config (this project has
  // none of its own).
  css: {
    postcss: {},
  },
  server: {
    host: true,
  },
  build: {
    outDir: "dist",
    // No source maps in the shipped build — they were adding ~10MB to
    // the deploy for no runtime benefit to players.
    sourcemap: false,
    rollupOptions: {
      output: {
        // Phaser itself is the overwhelming majority of the bundle
        // (46 small app files vs. one large, rarely-changing engine).
        // Splitting it into its own chunk means a redeploy after an
        // app-code change doesn't force every returning player to
        // re-download Phaser too — the vendor chunk stays cached.
        // A single combined chunk was evaluated and rejected for
        // exactly that reason: this project is small, but the cache
        // win is essentially free and costs nothing at this size.
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
});
