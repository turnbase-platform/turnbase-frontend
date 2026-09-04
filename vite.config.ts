import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// local-environment.md §1: the platform origin is http://turnbase.localhost:8080 (both HTTP
// and the WebSocket upgrade share that listener). The dev server proxies everything that
// isn't a Vite-served asset there, so `npm run dev` talks to a real backend without a second
// CORS/cookie configuration to maintain.
const PLATFORM_ORIGIN = "http://turnbase.localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": { target: PLATFORM_ORIGIN, changeOrigin: true },
      "/ws": { target: PLATFORM_ORIGIN, changeOrigin: true, ws: true },
    },
  },
});
