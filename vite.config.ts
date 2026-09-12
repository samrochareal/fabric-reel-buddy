// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Only the video editor needs cross-origin isolation. Applying it to every page
// also blocks the payment frame on any page the visitor reaches without a reload.
const isolateVideoEditor = {
  name: "isolate-video-editor",
  configureServer(server: {
    middlewares: { use: (fn: (req: unknown, res: unknown, next: () => void) => void) => void };
  }) {
    server.middlewares.use((req, res, next) => {
      const url = (req as { url?: string }).url ?? "";
      if (url.startsWith("/editor")) {
        const response = res as { setHeader: (name: string, value: string) => void };
        response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        response.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
      }
      next();
    });
  },
};

export default defineConfig({
  vite: {
    plugins: [isolateVideoEditor],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
