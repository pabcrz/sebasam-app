import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const localFile = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: localFile("./shims/next-link.tsx") },
      { find: /^next\/navigation$/, replacement: localFile("./shims/next-navigation.ts") },
      { find: "@/components/ui", replacement: localFile("./shims/ui.ts") },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});
