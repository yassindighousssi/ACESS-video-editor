import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  root: process.cwd(),
  build: {
    outDir: "dist-renderer",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: resolve(process.cwd(), "index.html"),
    },
  },
  resolve: {
    alias: {
      crypto: resolve(process.cwd(), "src/electron/browser-crypto.ts"),
    },
  },
});
