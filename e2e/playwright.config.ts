import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const isAnvil = !!process.env.ANVIL;
const hasTestAccount = !!process.env.QA_TEST_EMAIL;

import path from "node:path";

const STORAGE_STATE_PATH = path.join(__dirname, ".auth", "user.json");

// Tests targeting a remote URL (e.g. smoke tests against staging) shouldn't
// boot a local webServer — there's nothing to serve, and `pnpm start` would
// fail without a `.next/` build anyway.
const baseURL = process.env.BASE_URL || "http://localhost:3000";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const isRemoteTarget = (() => {
  try {
    const { hostname } = new URL(baseURL);
    if (LOCAL_HOSTNAMES.has(hostname)) return false;
    if (/^127\.\d+\.\d+\.\d+$/.test(hostname)) return false;
    return true;
  } catch {
    return true;
  }
})();

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
    baseURL,
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
      // Never retry auth setup — retries compound Privy rate limits
      retries: 0,
    },

    {
      name: "chromium",
      testIgnore: [/auth\.setup\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 800 },
        // Reuse Privy auth session from setup project in CI
        ...(hasTestAccount ? { storageState: STORAGE_STATE_PATH } : {}),
      },
      dependencies: hasTestAccount ? ["setup"] : [],
    },
  ],

  webServer: isRemoteTarget
    ? undefined
    : {
        command: isCI ? "pnpm start" : "cross-env NEXT_PUBLIC_E2E_AUTH_BYPASS=true pnpm run dev",
        url: "http://localhost:3000",
        // Reuse an already-running server when one is up (e.g. the dogfood
        // auth-prep job in CI starts `node .next/standalone/server.js`
        // before invoking Playwright). With `!isCI` this collided on port 3000.
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
