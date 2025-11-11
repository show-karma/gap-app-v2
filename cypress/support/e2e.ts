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
