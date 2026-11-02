// Local shim that re-exports the upstream TanStack/Vite shared config package.
// This keeps third-party package references out of top-level config files while
// preserving runtime behavior (the package remains in package.json).

export { defineConfig } from "freshtrack-vite-config";
