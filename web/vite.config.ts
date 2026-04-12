import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // SPA fallback: /admin/* -> admin.html, everything else -> index.html
    {
      name: "spa-fallback",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (
            req.url &&
            req.url.startsWith("/admin") &&
            !req.url.includes(".")
          ) {
            req.url = "/admin.html";
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:3210",
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
});
