import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const isAnvil = !!process.env.ANVIL;

export default defineConfig({
  testDir: "./tests",
  testIgnore: isAnvil ? undefined : ["**/*.anvil.spec.ts"],
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: isCI ? 4 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "html",
  outputDir: "./test-results",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Use domcontentloaded instead of load to avoid timeouts caused by
    // deferred layout components (dynamic imports with ssr:false) that
    // fetch additional JS chunks after the initial page load event.
    navigationTimeout: 60_000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 800 },
      },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],

  webServer: {
    command: isCI ? "pnpm start" : "cross-env NEXT_PUBLIC_E2E_AUTH_BYPASS=true pnpm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
