import { defineConfig } from "cypress";
import { addMatchImageSnapshotPlugin } from "cypress-image-snapshot/plugin";

export default defineConfig({
  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },
  screenshotOnRunFailure: true,
  video: true,
  retries: {
    runMode: 2, // Retry failed tests twice in CI
    openMode: 0, // No retries in interactive mode
  },
  defaultCommandTimeout: 10000,
  pageLoadTimeout: 60000,
  requestTimeout: 10000,
  e2e: {
    env: {
      NEXT_PUBLIC_ENV: "staging",
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
