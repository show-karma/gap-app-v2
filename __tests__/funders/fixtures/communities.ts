/**
 * Mock community data for funders page tests
 */

export interface MockCommunity {
  uid: string;
  name: string;
  slug: string;
  imageURL: string;
  description?: string;
}

export const mockCommunities: MockCommunity[] = [
  {
    uid: "optimism-1",
    name: "Optimism",
    slug: "optimism",
    imageURL: "/images/communities/optimism.png",
    description: "A fast, stable, and scalable L2 blockchain built by Ethereum developers, for Ethereum developers.",
  },
  {
    uid: "arbitrum-1",
    name: "Arbitrum",
    slug: "arbitrum",
    imageURL: "/images/communities/arbitrum.png",
    description: "The leading Layer 2 scaling solution for Ethereum.",
  },
  {
    uid: "polygon-1",
    name: "Polygon",
    slug: "polygon",
    imageURL: "/images/communities/polygon.png",
    description: "Ethereum's Internet of Blockchains.",
  },
  {
    uid: "celo-1",
    name: "Celo",
    slug: "celo",
    imageURL: "/images/communities/celo.png",
    description: "A mobile-first blockchain that makes decentralized financial tools accessible to anyone with a mobile phone.",
  },
  {
    uid: "base-1",
    name: "Base",
    slug: "base",
    imageURL: "/images/communities/base.png",
    description: "A secure, low-cost, builder-friendly Ethereum L2 built to bring the next billion users onchain.",
  },
  {
    uid: "zksync-1",
    name: "zkSync",
    slug: "zksync",
    imageURL: "/images/communities/zksync.png",
    description: "A user-centric zkRollup platform from Matter Labs.",
  },
];

/**
 * Factory function to create a mock community with custom properties
 */
export function createMockCommunity(overrides: Partial<MockCommunity> = {}): MockCommunity {
  return {
    uid: "test-community-1",
    name: "Test Community",
    slug: "test-community",
    imageURL: "/images/communities/test.png",
    description: "A test community for unit testing.",
    ...overrides,
  };
}

/**
 * Get a subset of communities for carousel testing
 */
export function getCarouselCommunities(count: number = 6): MockCommunity[] {
  return mockCommunities.slice(0, count);
}

