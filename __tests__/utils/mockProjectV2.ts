/**
 * Mock data utilities for ProjectV2Response
 * Use these helpers to create consistent V2 test mocks
 */

import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { ProjectV2Response } from "@/types/project";

/**
 * Creates a mock ProjectV2Response for testing
 */
export function createMockProjectV2(overrides?: Partial<ProjectV2Response>): ProjectV2Response {
  const defaults: ProjectV2Response = {
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
export function createMockProjectV2WithGrants(grantCount: number = 2): ProjectV2Response {
  const grants: IGrantResponse[] = Array.from({ length: grantCount }, (_, i) => ({
    uid: `0xgrant${i}` as `0x${string}`,
    chainID: 10,
    recipient: "0xrecipient" as `0x${string}`,
    details: {
      data: {
        title: `Grant ${i + 1}`,
        description: `Description for grant ${i + 1}`,
        amount: "10000",
        proposalURL: "https://example.com/proposal",
      },
      schema: "",
      refUID: "",
      uid: "" as `0x${string}`,
    },
    milestones: [],
    updates: [],
    community: {
      uid: "0xcommunity" as `0x${string}`,
      details: {
        data: {
          name: "Test Community",
          imageURL: "https://example.com/community.png",
        },
        schema: "",
        refUID: "",
        uid: "" as `0x${string}`,
      },
    } as any,
  })) as any;

  return createMockProjectV2({ grants });
}

/**
 * Creates minimal mock for testing (useful for quick tests)
 */
export function createMinimalMockProjectV2(): ProjectV2Response {
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
  } as ProjectV2Response;
}

/**
 * Creates a project list for testing (e.g., search results)
 */
export function createMockProjectV2List(count: number = 3): ProjectV2Response[] {
  return Array.from({ length: count }, (_, i) =>
    createMockProjectV2({
      uid: `0xproject${i}` as `0x${string}`,
      details: {
        title: `Project ${i + 1}`,
        description: `Description for project ${i + 1}`,
        slug: `project-${i + 1}`,
      },
    })
  );
}
