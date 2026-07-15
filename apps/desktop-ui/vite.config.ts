import react from "@vitejs/plugin-react"
import tailwind from "@tailwindcss/vite"
import { defineConfig } from "vite"

const repoRoot = decodeURIComponent(
  new URL("../..", import.meta.url).pathname,
)

export default defineConfig({
  base: "./",
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      "@": `${repoRoot}/src`,
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    sourcemap: true,
    target: "safari15",
  },
})
