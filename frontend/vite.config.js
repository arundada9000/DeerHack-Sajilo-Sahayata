import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: [
      "becomes-proceeds-danish-earning.trycloudflare.com",
      "urw-phd-play-relates.trycloudflare.com",
      "nylon-html-suggest-forming.trycloudflare.com",
    ],
    historyApiFallback: true,
  },
  preview: {
    historyApiFallback: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Animation & UI
          "vendor-ui": ["framer-motion", "lucide-react"],
          // Map libraries (heavy)
          "vendor-map": ["leaflet", "react-leaflet", "react-leaflet-cluster"],
          // Data layer
          "vendor-data": ["axios", "@tanstack/react-query", "zustand"],
          // Charting
          "vendor-chart": ["chart.js", "react-chartjs-2"],
          // i18n
          "vendor-i18n": ["i18next", "react-i18next"],
        },
      },
    },
  },
});
