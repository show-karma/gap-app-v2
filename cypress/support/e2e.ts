// Import custom donation commands
import "./donation-commands";
// Import image snapshot command
import { addMatchImageSnapshotCommand } from "cypress-image-snapshot/command";

addMatchImageSnapshotCommand({
  customDiffConfig: { threshold: 0.2 },
  failureThreshold: 0.03,
  failureThresholdType: "percent",
  customSnapshotsDir: "cypress/snapshots",
  customDiffDir: "cypress/snapshots/diff",
});

// Handle uncaught exceptions (e.g., locale errors in test environments)
Cypress.on("uncaught:exception", (err) => {
  // Ignore locale-related errors from millify/formatCurrency
  if (err.message.includes("Incorrect locale information") || 
      err.message.includes("toLocaleString")) {
    return false;
  }
  // Let other errors fail the test
  return true;
});

export const EXAMPLE = {
  COMMUNITY: "gitcoin",
  PROJECT: "kyberswap",
  GITCOIN_ROUND_URL: "https://explorer.gitcoin.co/#/round/42161/26/21",
  FUNDING_MAP: {
    SEARCH_PROGRAM: "karma",
    SEARCH_NETWORK: "Bitcoin",
    SEARCH_ECOSYSTEM: "Aave",
    SEARCH_FUNDING: "Bounties",
  },
};
