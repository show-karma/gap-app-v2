import { defineConfig } from "cypress";
import { addMatchImageSnapshotPlugin } from "cypress-image-snapshot/plugin";

// Check if running in CI environment
const isCI = process.env.CI === "true";

export default defineConfig({
  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },
  screenshotOnRunFailure: true,
  // Disable video in CI to speed up tests (can be overridden with CYPRESS_VIDEO env var)
  video: !isCI,
  retries: {
    runMode: isCI ? 1 : 2, // Reduce retries in CI for faster feedback
    openMode: 0, // No retries in interactive mode
  },
  defaultCommandTimeout: 10000,
  pageLoadTimeout: 60000,
  requestTimeout: 10000,
  e2e: {
    env: {
      NEXT_PUBLIC_ENV: "staging",
      CI: isCI, // Pass CI flag to Cypress.env() for tests to check
    },
    baseUrl: "http://localhost:3000",
    viewportHeight: 800,
    viewportWidth: 1440,
    setupNodeEvents(on, config) {
      addMatchImageSnapshotPlugin(on, config);
      return config;
    },
  },
});
