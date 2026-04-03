/**
 * Shared integration test fixtures
 *
 * Factory functions for creating realistic mock data with override support.
 * All factories return objects matching the V2 API response types.
 */

import type { Community } from "@/types/v2/community";
import type { Grant, GrantDetails, GrantMilestone } from "@/types/v2/grant";
import type { PaginatedProjectsResponse, Project, ProjectsPagination } from "@/types/v2/project";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let counter = 0;

function uid(): `0x${string}` {
  counter += 1;
  return `0x${counter.toString(16).padStart(64, "0")}` as `0x${string}`;
}

function address(): `0x${string}` {
  return `0x${"abcdef1234567890".repeat(2).slice(0, 40)}` as `0x${string}`;
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export function createMockProject(overrides: Partial<Project> = {}): Project {
  const id = uid();
  const defaultDetails = {
    title: "Mock Project",
    description: "A test project for integration testing",
    slug: `mock-project-${id.slice(2, 10)}`,
    tags: ["test", "dao"],
    links: [{ url: "https://example.com", type: "website" }],
  };
  return {
    uid: id,
    chainID: 10,
    owner: address(),
    members: [
      {
        address: address() as string,
        role: "owner",
        joinedAt: "2024-01-01T00:00:00.000Z",
      },
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-06-01T00:00:00.000Z",
    stats: {
      grantsCount: 2,
      grantMilestonesCount: 5,
      roadmapItemsCount: 3,
    },
    ...overrides,
    details: {
      ...defaultDetails,
      ...(overrides.details ?? {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Grant
// ---------------------------------------------------------------------------

export function createMockGrantDetails(overrides: Partial<GrantDetails> = {}): GrantDetails {
  return {
    title: "Mock Grant",
    amount: "10000",
    currency: "USDC",
    description: "A grant for integration testing",
    proposalURL: "https://forum.example.com/proposal/1",
    startDate: "2024-01-01",
    ...overrides,
  };
}

export function createMockGrant(overrides: Partial<Grant> = {}): Grant {
  const grantUid = uid() as string;
  return {
    uid: grantUid,
    chainID: 10,
    projectUID: uid() as string,
    communityUID: uid() as string,
    details: createMockGrantDetails(overrides.details ?? {}),
    milestones: [],
    updates: [],
    completed: null,
    createdAt: "2024-01-15T00:00:00.000Z",
    updatedAt: "2024-06-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Grant Milestone
// ---------------------------------------------------------------------------

export function createMockMilestone(overrides: Partial<GrantMilestone> = {}): GrantMilestone {
  return {
    uid: uid() as string,
    chainID: 10,
    title: "Milestone 1",
    description: "First milestone",
    priority: 1,
    verified: [],
    createdAt: "2024-02-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

export function createMockCommunity(overrides: Partial<Community> = {}): Community {
  const id = uid();
  return {
    uid: id,
    chainID: 10,
    details: {
      name: "Mock Community",
      description: "A community for integration testing",
      slug: `mock-community-${id.slice(2, 10)}`,
      ...((overrides.details as Partial<Community["details"]>) ?? {}),
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-06-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Program (funding program registry entry)
// ---------------------------------------------------------------------------

export interface MockProgram {
  _id: string;
  programId: string;
  name: string;
  description: string;
  chainID: number;
  communityUID: string;
  status: string;
  isValid: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export function createMockProgram(overrides: Partial<MockProgram> = {}): MockProgram {
  const id = uid() as string;
  return {
    _id: id,
    programId: `program-${id.slice(2, 10)}`,
    name: "Mock Program",
    description: "A funding program for integration testing",
    chainID: 10,
    communityUID: uid() as string,
    status: "active",
    isValid: "accepted",
    metadata: {},
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-06-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Paginated responses
// ---------------------------------------------------------------------------

export function createMockPagination(
  overrides: Partial<ProjectsPagination> = {}
): ProjectsPagination {
  return {
    totalCount: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
    nextPage: null,
    prevPage: null,
    hasNextPage: false,
    hasPrevPage: false,
    ...overrides,
  };
}

export function createPaginatedProjectsResponse(
  projects: Project[],
  paginationOverrides: Partial<ProjectsPagination> = {}
): PaginatedProjectsResponse {
  return {
    payload: projects,
    pagination: createMockPagination({
      totalCount: projects.length,
      totalPages: 1,
      ...paginationOverrides,
    }),
  };
}

// ---------------------------------------------------------------------------
// Batch helpers
// ---------------------------------------------------------------------------

export function createMockProjects(
  count: number,
  overridesFn?: (index: number) => Partial<Project>
): Project[] {
  return Array.from({ length: count }, (_, i) =>
    createMockProject(
      overridesFn
        ? overridesFn(i)
        : {
            details: {
              title: `Project ${i + 1}`,
              slug: `project-${i + 1}`,
              description: `Description for project ${i + 1}`,
            },
          }
    )
  );
}

export function createMockGrants(
  count: number,
  overridesFn?: (index: number) => Partial<Grant>
): Grant[] {
  return Array.from({ length: count }, (_, i) =>
    createMockGrant(
      overridesFn
        ? overridesFn(i)
        : { details: createMockGrantDetails({ title: `Grant ${i + 1}` }) }
    )
  );
}
