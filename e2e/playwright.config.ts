import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const isAnvil = !!process.env.ANVIL;
const hasTestAccount = !!process.env.QA_TEST_EMAIL;

const STORAGE_STATE_PATH = ".auth/user.json";

export default defineConfig({
  testDir: "./tests",
  testIgnore: isAnvil ? undefined : ["**/*.anvil.spec.ts", "**/_experimental/**"],
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
    // Auth setup — logs in once via Privy and saves storage state.
    // Only meaningful in CI with QA_TEST_EMAIL; locally it's a no-op.
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 800 },
        // Reuse Privy auth session from setup project in CI
        ...(hasTestAccount ? { storageState: STORAGE_STATE_PATH } : {}),
      },
      dependencies: hasTestAccount ? ["setup"] : [],
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        ...(hasTestAccount ? { storageState: STORAGE_STATE_PATH } : {}),
      },
      dependencies: hasTestAccount ? ["setup"] : [],
    },
  ],

  webServer: {
    command: isCI ? "pnpm start" : "cross-env NEXT_PUBLIC_E2E_AUTH_BYPASS=true pnpm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
