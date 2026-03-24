import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@/features": path.resolve(__dirname, "src/features"),
      "@/src": path.resolve(__dirname, "src"),
      "@": path.resolve(__dirname),
    },
  },
  test: {
    include: ["__tests__/trust/**/*.test.ts", "__tests__/trust/**/*.test.tsx"],
    environment: "node",
    globals: true,
    testTimeout: 10000,
  },
});
