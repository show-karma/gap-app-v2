import { beforeEach, describe, expect, it } from "vitest";
import { Permission } from "@/src/core/rbac/types/permission";
import { Role } from "@/src/core/rbac/types/role";
import { PayoutDisbursementStatus } from "@/src/features/payout-disbursement/types/payout-disbursement";
import {
  fundingApplicationSchema,
  payoutDisbursementSchema,
  projectSchema,
} from "../contracts/contracts/schemas";
import {
  approvedApplication,
  createApplicationList,
  createMockApplication,
  draftApplication,
  rejectedApplication,
  submittedApplication,
} from "./application.factory";
import {
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
import { createMockCampaign, createMockClaimConfig, createMockEligibility } from "./claim.factory";
import { createMockCommunity, createMockProgram } from "./community.factory";
import {
  completedMilestone,
  createMockMilestone,
  milestoneWithEvidence,
  pendingMilestone,
  verifiedMilestone,
} from "./milestone.factory";
import {
  awaitingSignaturesDisbursement,
  createMockDisbursement,
  createMockPaginatedDisbursements,
  disbursedDisbursement,
  pendingDisbursement,
} from "./payout.factory";
import { createMockGrant, createMockGrantMilestone, createMockProject } from "./project.factory";
import { mergeDeep, randomAddress, resetSeq, seq } from "./utils";

beforeEach(() => {
  resetSeq();
});

// ─── Utils ───

describe("utils", () => {
  it("seq returns incrementing numbers", () => {
    expect(seq()).toBe(1);
    expect(seq()).toBe(2);
    expect(seq()).toBe(3);
  });

  it("resetSeq resets the counter", () => {
    seq();
    seq();
    resetSeq();
    expect(seq()).toBe(1);
  });

  it("randomAddress returns a valid hex address", () => {
    const addr = randomAddress();
    expect(addr).toMatch(/^0x[0-9a-f]{40}$/);
  });

  it("randomAddress returns unique values", () => {
    const a = randomAddress();
    const b = randomAddress();
    expect(a).not.toBe(b);
  });

  it("mergeDeep merges nested objects", () => {
    const target = { a: 1, nested: { x: 10, y: 20 } };
    const source = { nested: { x: 99 } };
    const result = mergeDeep(target, source);
    expect(result).toEqual({ a: 1, nested: { x: 99, y: 20 } });
  });

  it("mergeDeep does not mutate target", () => {
    const target = { a: 1, nested: { x: 10 } };
    const source = { nested: { x: 99 } };
    mergeDeep(target, source);
    expect(target.nested.x).toBe(10);
  });

  it("mergeDeep replaces arrays instead of merging", () => {
    const target = { tags: ["a", "b"] };
    const source = { tags: ["c"] };
    const result = mergeDeep(target, source as any);
    expect(result.tags).toEqual(["c"]);
  });
});

// ─── Auth factories ───

describe("auth.factory", () => {
  describe("createMockUser", () => {
    it("creates a user with default fields", () => {
      const user = createMockUser();
      expect(user.id).toMatch(/^did:privy:user-/);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.linkedAccounts).toEqual([]);
    });

    it("applies overrides", () => {
      const user = createMockUser({ id: "did:privy:custom" });
      expect(user.id).toBe("did:privy:custom");
    });
  });

  describe("createWalletUser", () => {
    it("creates a user with wallet linked account", () => {
      const user = createWalletUser();
      expect(user.wallet).toBeDefined();
      expect(user.wallet?.walletClientType).toBe("metamask");
      expect(user.linkedAccounts).toHaveLength(1);
      expect(user.linkedAccounts[0].type).toBe("wallet");
    });

    it("accepts a custom address", () => {
      const addr = "0x1111111111111111111111111111111111111111";
      const user = createWalletUser(addr);
      expect(user.wallet?.address).toBe(addr);
    });
  });

  describe("createEmailUser", () => {
    it("creates a user with email and embedded wallet", () => {
      const user = createEmailUser();
      expect(user.email?.address).toMatch(/@karma\.fund$/);
      expect(user.wallet?.walletClientType).toBe("privy");
      expect(user.linkedAccounts).toHaveLength(2);
    });
  });

  describe("createFarcasterUser", () => {
    it("creates a user with farcaster linked account", () => {
      const user = createFarcasterUser();
      expect(user.farcaster).toBeDefined();
      expect(user.farcaster?.fid).toBeGreaterThan(100_000);
      expect(user.farcaster?.username).toMatch(/^farcaster-user-/);
      expect(user.linkedAccounts).toHaveLength(2);
    });
  });

  describe("createGoogleUser", () => {
    it("creates a user with Google OAuth and embedded wallet", () => {
      const user = createGoogleUser();
      expect(user.google?.email).toMatch(/@gmail\.com$/);
      expect(user.wallet?.walletClientType).toBe("privy");
      expect(user.linkedAccounts.some((a) => a.type === "google_oauth")).toBe(true);
    });
  });

  describe("createMockWallet", () => {
    it("creates a connected wallet", () => {
      const wallet = createMockWallet();
      expect(wallet.address).toMatch(/^0x/);
      expect(wallet.isConnected).toBe(true);
    });

    it("uses embedded connector for privy type", () => {
      const wallet = createMockWallet(undefined, "privy");
      expect(wallet.connectorType).toBe("embedded");
    });
  });

  describe("bridge state presets", () => {
    it("BRIDGE_ANONYMOUS is unauthenticated", () => {
      expect(BRIDGE_ANONYMOUS.authenticated).toBe(false);
      expect(BRIDGE_ANONYMOUS.user).toBeNull();
    });

    it("BRIDGE_WALLET_AUTH is authenticated with wallet", () => {
      const bridge = BRIDGE_WALLET_AUTH();
      expect(bridge.authenticated).toBe(true);
      expect(bridge.user?.wallet).toBeDefined();
      expect(bridge.address).toBeDefined();
    });

    it("BRIDGE_EMAIL_AUTH is authenticated with email user", () => {
      const bridge = BRIDGE_EMAIL_AUTH();
      expect(bridge.authenticated).toBe(true);
      expect(bridge.user?.email).toBeDefined();
    });

    it("BRIDGE_FARCASTER_AUTH is authenticated with farcaster user", () => {
      const bridge = BRIDGE_FARCASTER_AUTH();
      expect(bridge.authenticated).toBe(true);
      expect(bridge.user?.farcaster).toBeDefined();
    });

    it("createMockBridgeState applies overrides", () => {
      const bridge = createMockBridgeState({ ready: false });
      expect(bridge.ready).toBe(false);
      expect(bridge.authenticated).toBe(false);
    });
  });

  describe("permissions", () => {
    it("guestPermissions has GUEST role", () => {
      const perms = guestPermissions();
      expect(perms.roles.primaryRole).toBe(Role.GUEST);
      expect(perms.permissions).toContain(Permission.COMMUNITY_VIEW);
    });

    it("applicantPermissions can create applications", () => {
      const perms = applicantPermissions();
      expect(perms.roles.primaryRole).toBe(Role.APPLICANT);
      expect(perms.permissions).toContain(Permission.APPLICATION_CREATE);
    });

    it("reviewerPermissions can review applications", () => {
      const perms = reviewerPermissions();
      expect(perms.isReviewer).toBe(true);
      expect(perms.permissions).toContain(Permission.APPLICATION_REVIEW);
    });

    it("communityAdminPermissions has admin flags", () => {
      const perms = communityAdminPermissions();
      expect(perms.isCommunityAdmin).toBe(true);
      expect(perms.permissions).toContain(Permission.COMMUNITY_EDIT);
    });

    it("programAdminPermissions has program admin flag", () => {
      const perms = programAdminPermissions();
      expect(perms.isProgramAdmin).toBe(true);
      expect(perms.permissions).toContain(Permission.PROGRAM_EDIT);
    });

    it("superAdminPermissions has all permissions", () => {
      const perms = superAdminPermissions();
      expect(perms.roles.primaryRole).toBe(Role.SUPER_ADMIN);
      expect(perms.isCommunityAdmin).toBe(true);
      expect(perms.isRegistryAdmin).toBe(true);
      expect(perms.permissions.length).toBe(Object.values(Permission).length);
    });

    it("createPermissionsResponse applies overrides", () => {
      const perms = createPermissionsResponse({
        isProgramCreator: true,
      });
      expect(perms.isProgramCreator).toBe(true);
      expect(perms.roles.primaryRole).toBe(Role.GUEST);
    });
  });
});

// ─── Project factories ───

describe("project.factory", () => {
  describe("createMockProject", () => {
    it("creates a project with all required fields", () => {
      const project = createMockProject();
      expect(project.uid).toMatch(/^0x/);
      expect(project.chainID).toBe(10);
      expect(project.owner).toMatch(/^0x/);
      expect(project.details.title).toBeTruthy();
      expect(project.details.slug).toBeTruthy();
      expect(project.members).toHaveLength(1);
    });

    it("applies nested overrides", () => {
      const project = createMockProject({
        details: { title: "Custom Title" },
      });
      expect(project.details.title).toBe("Custom Title");
      expect(project.details.slug).toBeTruthy(); // other fields preserved
    });

    it("generates unique uids across calls", () => {
      const a = createMockProject();
      const b = createMockProject();
      expect(a.uid).not.toBe(b.uid);
    });
  });

  describe("createMockGrant", () => {
    it("creates a grant with all required fields", () => {
      const grant = createMockGrant();
      expect(grant.uid).toMatch(/^0x/);
      expect(grant.details?.title).toBeTruthy();
      expect(grant.details?.amount).toBe("50000");
      expect(grant.community).toBeDefined();
    });

    it("applies overrides to grant details", () => {
      const grant = createMockGrant({
        details: { amount: "100000" },
      });
      expect(grant.details?.amount).toBe("100000");
      expect(grant.details?.title).toBeTruthy();
    });
  });

  describe("createMockGrantMilestone", () => {
    it("creates a milestone with required fields", () => {
      const ms = createMockGrantMilestone();
      expect(ms.uid).toBeTruthy();
      expect(ms.title).toBeTruthy();
      expect(ms.verified).toEqual([]);
    });
  });
});

// ─── Application factories ───

describe("application.factory", () => {
  describe("createMockApplication", () => {
    it("creates an application with all required fields", () => {
      const app = createMockApplication();
      expect(app.id).toBeTruthy();
      expect(app.programId).toBeTruthy();
      expect(app.referenceNumber).toMatch(/^APP-/);
      expect(app.status).toBe("pending");
      expect(app.applicantEmail).toMatch(/@karma\.fund$/);
      expect(app.ownerAddress).toMatch(/^0x/);
      expect(app.applicationData.projectName).toBeTruthy();
    });

    it("applies overrides", () => {
      const app = createMockApplication({
        applicantEmail: "override@example.com",
      });
      expect(app.applicantEmail).toBe("override@example.com");
    });
  });

  describe("status presets", () => {
    it("draftApplication has pending status", () => {
      const app = draftApplication();
      expect(app.status).toBe("pending");
    });

    it("submittedApplication has under_review status", () => {
      const app = submittedApplication();
      expect(app.status).toBe("under_review");
      expect(app.statusHistory.length).toBeGreaterThanOrEqual(2);
    });

    it("approvedApplication has approved status with projectUID", () => {
      const app = approvedApplication();
      expect(app.status).toBe("approved");
      expect(app.projectUID).toBeTruthy();
    });

    it("rejectedApplication has rejected status with reason", () => {
      const app = rejectedApplication();
      expect(app.status).toBe("rejected");
      const lastStatus = app.statusHistory[app.statusHistory.length - 1];
      expect(lastStatus.reason).toBeTruthy();
    });
  });

  describe("createApplicationList", () => {
    it("creates the requested number of applications", () => {
      const list = createApplicationList(5);
      expect(list).toHaveLength(5);
      const ids = list.map((a) => a.id);
      expect(new Set(ids).size).toBe(5);
    });
  });
});

// ─── Community factories ───

describe("community.factory", () => {
  describe("createMockCommunity", () => {
    it("creates a community with all required fields", () => {
      const community = createMockCommunity();
      expect(community.uid).toMatch(/^0x/);
      expect(community.chainID).toBe(10);
      expect(community.details.name).toBeTruthy();
      expect(community.details.slug).toBeTruthy();
    });

    it("applies nested overrides", () => {
      const community = createMockCommunity({
        details: { name: "Custom Community" },
      });
      expect(community.details.name).toBe("Custom Community");
      expect(community.details.slug).toBeTruthy();
    });
  });

  describe("createMockProgram", () => {
    it("creates a program with form schema", () => {
      const program = createMockProgram();
      expect(program.programId).toBeTruthy();
      expect(program.status).toBe("active");
      expect(program.formSchema.fields.length).toBeGreaterThan(0);
      expect(program.isEnabled).toBe(true);
    });

    it("applies overrides", () => {
      const program = createMockProgram({ status: "closed" });
      expect(program.status).toBe("closed");
    });
  });
});

// ─── Payout factories ───

describe("payout.factory", () => {
  describe("createMockDisbursement", () => {
    it("creates a disbursement with all required fields", () => {
      const disb = createMockDisbursement();
      expect(disb.id).toBeTruthy();
      expect(disb.grantUID).toMatch(/^0x/);
      expect(disb.safeAddress).toMatch(/^0x/);
      expect(disb.disbursedAmount).toBe("25000");
      expect(disb.token).toBe("USDC");
      expect(disb.tokenDecimals).toBe(6);
      expect(disb.status).toBe(PayoutDisbursementStatus.PENDING);
    });

    it("applies overrides", () => {
      const disb = createMockDisbursement({
        disbursedAmount: "50000",
      });
      expect(disb.disbursedAmount).toBe("50000");
    });
  });

  describe("status presets", () => {
    it("pendingDisbursement is PENDING", () => {
      expect(pendingDisbursement().status).toBe(PayoutDisbursementStatus.PENDING);
    });

    it("awaitingSignaturesDisbursement has safe tx hash", () => {
      const disb = awaitingSignaturesDisbursement();
      expect(disb.status).toBe(PayoutDisbursementStatus.AWAITING_SIGNATURES);
      expect(disb.safeTransactionHash).toBeTruthy();
    });

    it("disbursedDisbursement has executedAt", () => {
      const disb = disbursedDisbursement();
      expect(disb.status).toBe(PayoutDisbursementStatus.DISBURSED);
      expect(disb.executedAt).toBeTruthy();
    });
  });

  describe("createMockPaginatedDisbursements", () => {
    it("creates paginated response with correct structure", () => {
      const result = createMockPaginatedDisbursements(1, 10);
      expect(result.payload).toHaveLength(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalCount).toBe(25);
      expect(result.pagination.hasNextPage).toBe(true);
    });

    it("last page has fewer items", () => {
      const result = createMockPaginatedDisbursements(3, 10);
      expect(result.payload).toHaveLength(5);
      expect(result.pagination.hasNextPage).toBe(false);
    });

    it("filters by status when provided", () => {
      const result = createMockPaginatedDisbursements(1, 5, PayoutDisbursementStatus.DISBURSED);
      for (const disb of result.payload) {
        expect(disb.status).toBe(PayoutDisbursementStatus.DISBURSED);
      }
    });
  });
});

// ─── Claim factories ───

describe("claim.factory", () => {
  describe("createMockEligibility", () => {
    it("creates eligibility with proof and amount", () => {
      const elig = createMockEligibility();
      expect(elig.eligible).toBe(true);
      expect(elig.proof).toHaveLength(2);
      expect(elig.amount).toBeTruthy();
      expect(elig.tokenSymbol).toBe("USDC");
    });

    it("applies overrides", () => {
      const elig = createMockEligibility({ eligible: false });
      expect(elig.eligible).toBe(false);
    });
  });

  describe("createMockCampaign", () => {
    it("creates a campaign with all fields", () => {
      const campaign = createMockCampaign();
      expect(campaign.campaignId).toBeTruthy();
      expect(campaign.networkName).toBe("Optimism");
      expect(campaign.contractAddress).toMatch(/^0x/);
      expect(campaign.isActive).toBe(true);
    });
  });

  describe("createMockClaimConfig", () => {
    it("creates a config with nested eligibility and campaign", () => {
      const config = createMockClaimConfig();
      expect(config.campaignId).toBeTruthy();
      expect(config.userAddress).toMatch(/^0x/);
      expect(config.eligibility.eligible).toBe(true);
      expect(config.campaign.isActive).toBe(true);
    });

    it("applies nested overrides", () => {
      const config = createMockClaimConfig({
        eligibility: { eligible: false },
      });
      expect(config.eligibility.eligible).toBe(false);
      expect(config.eligibility.proof).toHaveLength(2); // default preserved
    });
  });
});

// ─── Milestone factories ───

describe("milestone.factory", () => {
  describe("createMockMilestone", () => {
    it("creates a milestone with all required fields", () => {
      const ms = createMockMilestone();
      expect(ms.uid).toMatch(/^0x/);
      expect(ms.title).toBeTruthy();
      expect(ms.description).toBeTruthy();
      expect(ms.verified).toEqual([]);
      expect(ms.currentStatus).toBe("pending");
    });

    it("applies overrides", () => {
      const ms = createMockMilestone({ title: "Custom Milestone" });
      expect(ms.title).toBe("Custom Milestone");
    });
  });

  describe("status presets", () => {
    it("pendingMilestone is pending", () => {
      const ms = pendingMilestone();
      expect(ms.currentStatus).toBe("pending");
      expect(ms.completed).toBeNull();
    });

    it("completedMilestone has completion data", () => {
      const ms = completedMilestone();
      expect(ms.currentStatus).toBe("completed");
      expect(ms.completed).toBeDefined();
      expect(ms.completed?.data?.completionPercentage).toBe(100);
    });

    it("verifiedMilestone has verification attestations", () => {
      const ms = verifiedMilestone();
      expect(ms.verified.length).toBeGreaterThan(0);
      expect(ms.verified[0].attester).toMatch(/^0x/);
    });
  });

  describe("milestoneWithEvidence", () => {
    it("creates a completed milestone with custom evidence", () => {
      const ms = milestoneWithEvidence({
        proofOfWork: "https://github.com/example/pr/123",
        reason: "PR merged and deployed",
      });
      expect(ms.completed?.data?.proofOfWork).toBe("https://github.com/example/pr/123");
      expect(ms.completed?.data?.reason).toBe("PR merged and deployed");
    });
  });
});

// ─── Factory vs Zod schema validation ───
// Every factory output must satisfy its corresponding Zod contract schema.
// This catches drift between factories and the API contracts they represent.

describe("factory output satisfies Zod schemas", () => {
  describe("application factory -> fundingApplicationSchema", () => {
    it("createMockApplication output passes schema validation", () => {
      const app = createMockApplication();
      const result = fundingApplicationSchema.safeParse(app);
      expect(result.success).toBe(true);
    });

    it("approvedApplication output passes schema validation", () => {
      const app = approvedApplication();
      const result = fundingApplicationSchema.safeParse(app);
      expect(result.success).toBe(true);
    });

    it("rejectedApplication output passes schema validation", () => {
      const app = rejectedApplication();
      const result = fundingApplicationSchema.safeParse(app);
      expect(result.success).toBe(true);
    });

    it("submittedApplication output passes schema validation", () => {
      const app = submittedApplication();
      const result = fundingApplicationSchema.safeParse(app);
      expect(result.success).toBe(true);
    });

    it("draftApplication output passes schema validation", () => {
      const app = draftApplication();
      const result = fundingApplicationSchema.safeParse(app);
      expect(result.success).toBe(true);
    });

    it("createApplicationList items all pass schema validation", () => {
      const list = createApplicationList(5);
      for (const app of list) {
        const result = fundingApplicationSchema.safeParse(app);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("project factory -> projectSchema", () => {
    it("createMockProject output passes schema validation", () => {
      const project = createMockProject();
      const result = projectSchema.safeParse(project);
      expect(result.success).toBe(true);
    });

    it("createMockProject with overrides passes schema validation", () => {
      const project = createMockProject({
        details: { title: "Custom Title" },
      });
      const result = projectSchema.safeParse(project);
      expect(result.success).toBe(true);
    });
  });

  describe("payout factory -> payoutDisbursementSchema", () => {
    it("createMockDisbursement output passes schema validation", () => {
      const disb = createMockDisbursement();
      const result = payoutDisbursementSchema.safeParse(disb);
      expect(result.success).toBe(true);
    });

    it("pendingDisbursement output passes schema validation", () => {
      const disb = pendingDisbursement();
      const result = payoutDisbursementSchema.safeParse(disb);
      expect(result.success).toBe(true);
    });

    it("awaitingSignaturesDisbursement output passes schema validation", () => {
      const disb = awaitingSignaturesDisbursement();
      const result = payoutDisbursementSchema.safeParse(disb);
      expect(result.success).toBe(true);
    });

    it("disbursedDisbursement output passes schema validation", () => {
      const disb = disbursedDisbursement();
      const result = payoutDisbursementSchema.safeParse(disb);
      expect(result.success).toBe(true);
    });
  });
});
