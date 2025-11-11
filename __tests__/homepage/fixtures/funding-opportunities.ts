/**
 * Mock Funding Opportunity Data for Homepage Tests
 */

import type { FundingProgram } from "@/services/fundingPlatformService";

export const mockFundingOpportunities: FundingProgram[] = [
  {
    programId: "program-1",
    chainID: 10,
    name: "Builders Grant Program",
    metadata: {
      title: "Builders Grant Program",
      description: "Support innovative blockchain builders with up to $50K in funding",
      status: "active",
      programBudget: "50000",
      endsAt: "2024-12-31",
      applicantsNumber: 42,
      logoImg: "https://example.com/optimism.png",
    },
    applicationConfig: {
      id: "config-1",
      programId: "program-1",
      chainID: 10,
      formSchema: {
        fields: [],
      },
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    communityName: "Optimism",
    communitySlug: "optimism",
    communityImage: "https://example.com/optimism.png",
    metrics: {
      totalApplications: 42,
      pendingApplications: 10,
      approvedApplications: 20,
      rejectedApplications: 12,
    },
  },
  {
    programId: "program-2",
    chainID: 42161,
    name: "DeFi Innovation Fund",
    metadata: {
      title: "DeFi Innovation Fund",
      description: "Accelerate DeFi protocols with funding up to $100K",
      status: "active",
      programBudget: "100000",
      endsAt: "2024-11-30",
      applicantsNumber: 28,
      logoImg: "https://example.com/arbitrum.png",
    },
    applicationConfig: {
      id: "config-2",
      programId: "program-2",
      chainID: 42161,
      formSchema: {
        fields: [],
      },
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    communityName: "Arbitrum",
    communitySlug: "arbitrum",
    communityImage: "https://example.com/arbitrum.png",
    metrics: {
      totalApplications: 28,
      pendingApplications: 8,
      approvedApplications: 15,
      rejectedApplications: 5,
    },
  },
  {
    programId: "program-3",
    chainID: 8453,
    name: "Public Goods Funding",
    metadata: {
      title: "Public Goods Funding",
      description: "Support public goods projects with retroactive funding",
      status: "active",
      programBudget: "25000",
      endsAt: "2024-10-15",
      applicantsNumber: 156,
      logoImg: "https://example.com/base.png",
    },
    applicationConfig: {
      id: "config-3",
      programId: "program-3",
      chainID: 8453,
      formSchema: {
        fields: [],
      },
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    communityName: "Base",
    communitySlug: "base",
    communityImage: "https://example.com/base.png",
    metrics: {
      totalApplications: 156,
      pendingApplications: 50,
      approvedApplications: 80,
      rejectedApplications: 26,
    },
  },
  {
    programId: "program-4",
    chainID: 137,
    name: "Gaming Ecosystem Grant",
    metadata: {
      title: "Gaming Ecosystem Grant",
      description: "Build the future of web3 gaming",
      status: "active",
      programBudget: "75000",
      endsAt: "2024-09-30",
      applicantsNumber: 67,
      logoImg: "https://example.com/polygon.png",
    },
    applicationConfig: {
      id: "config-4",
      programId: "program-4",
      chainID: 137,
      formSchema: {
        fields: [],
      },
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    communityName: "Polygon",
    communitySlug: "polygon",
    communityImage: "https://example.com/polygon.png",
    metrics: {
      totalApplications: 67,
      pendingApplications: 20,
      approvedApplications: 35,
      rejectedApplications: 12,
    },
  },
  {
    programId: "program-5",
    chainID: 1,
    name: "Infrastructure Support",
    metadata: {
      title: "Infrastructure Support",
      description: "Critical infrastructure development funding",
      status: "active",
      programBudget: "150000",
      endsAt: "2025-01-31",
      applicantsNumber: 34,
      logoImg: "https://example.com/starknet.png",
    },
    applicationConfig: {
      id: "config-5",
      programId: "program-5",
      chainID: 1,
      formSchema: {
        fields: [],
      },
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    communityName: "Starknet",
    communitySlug: "starknet",
    communityImage: "https://example.com/starknet.png",
    metrics: {
      totalApplications: 34,
      pendingApplications: 12,
      approvedApplications: 18,
      rejectedApplications: 4,
    },
  },
];

/**
 * Create a mock funding opportunity
 */
export const createMockFundingOpportunity = (
  overrides: Partial<FundingProgram> = {}
): FundingProgram => {
  const programId = overrides.programId || `program-${Math.random().toString(36).substr(2, 9)}`;
  const chainID = overrides.chainID || 1;
  
  return {
    programId,
    chainID,
    name: overrides.name || "Test Funding Program",
    metadata: {
      title: overrides.metadata?.title || "Test Funding Program",
      description: overrides.metadata?.description || "Test funding program description",
      status: overrides.metadata?.status || "active",
      programBudget: overrides.metadata?.programBudget || "10000",
      endsAt: overrides.metadata?.endsAt || "2024-12-31",
      applicantsNumber: overrides.metadata?.applicantsNumber || 0,
      logoImg: overrides.metadata?.logoImg || "https://example.com/test-logo.png",
      ...overrides.metadata,
    },
    applicationConfig: overrides.applicationConfig || {
      id: `config-${programId}`,
      programId,
      chainID,
      formSchema: {
        fields: [],
      },
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    communityName: overrides.communityName || "Test Community",
    communitySlug: overrides.communitySlug || "test-community",
    communityImage: overrides.communityImage || "https://example.com/test-logo.png",
    metrics: overrides.metrics || {
      totalApplications: 0,
      pendingApplications: 0,
      approvedApplications: 0,
      rejectedApplications: 0,
    },
    ...overrides,
  };
};

/**
 * Get active funding opportunities
 */
export const getActiveFundingOpportunities = (): FundingProgram[] => {
  return mockFundingOpportunities.filter((p) => p.metadata?.status === "active");
};

/**
 * Get a specific number of mock funding opportunities
 */
export const getMockFundingOpportunities = (count: number): FundingProgram[] => {
  return mockFundingOpportunities.slice(0, count);
};

/**
 * Get empty funding opportunities (for testing empty state)
 */
export const getEmptyFundingOpportunities = (): FundingProgram[] => {
  return [];
};

