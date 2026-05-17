import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      target: "cloudflare-module",
      customViteReactPlugin: true,
      server: { entry: "server" },
    }),
    viteReact(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
  ],
});
