import { synpressCommandsForMetaMask } from "@synthetixio/synpress/cypress/support";

Cypress.on("uncaught:exception", () => {
  // failing the test
  return false;
});

synpressCommandsForMetaMask();

before(() => {
  cy.visit("/");
});

export const EXAMPLE = {
  COMMUNITY: "gitcoin",
  PROJECT: "kyberswap",
  GITCOIN_ROUND_URL: "https://explorer.gitcoin.co/#/round/42161/26/21",
  FUNDING_MAP: {
    SEARCH_PROGRAM: "Bit",
    SEARCH_NETWORK: "Bitcoin",
    SEARCH_ECOSYSTEM: "Bitcoin",
    SEARCH_FUNDING: "Bounties",
  },
};
