import { defineConfig } from "cypress";

export default defineConfig({
  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },
  screenshotOnRunFailure: false,
  retries: 2,
  e2e: {
    env: {
      NEXT_PUBLIC_ENV: "staging",
    },
    baseUrl: "http://localhost:3000",
    viewportHeight: 800,
    viewportWidth: 1440,
    setupNodeEvents(on, config) {},
  },
});
