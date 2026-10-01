import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const port = Number(process.env.PORT) || 5001;

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@firebase-config": path.resolve(import.meta.dirname, "src/Firebase"),
    },
    dedupe: ["react", "react-dom"],
  },
  // @ffmpeg/ffmpeg spawns an internal worker that breaks Vite's dep optimizer.
  optimizeDeps: {
    exclude: [
      "@ffmpeg/ffmpeg",
      "@ffmpeg/util",
    ],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-data": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
            "firebase/functions",
          ],
          "vendor-ui": ["@heroui/react", "framer-motion"],
        },
      },
    },
  },
  server: {
    port,
    host: true,
    allowedHosts: true,
    hmr: { clientPort: 443 },

    watch: {
      usePolling: true,
      // Fast enough for local feedback without a 10 ms filesystem polling
      // loop continuously consuming CPU.
      interval: 500,
    },
  },
  preview: {
    port,
    host: true,
  },
});
