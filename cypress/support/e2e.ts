// Import custom commands
import "./auth-commands";
import "./donation-commands";
import "./intercepts";

// Import image snapshot command (kept for future use)
import { addMatchImageSnapshotCommand } from "cypress-image-snapshot/command";

addMatchImageSnapshotCommand({
  customDiffConfig: { threshold: 0.2 },
  failureThreshold: 0.03,
  failureThresholdType: "percent",
  customSnapshotsDir: "cypress/snapshots",
  customDiffDir: "cypress/snapshots/diff",
});

// Test data constants
export const EXAMPLE = {
  COMMUNITY: "gitcoin",
  PROJECT: "scaffold-eth",
  FUNDING_MAP: {
    SEARCH_PROGRAM: "optimism",
    NETWORK_FILTER: "Optimism",
  },
  GITCOIN_ROUND_URL: "https://explorer.gitcoin.co/#/round/10/0x",
};

// Handle uncaught exceptions (e.g., locale errors in test environments)
Cypress.on("uncaught:exception", (err) => {
  // Ignore locale errors and other non-critical exceptions
  if (
    err.message.includes("locale") ||
    err.message.includes("hydration") ||
    err.message.includes("NEXT_NOT_FOUND") ||
    err.message.includes("ChunkLoadError")
  ) {
    return false;
  }
  return true;
});

// Clear state before each test suite
before(() => {
  cy.clearLocalStorage();
  cy.clearCookies();
});

