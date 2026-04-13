import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
