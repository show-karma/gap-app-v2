import { configureSynpressForEthereumWalletMock } from "@synthetixio/synpress/cypress";
import { defineConfig } from "cypress";

export default defineConfig({
  chromeWebSecurity: false,
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
    specPattern: "cypress/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    testIsolation: false,
    baseUrl: "http://localhost:3000",
    viewportHeight: 800,
    viewportWidth: 1440,
    async setupNodeEvents(on, config) {
      return configureSynpressForEthereumWalletMock(on, config);
    },
  },
});
