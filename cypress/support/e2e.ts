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

  // Ignore React hydration mismatch errors (common in SSR/SSG apps)
  // React error #418: Hydration failed because server HTML didn't match client
  // React error #422: There was an error while hydrating
  // React error #423: There was an error while hydrating but React was able to recover
  // React error #425: Text content mismatch
  if (
    err.message.includes("Minified React error #418") ||
    err.message.includes("Minified React error #422") ||
    err.message.includes("Minified React error #423") ||
    err.message.includes("Minified React error #425") ||
    err.message.includes("Hydration failed") ||
    err.message.includes("Text content does not match")
  ) {
    console.warn("[E2E] React hydration error ignored:", err.message);
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

