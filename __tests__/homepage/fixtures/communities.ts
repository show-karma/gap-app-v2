/**
 * Mock Community Data for Homepage Tests
 */

export interface MockCommunity {
  name: string;
  imageURL: string;
  slug: string;
  href?: string;
}

export const mockCommunities: MockCommunity[] = [
  {
    name: "Optimism",
    imageURL: "https://example.com/optimism.png",
    slug: "optimism",
  },
  {
    name: "Arbitrum",
    imageURL: "https://example.com/arbitrum.png",
    slug: "arbitrum",
  },
  {
    name: "Base",
    imageURL: "https://example.com/base.png",
    slug: "base",
  },
  {
    name: "Polygon",
    imageURL: "https://example.com/polygon.png",
    slug: "polygon",
  },
  {
    name: "Starknet",
    imageURL: "https://example.com/starknet.png",
    slug: "starknet",
  },
];

export const createMockCommunity = (overrides: Partial<MockCommunity> = {}): MockCommunity => ({
  name: overrides.name || "Test Community",
  imageURL: overrides.imageURL || "https://example.com/test-community.png",
  slug: overrides.slug || "test-community",
  href: overrides.href || `/community/${overrides.slug || "test-community"}`,
});

/**
 * Get a specific number of mock communities
 */
export const getMockCommunities = (count: number): MockCommunity[] => {
  return mockCommunities.slice(0, count);
};

