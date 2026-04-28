import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.DEMO_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.demo\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: path.resolve(__dirname, "../../e2e-demos-results/report.json") }],
  ],
  outputDir: path.resolve(__dirname, "../../e2e-demos-results"),

  use: {
    baseURL,
    trace: "off",
    screenshot: "off",
    video: {
      mode: "on",
      size: { width: 1280, height: 720 },
    },
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: "demo",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
