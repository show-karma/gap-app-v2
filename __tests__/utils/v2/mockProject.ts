/**
 * Mock data utilities for ProjectResponse
 * Use these helpers to create consistent test mocks
 */

import type { GrantResponse } from "@/types/v2/grant";
import type { ProjectResponse } from "@/types/v2/project";

/**
 * Creates a mock ProjectResponse for testing
 */
export function createMockProject(overrides?: Partial<ProjectResponse>): ProjectResponse {
  const defaults: ProjectResponse = {
    uid: "0x1234567890abcdef" as `0x${string}`,
    chainID: 10, // Optimism
    owner: "0xabcdef1234567890" as `0x${string}`,
    details: {
      title: "Test Project",
      description: "A test project for unit testing",
      slug: "test-project",
      problem: "Testing is hard",
      solution: "Make it easier with mocks",
      missionSummary: "To boldly test where no one has tested before",
      locationOfImpact: "Global",
      logoUrl: "https://example.com/logo.png",
      businessModel: "Open Source",
      stageIn: "Early Stage",
      raisedMoney: "$100K",
      pathToTake: "Product-Led Growth",
      tags: ["testing", "mock", "v2"],
      links: [
        { type: "twitter", url: "https://twitter.com/testproject" },
        { type: "github", url: "https://github.com/testproject" },
        { type: "discord", url: "https://discord.gg/testproject" },
        { type: "website", url: "https://testproject.com" },
      ],
      lastDetailsUpdate: new Date().toISOString(),
    },
    members: [
      {
        address: "0xabcdef1234567890",
        role: "Owner",
        joinedAt: new Date().toISOString(),
      },
    ],
    endorsements: [],
    impacts: [],
    updates: [],
    communities: [],
    grants: [],
    symlinks: [],
    pointers: [],
    external: {
      gitcoin: [],
      oso: [],
      divvi_wallets: [],
      github: [],
      network_addresses: [],
    },
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates a mock project with grants
 */
export function createMockProjectWithGrants(grantCount: number = 2): ProjectResponse {
  const grants: GrantResponse[] = Array.from({ length: grantCount }, (_, i) => ({
    uid: `0xgrant${i}` as `0x${string}`,
    chainID: 10,
    recipient: "0xrecipient" as `0x${string}`,
    details: {
      title: `Grant ${i + 1}`,
      description: `Description for grant ${i + 1}`,
      amount: "10000",
      proposalURL: "https://example.com/proposal",
    },
    milestones: [],
    updates: [],
    community: {
      uid: "0xcommunity" as `0x${string}`,
      chainID: 10,
      details: {
        name: "Test Community",
        imageURL: "https://example.com/community.png",
      },
    },
  })) as GrantResponse[];

  return createMockProject({ grants });
}

/**
 * Creates minimal mock for testing (useful for quick tests)
 */
export function createMinimalMockProject(): ProjectResponse {
  return {
    uid: "0x123" as `0x${string}`,
    chainID: 10,
    owner: "0xabc" as `0x${string}`,
    details: {
      title: "Minimal Project",
      description: "Minimal description",
      slug: "minimal-project",
    },
    members: [],
    grants: [],
  } as ProjectResponse;
}

/**
 * Creates a project list for testing (e.g., search results)
 */
export function createMockProjectList(count: number = 3): ProjectResponse[] {
  return Array.from({ length: count }, (_, i) =>
    createMockProject({
      uid: `0xproject${i}` as `0x${string}`,
      details: {
        title: `Project ${i + 1}`,
        description: `Description for project ${i + 1}`,
        slug: `project-${i + 1}`,
      },
    })
  );
}

// Aliases for backward compatibility during migration
export const createMockProjectV2 = createMockProject;
export const createMockProjectV2WithGrants = createMockProjectWithGrants;
export const createMinimalMockProjectV2 = createMinimalMockProject;
export const createMockProjectV2List = createMockProjectList;
