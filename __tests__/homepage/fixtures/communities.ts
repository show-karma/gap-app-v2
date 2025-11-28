/**
 * Mock Community Data for Homepage Tests
 */

import type { ChosenCommunity } from "@/utilities/chosenCommunities";

export const mockCommunities: ChosenCommunity[] = [
  {
    name: "Optimism",
    slug: "optimism",
    uid: "optimism-1",
    imageURL: {
      light: "https://example.com/optimism.png",
      dark: "https://example.com/optimism.png",
    },
  },
  {
    name: "Arbitrum",
    slug: "arbitrum",
    uid: "arbitrum-1",
    imageURL: {
      light: "https://example.com/arbitrum.png",
      dark: "https://example.com/arbitrum.png",
    },
  },
  {
    name: "Base",
    slug: "base",
    uid: "base-1",
    imageURL: {
      light: "https://example.com/base.png",
      dark: "https://example.com/base.png",
    },
  },
  {
    name: "Polygon",
    slug: "polygon",
    uid: "polygon-1",
    imageURL: {
      light: "https://example.com/polygon.png",
      dark: "https://example.com/polygon.png",
    },
  },
  {
    name: "Starknet",
    slug: "starknet",
    uid: "starknet-1",
    imageURL: {
      light: "https://example.com/starknet.png",
      dark: "https://example.com/starknet.png",
    },
  },
];

export const createMockCommunity = (overrides: Partial<ChosenCommunity> = {}): ChosenCommunity => ({
  name: overrides.name || "Test Community",
  slug: overrides.slug || "test-community",
  uid: overrides.uid || "test-community-1",
  imageURL: overrides.imageURL || {
    light: "https://example.com/test-community.png",
    dark: "https://example.com/test-community.png",
  },
});

/**
 * Get a specific number of mock communities
 */
export const getMockCommunities = (count: number): ChosenCommunity[] => {
  return mockCommunities.slice(0, count);
};
