import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@/features": path.resolve(__dirname, "src/features"),
      "@/src": path.resolve(__dirname, "src"),
      "@/__tests__": path.resolve(__dirname, "__tests__"),
      "@": path.resolve(__dirname),
    },
  },
  test: {
    name: "unit",
    environment: "jsdom",
    include: [
      "__tests__/utils/__tests__/**/*.test.{ts,tsx}",
      "__tests__/contracts/__tests__/**/*.test.{ts,tsx}",
    ],
    globals: true,
  },
});
