import { defineConfig } from "cypress";

export default defineConfig({
  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },
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
