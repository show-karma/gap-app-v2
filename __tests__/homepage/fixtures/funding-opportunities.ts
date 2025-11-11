/**
 * Mock Funding Opportunity Data for Homepage Tests
 */

export interface MockFundingOpportunity {
  uid: string;
  title: string;
  description: string;
  communityName: string;
  communityLogo: string;
  fundingAmount: string;
  deadline: string;
  status: "active" | "closed" | "upcoming";
  applicationsCount?: number;
  slug: string;
}

export const mockFundingOpportunities: MockFundingOpportunity[] = [
  {
    uid: "program-1",
    title: "Builders Grant Program",
    description: "Support innovative blockchain builders with up to $50K in funding",
    communityName: "Optimism",
    communityLogo: "https://example.com/optimism.png",
    fundingAmount: "$50,000",
    deadline: "2024-12-31",
    status: "active",
    applicationsCount: 42,
    slug: "builders-grant-program",
  },
  {
    uid: "program-2",
    title: "DeFi Innovation Fund",
    description: "Accelerate DeFi protocols with funding up to $100K",
    communityName: "Arbitrum",
    communityLogo: "https://example.com/arbitrum.png",
    fundingAmount: "$100,000",
    deadline: "2024-11-30",
    status: "active",
    applicationsCount: 28,
    slug: "defi-innovation-fund",
  },
  {
    uid: "program-3",
    title: "Public Goods Funding",
    description: "Support public goods projects with retroactive funding",
    communityName: "Base",
    communityLogo: "https://example.com/base.png",
    fundingAmount: "$25,000",
    deadline: "2024-10-15",
    status: "active",
    applicationsCount: 156,
    slug: "public-goods-funding",
  },
  {
    uid: "program-4",
    title: "Gaming Ecosystem Grant",
    description: "Build the future of web3 gaming",
    communityName: "Polygon",
    communityLogo: "https://example.com/polygon.png",
    fundingAmount: "$75,000",
    deadline: "2024-09-30",
    status: "active",
    applicationsCount: 67,
    slug: "gaming-ecosystem-grant",
  },
  {
    uid: "program-5",
    title: "Infrastructure Support",
    description: "Critical infrastructure development funding",
    communityName: "Starknet",
    communityLogo: "https://example.com/starknet.png",
    fundingAmount: "$150,000",
    deadline: "2025-01-31",
    status: "active",
    applicationsCount: 34,
    slug: "infrastructure-support",
  },
];

/**
 * Create a mock funding opportunity
 */
export const createMockFundingOpportunity = (
  overrides: Partial<MockFundingOpportunity> = {}
): MockFundingOpportunity => ({
  uid: overrides.uid || `program-${Math.random().toString(36).substr(2, 9)}`,
  title: overrides.title || "Test Funding Program",
  description: overrides.description || "Test funding program description",
  communityName: overrides.communityName || "Test Community",
  communityLogo: overrides.communityLogo || "https://example.com/test-logo.png",
  fundingAmount: overrides.fundingAmount || "$10,000",
  deadline: overrides.deadline || "2024-12-31",
  status: overrides.status || "active",
  applicationsCount: overrides.applicationsCount || 0,
  slug: overrides.slug || "test-funding-program",
});

/**
 * Get active funding opportunities
 */
export const getActiveFundingOpportunities = (): MockFundingOpportunity[] => {
  return mockFundingOpportunities.filter((p) => p.status === "active");
};

/**
 * Get a specific number of mock funding opportunities
 */
export const getMockFundingOpportunities = (count: number): MockFundingOpportunity[] => {
  return mockFundingOpportunities.slice(0, count);
};

/**
 * Get empty funding opportunities (for testing empty state)
 */
export const getEmptyFundingOpportunities = (): MockFundingOpportunity[] => {
  return [];
};

