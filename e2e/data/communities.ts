export interface MockCommunityStats {
  totalProjects: number;
  totalGrants: number;
  totalMilestones: number;
}

export interface MockCommunity {
  uid: string;
  slug: string;
  name: string;
  description: string;
  imageURL: string;
  chainId: number;
  admins: string[];
  programs: string[];
  stats: MockCommunityStats;
}

const DEFAULT_COMMUNITY: MockCommunity = {
  uid: "community-uid-optimism",
  slug: "optimism",
  name: "Optimism",
  description: "Optimism grants community",
  imageURL: "/images/communities/optimism.png",
  chainId: 10,
  admins: ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"],
  programs: [],
  stats: { totalProjects: 42, totalGrants: 100, totalMilestones: 250 },
};

export function createMockCommunity(overrides?: Partial<MockCommunity>): MockCommunity {
  return {
    ...structuredClone(DEFAULT_COMMUNITY),
    ...overrides,
  };
}

export const MOCK_COMMUNITIES = {
  optimism: createMockCommunity(),
  filecoin: createMockCommunity({
    uid: "community-uid-filecoin",
    slug: "filecoin",
    name: "Filecoin",
    description: "Filecoin grants community",
    imageURL: "/images/communities/filecoin.png",
    chainId: 314,
    admins: ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"],
    stats: { totalProjects: 30, totalGrants: 75, totalMilestones: 180 },
  }),
  scroll: createMockCommunity({
    uid: "community-uid-scroll",
    slug: "scroll",
    name: "Scroll",
    description: "Scroll grants community",
    imageURL: "/images/communities/scroll.png",
    chainId: 534352,
    admins: ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"],
    stats: { totalProjects: 15, totalGrants: 40, totalMilestones: 90 },
  }),
  polygon: createMockCommunity({
    uid: "community-uid-polygon",
    slug: "polygon",
    name: "Polygon",
    description: "Polygon grants community",
    imageURL: "/images/communities/polygon.png",
    chainId: 137,
    admins: ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"],
    stats: { totalProjects: 55, totalGrants: 120, totalMilestones: 300 },
  }),
  arbitrum: createMockCommunity({
    uid: "community-uid-arbitrum",
    slug: "arbitrum",
    name: "Arbitrum",
    description: "Arbitrum grants community",
    imageURL: "/images/communities/arbitrum.png",
    chainId: 42161,
    admins: ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"],
    stats: { totalProjects: 60, totalGrants: 150, totalMilestones: 400 },
  }),
} as const;
