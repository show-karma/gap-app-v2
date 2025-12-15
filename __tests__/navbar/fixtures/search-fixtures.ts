/**
 * Search fixtures for navbar testing
 * Provides mock search responses for various scenarios
 */

interface SearchResponse {
  projects: any[];
  communities: any[];
}

/**
 * Helper: Create mock project (V2 structure)
 */
export const createMockProject = (overrides: Partial<any> = {}): any => ({
  uid: overrides.uid || `project-${Math.random().toString(36).substr(2, 9)}`,
  details: {
    title: overrides.title || "Test Project",
    description: overrides.description || "Test project description",
    logoUrl: overrides.imageURL || "https://example.com/project.png",
    slug: overrides.slug || `test-project-${Math.random().toString(36).substr(2, 9)}`,
  },
  owner: overrides.owner || "0x1234567890123456789012345678901234567890",
  type: "project",
  members: [],
  grants: [],
  milestones: [],
  updates: [],
  endorsements: [],
  ...overrides,
});

/**
 * Helper: Create mock community (V2 structure)
 */
export const createMockCommunity = (overrides: Partial<any> = {}): any => ({
  uid: overrides.uid || `community-${Math.random().toString(36).substr(2, 9)}`,
  details: {
    name: overrides.name || "Test Community",
    description: overrides.description || "Test community description",
    imageURL: overrides.imageURL || "https://example.com/community.png",
    slug: overrides.slug || `test-community-${Math.random().toString(36).substr(2, 9)}`,
  },
  type: "community",
  grants: [],
  projects: [],
  members: [],
  ...overrides,
});

/**
 * Empty search results
 */
export const emptySearchResults: SearchResponse = {
  projects: [],
  communities: [],
};

/**
 * Search results with projects only
 */
export const projectsOnlyResults: SearchResponse = {
  projects: [
    createMockProject({
      uid: "project-1",
      title: "Awesome Project",
      description: "Building the future of blockchain",
      imageURL: "https://example.com/project1.png",
    }),
    createMockProject({
      uid: "project-2",
      title: "Cool Dapp",
      description: "Decentralized application for everyone",
      imageURL: "https://example.com/project2.png",
    }),
    createMockProject({
      uid: "project-3",
      title: "Web3 Tool",
      description: "Essential tooling for Web3 developers",
      imageURL: "https://example.com/project3.png",
    }),
  ],
  communities: [],
};

/**
 * Search results with communities only
 */
export const communitiesOnlyResults: SearchResponse = {
  projects: [],
  communities: [
    createMockCommunity({
      uid: "optimism",
      name: "Optimism",
      description: "Ethereum L2 scaling solution",
      imageURL: "https://example.com/optimism.png",
    }),
    createMockCommunity({
      uid: "arbitrum",
      name: "Arbitrum",
      description: "Optimistic rollup for Ethereum",
      imageURL: "https://example.com/arbitrum.png",
    }),
  ],
};

/**
 * Mixed results (both projects and communities)
 */
export const mixedResults: SearchResponse = {
  projects: [
    createMockProject({
      uid: "project-1",
      title: "DeFi Protocol",
      description: "Next generation DeFi protocol",
      imageURL: "https://example.com/defi.png",
    }),
    createMockProject({
      uid: "project-2",
      title: "NFT Marketplace",
      description: "Trade NFTs seamlessly",
      imageURL: "https://example.com/nft.png",
    }),
  ],
  communities: [
    createMockCommunity({
      uid: "ethereum",
      name: "Ethereum",
      description: "World's programmable blockchain",
      imageURL: "https://example.com/ethereum.png",
    }),
  ],
};

/**
 * Large result set (for performance testing)
 */
export const largeResultSet: SearchResponse = {
  projects: Array.from({ length: 50 }, (_, i) =>
    createMockProject({
      uid: `project-${i}`,
      title: `Project ${i + 1}`,
      description: `Description for project ${i + 1}`,
      imageURL: `https://example.com/project${i}.png`,
    })
  ),
  communities: Array.from({ length: 30 }, (_, i) =>
    createMockCommunity({
      uid: `community-${i}`,
      name: `Community ${i + 1}`,
      description: `Description for community ${i + 1}`,
      imageURL: `https://example.com/community${i}.png`,
    })
  ),
};

/**
 * Results with grouped communities (similar names)
 */
export const groupedCommunitiesResults: SearchResponse = {
  projects: [],
  communities: [
    createMockCommunity({
      uid: "optimism-mainnet",
      name: "Optimism",
      description: "Optimism Mainnet",
      imageURL: "https://example.com/optimism.png",
    }),
    createMockCommunity({
      uid: "optimism-goerli",
      name: "Optimism",
      description: "Optimism Goerli Testnet",
      imageURL: "https://example.com/optimism.png",
    }),
    createMockCommunity({
      uid: "optimism-sepolia",
      name: "Optimism",
      description: "Optimism Sepolia Testnet",
      imageURL: "https://example.com/optimism.png",
    }),
  ],
};

/**
 * Search query strings for testing
 */
export const searchQueries = {
  // Valid queries (>= 3 characters)
  short: "pro",
  medium: "project",
  long: "awesome blockchain project",
  special: "DeFi@2024",

  // Invalid queries (< 3 characters)
  tooShort1: "p",
  tooShort2: "pr",
  empty: "",

  // Edge cases
  spaces: "   ",
  unicode: "プロジェクト",
  emoji: "🚀 project",
  sql: "'; DROP TABLE projects; --",

  // Real-world examples
  optimism: "optimism",
  ethereum: "ethereum",
  defi: "defi protocol",
  nft: "nft",

  // No results expected
  nonsense: "xyzabc123nonexistent",
};

/**
 * API response scenarios for MSW
 */
export const searchResponseScenarios = {
  success: {
    status: 200,
    data: mixedResults,
  },
  empty: {
    status: 200,
    data: emptySearchResults,
  },
  projectsOnly: {
    status: 200,
    data: projectsOnlyResults,
  },
  communitiesOnly: {
    status: 200,
    data: communitiesOnlyResults,
  },
  large: {
    status: 200,
    data: largeResultSet,
  },
  grouped: {
    status: 200,
    data: groupedCommunitiesResults,
  },
  // Error scenarios
  error404: {
    status: 404,
    error: "Not found",
  },
  error500: {
    status: 500,
    error: "Internal server error",
  },
  error503: {
    status: 503,
    error: "Service unavailable",
  },
  timeout: {
    status: 408,
    error: "Request timeout",
  },
  malformed: {
    status: 200,
    data: { invalid: "response" },
  },
};

/**
 * Helper: Get results by query
 */
export const getResultsByQuery = (query: string): SearchResponse => {
  const lowerQuery = query.toLowerCase();

  if (query.length < 3) {
    return emptySearchResults;
  }

  if (lowerQuery.includes("project")) {
    return projectsOnlyResults;
  }

  if (
    lowerQuery.includes("community") ||
    lowerQuery.includes("optimism") ||
    lowerQuery.includes("arbitrum")
  ) {
    return communitiesOnlyResults;
  }

  if (lowerQuery.includes("defi") || lowerQuery.includes("nft")) {
    return mixedResults;
  }

  if (lowerQuery === "nonexistent" || lowerQuery === searchQueries.nonsense) {
    return emptySearchResults;
  }

  // Default to mixed results
  return mixedResults;
};

/**
 * Helper: Simulate grouped communities by finding similar names
 */
export const groupSimilarCommunitiesMock = (communities: any[]) => {
  const grouped: { [key: string]: any[] } = {};

  communities.forEach((community) => {
    const key = community.name.toLowerCase();
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(community);
  });

  return Object.values(grouped).map((group) => {
    if (group.length === 1) {
      return group[0];
    }
    return {
      ...group[0],
      grouped: group,
    };
  });
};

/**
 * Debounce timing constants
 */
export const searchTiming = {
  debounceDelay: 500, // milliseconds
  apiResponseTime: 100, // simulated API response time
  networkTimeout: 5000, // network timeout
};

/**
 * Export all fixtures
 */
export const searchFixtures = {
  emptySearchResults,
  projectsOnlyResults,
  communitiesOnlyResults,
  mixedResults,
  largeResultSet,
  groupedCommunitiesResults,
  searchQueries,
  searchResponseScenarios,
  searchTiming,
  getResultsByQuery,
  groupSimilarCommunitiesMock,
  createMockProject,
  createMockCommunity,
};
