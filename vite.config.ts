// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The payment page embeds a frame from the payment provider, which
// cross-origin isolation blocks. Keep isolation off for that page in dev too.
const dropIsolationOnCheckout = {
  name: "drop-isolation-on-checkout",
  configureServer(server: {
    middlewares: { use: (fn: (req: unknown, res: unknown, next: () => void) => void) => void };
  }) {
    server.middlewares.use((req, res, next) => {
      const url = (req as { url?: string }).url ?? "";
      if (url.startsWith("/checkout")) {
        const response = res as { removeHeader: (name: string) => void };
        response.removeHeader("Cross-Origin-Opener-Policy");
        response.removeHeader("Cross-Origin-Embedder-Policy");
      }
      next();
    });
  },
};

export default defineConfig({
  vite: {
    plugins: [dropIsolationOnCheckout],
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "credentialless",
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
