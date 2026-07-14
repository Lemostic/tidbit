import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  root: "src",
  publicDir: "../public",
  plugins: [
    react(),
    {
      name: "copy-localization-resources",
      closeBundle() {
        const destination = resolve(process.cwd(), "dist/resources");
        mkdirSync(destination, { recursive: true });
        cpSync(resolve(process.cwd(), "resources"), destination, { recursive: true });
      },
    },
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: ["es2021", "chrome100", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
