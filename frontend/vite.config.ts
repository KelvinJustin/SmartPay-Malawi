import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Plain client-side React app (no SSR). The router plugin must come before react().
export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    // Must match FRONTEND_URL in the backend .env (the CORS origin).
    port: 5173,
    strictPort: true,
    // Listen on all interfaces so Docker can publish the port.
    host: true,
    // File-change events don't cross the Docker/Windows boundary,
    // so poll when running in Docker (set in docker-compose.yml).
    watch: process.env.CHOKIDAR_USEPOLLING ? { usePolling: true } : undefined,
  },
});
