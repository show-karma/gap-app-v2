import { describe, expect, it } from "vitest";
import {
  applicationCommentSchema,
  applicationStatisticsSchema,
  claimCampaignSchema,
  claimConfigSchema,
  claimEligibilitySchema,
  commentListResponseSchema,
  communityProjectSchema,
  communityProjectsResponseSchema,
  communitySchema,
  communityStatsSchema,
  createDisbursementsResponseSchema,
  formFieldSchema,
  formSchemaSchema,
  fundingApplicationSchema,
  fundingProgramConfigSchema,
  grantMilestoneSchema,
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

// ---------------------------------------------------------------------------
// Community schemas
// ---------------------------------------------------------------------------
describe("community schemas", () => {
  const validCommunity = {
    uid: "0xcommunity001",
    chainID: 10,
    details: {
      name: "Optimism RetroPGF",
      slug: "optimism-retropgf",
    },
  };

  it("validates a minimal valid Community", () => {
    const result = communitySchema.safeParse(validCommunity);
    expect(result.success).toBe(true);
  });

  it("rejects community with non-hex uid", () => {
    const result = communitySchema.safeParse({
      ...validCommunity,
      uid: "not-hex",
    });
    expect(result.success).toBe(false);
  });

  it("validates community with all optional fields", () => {
    const result = communitySchema.safeParse({
      ...validCommunity,
      details: {
        ...validCommunity.details,
        description: "A retroactive public goods funding program",
        logoUrl: "https://example.com/logo.png",
        imageURL: "https://example.com/image.png",
      },
      createdAt: "2024-01-10T08:00:00Z",
      updatedAt: "2024-06-01T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects community missing required details.name", () => {
    const result = communitySchema.safeParse({
      ...validCommunity,
      details: { slug: "no-name" },
    });
    expect(result.success).toBe(false);
  });

  it("validates CommunityStats", () => {
    const result = communityStatsSchema.safeParse({
      totalProjects: 45,
      totalGrants: 15,
      totalMilestones: 87,
      projectUpdates: 120,
      projectUpdatesBreakdown: {
        projectMilestones: 30,
        projectCompletedMilestones: 20,
        projectUpdates: 40,
        grantMilestones: 57,
        grantCompletedMilestones: 45,
        grantUpdates: 80,
      },
      totalTransactions: 250,
      averageCompletion: 72.5,
    });
    expect(result.success).toBe(true);
  });

  it("validates CommunityProject", () => {
    const result = communityProjectSchema.safeParse({
      uid: "0xproject1",
      details: {
        title: "Test Project",
        description: "A test project",
        logoUrl: "https://example.com/logo.png",
        slug: "test-project",
      },
      categories: ["DeFi"],
      regions: ["Global"],
      grantNames: ["Builder Grant S1"],
      members: [{ address: "0xmember1", role: "admin", joinedAt: "2024-01-01T00:00:00Z" }],
      links: [{ url: "https://github.com/test", type: "github" }],
      endorsements: [],
      contractAddresses: [],
      numMilestones: 5,
      numCompletedMilestones: 3,
      numUpdates: 10,
      percentCompleted: 60,
      numTransactions: 25,
      createdAt: "2024-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates CommunityProjectsResponse with pagination", () => {
    const result = communityProjectsResponseSchema.safeParse({
      payload: [],
      pagination: {
        totalCount: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        nextPage: null,
        prevPage: null,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Program schemas
// ---------------------------------------------------------------------------
describe("program schemas", () => {
  it("validates a minimal form field", () => {
    const result = formFieldSchema.safeParse({
      id: "projectName",
      type: "text",
      label: "Project Name",
    });
    expect(result.success).toBe(true);
  });

  it("rejects form field with invalid type", () => {
    const result = formFieldSchema.safeParse({
      id: "field1",
      type: "unknown_type",
      label: "Label",
    });
    expect(result.success).toBe(false);
  });

  it("validates a form field with all optional fields", () => {
    const result = formFieldSchema.safeParse({
      id: "fundingAmount",
      type: "number",
      label: "Funding Requested",
      placeholder: "Enter amount",
      required: true,
      description: "How much funding do you need?",
      validation: { min: 1000, max: 100000 },
    });
    expect(result.success).toBe(true);
  });

  it("validates a complete form schema", () => {
    const result = formSchemaSchema.safeParse({
      title: "Grant Application",
      description: "Apply for a grant",
      fields: [
        { id: "name", type: "text", label: "Name", required: true },
        { id: "email", type: "email", label: "Email" },
      ],
      settings: {
        submitButtonText: "Submit",
        confirmationMessage: "Thank you!",
        privateApplications: false,
        accessCodeEnabled: true,
        accessCode: "SECRET123",
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates FundingProgramConfig", () => {
    const result = fundingProgramConfigSchema.safeParse({
      id: "config-1",
      programId: "program-1",
      chainID: 10,
      formSchema: {
        fields: [{ id: "name", type: "text", label: "Project Name" }],
      },
      isEnabled: true,
      createdAt: "2024-03-01T00:00:00Z",
      updatedAt: "2024-03-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates FundingProgramConfig with AI fields", () => {
    const result = fundingProgramConfigSchema.safeParse({
      id: "config-2",
      programId: "program-2",
      chainID: 10,
      formSchema: { fields: [] },
      systemPrompt: "Evaluate applications",
      detailedPrompt: "Score on impact",
      aiModel: "gpt-4",
      enableRealTimeEvaluation: true,
      isEnabled: true,
      createdAt: "2024-03-01T00:00:00Z",
      updatedAt: "2024-03-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects FundingProgramConfig missing required fields", () => {
    const result = fundingProgramConfigSchema.safeParse({
      id: "config-1",
      // missing programId, chainID, formSchema, isEnabled, createdAt, updatedAt
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Milestone schemas
// ---------------------------------------------------------------------------
describe("milestone schemas", () => {
  const validMilestone = {
    uid: "0xms000001",
    chainID: 10,
    title: "Smart contract audit",
    verified: [],
  };

  it("validates a minimal GrantMilestone", () => {
    const result = grantMilestoneSchema.safeParse(validMilestone);
    expect(result.success).toBe(true);
  });

  it("validates a milestone with completion data", () => {
    const result = grantMilestoneSchema.safeParse({
      ...validMilestone,
      currentStatus: "completed",
      completed: {
        uid: "0xcompleted-1",
        chainID: 10,
        createdAt: "2024-08-01T10:00:00Z",
        attester: "0xattester",
        data: {
          reason: "All deliverables met",
          proofOfWork: "https://github.com/example/report",
          completionPercentage: 100,
        },
      },
      verified: [
        {
          uid: "0xverification-1",
          attester: "0xverifier",
          reason: "Verified",
          createdAt: "2024-08-05T14:00:00Z",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts null completed field", () => {
    const result = grantMilestoneSchema.safeParse({
      ...validMilestone,
      completed: null,
    });
    expect(result.success).toBe(true);
  });

  it("validates milestone with status history", () => {
    const result = grantMilestoneSchema.safeParse({
      ...validMilestone,
      statusHistory: [
        { status: "pending", updatedAt: "2024-06-01T00:00:00Z" },
        { status: "in_progress", updatedAt: "2024-07-01T00:00:00Z", updatedBy: "0xadmin" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects milestone missing required verified array", () => {
    const { verified, ...incomplete } = validMilestone;
    const result = grantMilestoneSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Claim schemas
// ---------------------------------------------------------------------------
describe("claim schemas", () => {
  it("validates ClaimEligibility", () => {
    const result = claimEligibilitySchema.safeParse({
      eligible: true,
      proof: ["0x1234", "0xabcd"],
      amount: "1000000000",
      claimFee: "0",
      tokenSymbol: "USDC",
      tokenDecimals: 6,
    });
    expect(result.success).toBe(true);
  });

  it("validates ineligible response with reason", () => {
    const result = claimEligibilitySchema.safeParse({
      eligible: false,
      proof: [],
      amount: "0",
      claimFee: "0",
      tokenSymbol: "USDC",
      tokenDecimals: 6,
      reason: "Address not found in the allowlist",
    });
    expect(result.success).toBe(true);
  });

  it("validates ClaimCampaign", () => {
    const result = claimCampaignSchema.safeParse({
      campaignId: "campaign-1",
      networkName: "Optimism",
      chainId: 10,
      contractAddress: "0xcontract",
      tokenAddress: "0xtoken",
      tokenSymbol: "USDC",
      tokenDecimals: 6,
      totalAllocation: "500000000000",
      claimedAmount: "125000000000",
      startDate: "2024-06-01T00:00:00Z",
      endDate: "2024-12-31T23:59:59Z",
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates full ClaimConfig", () => {
    const result = claimConfigSchema.safeParse({
      campaignId: "campaign-1",
      userAddress: "0xuser",
      eligibility: {
        eligible: true,
        proof: ["0x1234"],
        amount: "1000000000",
        claimFee: "0",
        tokenSymbol: "USDC",
        tokenDecimals: 6,
      },
      campaign: {
        campaignId: "campaign-1",
        networkName: "Optimism",
        chainId: 10,
        contractAddress: "0xcontract",
        tokenAddress: "0xtoken",
        tokenSymbol: "USDC",
        tokenDecimals: 6,
        totalAllocation: "500000000000",
        claimedAmount: "0",
        startDate: "2024-06-01T00:00:00Z",
        endDate: "2024-12-31T23:59:59Z",
        isActive: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects ClaimEligibility with missing required fields", () => {
    const result = claimEligibilitySchema.safeParse({
      eligible: true,
      // missing proof, amount, claimFee, tokenSymbol, tokenDecimals
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Comment schemas
// ---------------------------------------------------------------------------
describe("comment schemas", () => {
  const validComment = {
    id: "comment-001",
    applicationId: "app-001",
    authorAddress: "0xreviewer",
    authorRole: "reviewer" as const,
    content: "This proposal looks strong.",
    isDeleted: false,
    createdAt: "2024-06-16T09:00:00.000Z",
    updatedAt: "2024-06-16T09:00:00.000Z",
  };

  it("validates a minimal ApplicationComment", () => {
    const result = applicationCommentSchema.safeParse(validComment);
    expect(result.success).toBe(true);
  });

  it("validates a comment with optional fields", () => {
    const result = applicationCommentSchema.safeParse({
      ...validComment,
      authorName: "Alice",
      editHistory: [
        {
          content: "Original content",
          editedAt: "2024-06-16T10:00:00.000Z",
          editedBy: "0xreviewer",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("validates a deleted comment", () => {
    const result = applicationCommentSchema.safeParse({
      ...validComment,
      isDeleted: true,
      deletedAt: "2024-06-17T00:00:00.000Z",
      deletedBy: "0xadmin",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid author role", () => {
    const result = applicationCommentSchema.safeParse({
      ...validComment,
      authorRole: "unknown_role",
    });
    expect(result.success).toBe(false);
  });

  it("validates CommentListResponse", () => {
    const result = commentListResponseSchema.safeParse({
      comments: [validComment],
      meta: { total: 1 },
    });
    expect(result.success).toBe(true);
  });

  it("validates CommentListResponse without meta", () => {
    const result = commentListResponseSchema.safeParse({
      comments: [],
    });
    expect(result.success).toBe(true);
  });
});
