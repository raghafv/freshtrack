// Project uses a shared TanStack/Vite config package — do NOT add duplicate plugins here.
// The shared config wires devtools, React, Tailwind, tsconfig paths, and other common plugins.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "./src/shims/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
