/**
 * Mock community data for funders page tests
 */

import type { ChosenCommunity } from "@/utilities/chosenCommunities";

export const mockCommunities: ChosenCommunity[] = [
  {
    uid: "optimism-1",
    name: "Optimism",
    slug: "optimism",
    imageURL: {
      light: "/images/communities/optimism.png",
      dark: "/images/communities/optimism.png",
    },
  },
  {
    uid: "arbitrum-1",
    name: "Arbitrum",
    slug: "arbitrum",
    imageURL: {
      light: "/images/communities/arbitrum.png",
      dark: "/images/communities/arbitrum.png",
    },
  },
  {
    uid: "polygon-1",
    name: "Polygon",
    slug: "polygon",
    imageURL: {
      light: "/images/communities/polygon.png",
      dark: "/images/communities/polygon.png",
    },
  },
  {
    uid: "celo-1",
    name: "Celo",
    slug: "celo",
    imageURL: {
      light: "/images/communities/celo.png",
      dark: "/images/communities/celo.png",
    },
  },
  {
    uid: "base-1",
    name: "Base",
    slug: "base",
    imageURL: {
      light: "/images/communities/base.png",
      dark: "/images/communities/base.png",
    },
  },
  {
    uid: "zksync-1",
    name: "zkSync",
    slug: "zksync",
    imageURL: {
      light: "/images/communities/zksync.png",
      dark: "/images/communities/zksync.png",
    },
  },
];

/**
 * Factory function to create a mock community with custom properties
 */
export function createMockCommunity(overrides: Partial<ChosenCommunity> = {}): ChosenCommunity {
  return {
    uid: "test-community-1",
    name: "Test Community",
    slug: "test-community",
    imageURL: {
      light: "/images/communities/test.png",
      dark: "/images/communities/test.png",
    },
    ...overrides,
  };
}

/**
 * Get a subset of communities for carousel testing
 */
export function getCarouselCommunities(count: number = 6): ChosenCommunity[] {
  return mockCommunities.slice(0, count);
}

