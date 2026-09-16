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
    sourcemap: true,
  },
});
