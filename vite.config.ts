import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/v1\/audio\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "audio-cache",
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^\/api\/v1\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: "Shadowing Training",
        short_name: "Shadow",
        description: "英語シャドーイング練習アプリ",
        theme_color: "#1e293b",
        background_color: "#0f172a",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  build: {
    outDir: "dist",
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
