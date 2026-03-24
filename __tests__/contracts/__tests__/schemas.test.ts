import { describe, expect, it } from "vitest";
import {
  applicationStatisticsSchema,
  createDisbursementsResponseSchema,
  fundingApplicationSchema,
  paginatedApplicationsResponseSchema,
  paginatedDisbursementsResponseSchema,
  paginatedProjectsResponseSchema,
  payoutDisbursementSchema,
  payoutGrantConfigSchema,
  projectSchema,
  savePayoutConfigResponseSchema,
  totalDisbursedResponseSchema,
} from "../schemas";

// ---------------------------------------------------------------------------
// Payout schemas
// ---------------------------------------------------------------------------
describe("payout schemas", () => {
  const validDisbursement = {
    id: "d-1",
    grantUID: "0xgrant1",
    projectUID: "0xproj1",
    communityUID: "0xcomm1",
    chainID: 10,
    safeAddress: "0xsafe",
    safeTransactionHash: null,
    disbursedAmount: "50000",
    token: "USDC",
    tokenAddress: "0xtoken",
    tokenDecimals: 6,
    payoutAddress: "0xrecip",
    milestoneBreakdown: null,
    paidAllocationIds: [],
    status: "PENDING" as const,
    executedAt: null,
    createdBy: "0xcreator",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  };

  it("validates a valid PayoutDisbursement", () => {
    const result = payoutDisbursementSchema.safeParse(validDisbursement);
    expect(result.success).toBe(true);
  });

  it("rejects PayoutDisbursement with missing required fields", () => {
    const { id, ...incomplete } = validDisbursement;
    const result = payoutDisbursementSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = payoutDisbursementSchema.safeParse({
      ...validDisbursement,
      status: "UNKNOWN",
    });
    expect(result.success).toBe(false);
  });

  it("validates PaginatedDisbursementsResponse", () => {
    const result = paginatedDisbursementsResponseSchema.safeParse({
      payload: [validDisbursement],
      pagination: {
        totalCount: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        nextPage: null,
        prevPage: null,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates TotalDisbursedResponse", () => {
    const result = totalDisbursedResponseSchema.safeParse({
      totalDisbursed: "100000",
    });
    expect(result.success).toBe(true);
  });

  it("validates PayoutGrantConfig", () => {
    const result = payoutGrantConfigSchema.safeParse({
      id: "cfg-1",
      grantUID: "0xgrant",
      projectUID: "0xproj",
      communityUID: "0xcomm",
      payoutAddress: "0xaddr",
      totalGrantAmount: "100000",
      tokenAddress: "0xtoken",
      chainID: 10,
      milestoneAllocations: [{ id: "alloc-1", label: "Milestone 1", amount: "50000" }],
      createdBy: "0xcreator",
      updatedBy: null,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates SavePayoutConfigResponse", () => {
    const result = savePayoutConfigResponseSchema.safeParse({
      success: [],
      failed: [{ grantUID: "0xgrant", error: "not found" }],
    });
    expect(result.success).toBe(true);
  });

  it("validates CreateDisbursementsResponse", () => {
    const result = createDisbursementsResponseSchema.safeParse({
      disbursements: [validDisbursement],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Application schemas
// ---------------------------------------------------------------------------
describe("application schemas", () => {
  const validApplication = {
    id: "app-1",
    programId: "prog-1",
    chainID: 10,
    applicantEmail: "test@example.com",
    ownerAddress: "0xowner",
    applicationData: { name: "Test Project" },
    status: "pending" as const,
    statusHistory: [{ status: "pending" as const, timestamp: "2025-01-01T00:00:00Z" }],
    referenceNumber: "APP-12345-67890",
    submissionIP: "127.0.0.1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  };

  it("validates a valid FundingApplication", () => {
    const result = fundingApplicationSchema.safeParse(validApplication);
    expect(result.success).toBe(true);
  });

  it("rejects invalid application status", () => {
    const result = fundingApplicationSchema.safeParse({
      ...validApplication,
      status: "invalid_status",
    });
    expect(result.success).toBe(false);
  });

  it("validates ApplicationStatistics", () => {
    const result = applicationStatisticsSchema.safeParse({
      totalApplications: 100,
      pendingApplications: 30,
      approvedApplications: 50,
      rejectedApplications: 20,
    });
    expect(result.success).toBe(true);
  });

  it("validates PaginatedApplicationsResponse", () => {
    const result = paginatedApplicationsResponseSchema.safeParse({
      applications: [validApplication],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional fields", () => {
    const result = fundingApplicationSchema.safeParse({
      ...validApplication,
      projectUID: "0xproject",
      appReviewers: ["0xreviewer1"],
      milestoneReviewers: ["0xreviewer2"],
      postApprovalCompleted: true,
      aiEvaluation: { evaluation: "good", promptId: "p1" },
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Project schemas
// ---------------------------------------------------------------------------
describe("project schemas", () => {
  const validProject = {
    uid: "0x1234abcd",
    chainID: 10,
    owner: "0xowner",
    details: {
      title: "Test Project",
      slug: "test-project",
    },
    members: [{ address: "0xmember1", role: "admin", joinedAt: "2025-01-01T00:00:00Z" }],
  };

  it("validates a minimal valid Project", () => {
    const result = projectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it("rejects project with non-hex uid", () => {
    const result = projectSchema.safeParse({
      ...validProject,
      uid: "not-hex",
    });
    expect(result.success).toBe(false);
  });

  it("validates project with all optional fields", () => {
    const result = projectSchema.safeParse({
      ...validProject,
      payoutAddress: "0xpayout",
      chainPayoutAddress: { "10": "0xaddr" },
      communities: ["community-1"],
      stats: { grantsCount: 5, grantMilestonesCount: 10, roadmapItemsCount: 3 },
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-06-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates PaginatedProjectsResponse", () => {
    const result = paginatedProjectsResponseSchema.safeParse({
      payload: [validProject],
      pagination: {
        totalCount: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        nextPage: null,
        prevPage: null,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects project missing required details.title", () => {
    const result = projectSchema.safeParse({
      ...validProject,
      details: { slug: "no-title" },
    });
    expect(result.success).toBe(false);
  });
});
