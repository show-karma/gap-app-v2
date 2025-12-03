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
    err.message.includes("NEXT_NOT_FOUND")
  ) {
    return false;
  }

  // Log ChunkLoadError but don't fail the test - it's often a transient network issue
  // but we want to know when it happens for debugging purposes
  if (err.message.includes("ChunkLoadError")) {
    cy.log(`⚠️ ChunkLoadError detected: ${err.message}`);
    console.warn("[E2E] ChunkLoadError detected:", err.message);
    return false;
  }

  return true;
});

// Clear state before each test suite
before(() => {
  cy.clearLocalStorage();
  cy.clearCookies();
});

