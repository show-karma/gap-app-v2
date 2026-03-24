// Shared utilities

// Application factories
export {
  approvedApplication,
  createApplicationList,
  createMockApplication,
  draftApplication,
  rejectedApplication,
  submittedApplication,
} from "./application.factory";
export type {
  MockBridgeState,
  MockLinkedAccount,
  MockUser,
  MockWallet,
} from "./auth.factory";

// Auth factories
export {
  applicantPermissions,
  BRIDGE_ANONYMOUS,
  BRIDGE_EMAIL_AUTH,
  BRIDGE_FARCASTER_AUTH,
  BRIDGE_WALLET_AUTH,
  communityAdminPermissions,
  createEmailUser,
  createFarcasterUser,
  createGoogleUser,
  createMockBridgeState,
  createMockUser,
  createMockWallet,
  createPermissionsResponse,
  createWalletUser,
  guestPermissions,
  programAdminPermissions,
  reviewerPermissions,
  superAdminPermissions,
} from "./auth.factory";
export type {
  MockCampaign,
  MockClaimConfig,
  MockEligibility,
} from "./claim.factory";
// Claim factories
export {
  createMockCampaign,
  createMockClaimConfig,
  createMockEligibility,
} from "./claim.factory";
export type { MockProgram } from "./community.factory";

// Community factories
export {
  createMockCommunity,
  createMockProgram,
} from "./community.factory";
// Milestone factories
export {
  completedMilestone,
  createMockMilestone,
  milestoneWithEvidence,
  pendingMilestone,
  verifiedMilestone,
} from "./milestone.factory";

// Payout factories
export {
  awaitingSignaturesDisbursement,
  confirmedDisbursement,
  createMockDisbursement,
  createMockPaginatedDisbursements,
  disbursedDisbursement,
  pendingDisbursement,
} from "./payout.factory";
// Project factories
export {
  createMockGrant,
  createMockGrantMilestone,
  createMockProject,
} from "./project.factory";
export type { DeepPartial } from "./utils";
export { applyOverrides, mergeDeep, randomAddress, resetSeq, seq } from "./utils";
