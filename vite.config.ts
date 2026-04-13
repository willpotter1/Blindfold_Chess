import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

/** Copies index.html to 404.html so GitHub Pages serves the SPA on all routes. */
const spa404Plugin = (): Plugin => ({
  name: "spa-404",
  closeBundle() {
    const dist = path.resolve(__dirname, "dist");
    const index = path.join(dist, "index.html");
    const fallback = path.join(dist, "404.html");
    if (fs.existsSync(index)) {
      fs.copyFileSync(index, fallback);
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  /**
   * When deployed to GitHub Pages the app lives under /<repo> so absolute
   * asset paths like "/assets/..." 404. Using a relative base for production
   * keeps assets and web workers loading regardless of host, while dev
   * keeps the default "/" for simplicity.
   */
  base: "/",
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/auth": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), spa404Plugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
