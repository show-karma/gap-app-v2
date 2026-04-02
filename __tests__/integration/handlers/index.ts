/**
 * Shared MSW handlers for integration tests
 *
 * Provides realistic API mocking for projects, programs, communities,
 * and auth endpoints. Override individual handlers in tests via server.use().
 */

import { delay, HttpResponse, http } from "msw";
import type { Community } from "@/types/v2/community";
import type { Grant } from "@/types/v2/grant";
import type { PaginatedProjectsResponse, Project } from "@/types/v2/project";
import {
  createMockCommunity,
  createMockGrant,
  createMockProgram,
  createMockProjects,
  createPaginatedProjectsResponse,
  type MockProgram,
} from "../fixtures";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const INDEXER_URL = process.env.NEXT_PUBLIC_GAP_INDEXER_URL || "http://localhost:4000";

// ---------------------------------------------------------------------------
// Default data
// ---------------------------------------------------------------------------

const defaultProjects: Project[] = createMockProjects(6, (i) => ({
  details: {
    title: `Integration Project ${i + 1}`,
    slug: `integration-project-${i + 1}`,
    description: `Description for integration project ${i + 1}`,
  },
}));

const defaultCommunities: Community[] = [
  createMockCommunity({
    details: { name: "Optimism", slug: "optimism", description: "OP ecosystem" },
  }),
  createMockCommunity({
    details: { name: "Arbitrum", slug: "arbitrum", description: "Arbitrum ecosystem" },
  }),
];

const defaultGrants: Grant[] = [
  createMockGrant({ details: { title: "Grant Alpha", amount: "5000", currency: "USDC" } }),
  createMockGrant({ details: { title: "Grant Beta", amount: "10000", currency: "OP" } }),
];

const defaultPrograms: MockProgram[] = [
  createMockProgram({ name: "Season 5 Grants" }),
  createMockProgram({ name: "Retro Funding" }),
];

// ---------------------------------------------------------------------------
// Projects handlers
// ---------------------------------------------------------------------------

/** Paginated projects list (used by projects explorer) */
const projectsListPaginated = http.get(`${INDEXER_URL}/v2/projects`, async ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Number(url.searchParams.get("limit") || "12");

  await delay(50);

  let filtered = defaultProjects;
  if (q) {
    const lower = q.toLowerCase();
    filtered = defaultProjects.filter(
      (p) =>
        p.details.title.toLowerCase().includes(lower) ||
        (p.details.description?.toLowerCase().includes(lower) ?? false)
    );
  }

  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  const response: PaginatedProjectsResponse = createPaginatedProjectsResponse(paged, {
    totalCount: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
    hasNextPage: start + limit < filtered.length,
    hasPrevPage: page > 1,
    nextPage: start + limit < filtered.length ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  });

  return HttpResponse.json(response);
});

/** Single project by ID or slug */
const projectByIdOrSlug = http.get(`${INDEXER_URL}/v2/projects/:idOrSlug`, async ({ params }) => {
  const { idOrSlug } = params;
  await delay(50);

  const project =
    defaultProjects.find((p) => p.uid === idOrSlug || p.details.slug === idOrSlug) ||
    defaultProjects[0];

  return HttpResponse.json(project);
});

/** Project grants */
const projectGrants = http.get(`${INDEXER_URL}/v2/projects/:idOrSlug/grants`, async () => {
  await delay(50);
  return HttpResponse.json(defaultGrants);
});

// ---------------------------------------------------------------------------
// Communities handlers
// ---------------------------------------------------------------------------

const communitiesList = http.get(`${INDEXER_URL}/v2/communities`, async () => {
  await delay(50);
  return HttpResponse.json({
    data: defaultCommunities,
    meta: { total: defaultCommunities.length, page: 1, limit: 10 },
  });
});

const communityBySlug = http.get(`${INDEXER_URL}/v2/communities/:slug`, async ({ params }) => {
  const { slug } = params;
  await delay(50);
  const community =
    defaultCommunities.find((c) => c.details.slug === slug) || defaultCommunities[0];
  return HttpResponse.json({ data: community });
});

// ---------------------------------------------------------------------------
// Programs (funding registry) handlers
// ---------------------------------------------------------------------------

const programsList = http.get(`${INDEXER_URL}/v2/program-registry`, async () => {
  await delay(50);
  return HttpResponse.json({
    data: defaultPrograms,
    pagination: { total: defaultPrograms.length, page: 1, limit: 10 },
  });
});

const programById = http.get(
  `${INDEXER_URL}/v2/program-registry/:programId`,
  async ({ params }) => {
    const { programId } = params;
    await delay(50);
    const program =
      defaultPrograms.find((p) => p.programId === programId || p._id === programId) ||
      defaultPrograms[0];
    return HttpResponse.json(program);
  }
);

const createProgram = http.post(`${INDEXER_URL}/v2/program-registry`, async ({ request }) => {
  const body = (await request.json()) as Record<string, unknown>;
  await delay(50);
  const program = createMockProgram({
    name: (body.name as string) || "New Program",
    description: (body.description as string) || "",
  });
  return HttpResponse.json(program, { status: 201 });
});

// ---------------------------------------------------------------------------
// Auth handlers
// ---------------------------------------------------------------------------

const authStaff = http.get(`${INDEXER_URL}/auth/staff/authorized`, async () => {
  await delay(50);
  return HttpResponse.json({ authorized: false });
});

const userProfile = http.get(`${INDEXER_URL}/user/:address`, async ({ params }) => {
  await delay(50);
  return HttpResponse.json({
    address: params.address,
    username: `user-${(params.address as string).slice(0, 8)}`,
    bio: "Test user",
  });
});

/** Reviewer programs */
const reviewerPrograms = http.get(`${INDEXER_URL}/permissions/reviewer/programs`, async () => {
  await delay(50);
  return HttpResponse.json({ data: [] });
});

/** User projects */
const userProjects = http.get(`${INDEXER_URL}/v2/user/projects`, async () => {
  await delay(50);
  return HttpResponse.json(defaultProjects.slice(0, 2));
});

// ---------------------------------------------------------------------------
// Funding application handlers
// ---------------------------------------------------------------------------

const submitApplication = http.post(
  `${INDEXER_URL}/v2/funding-applications`,
  async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    await delay(50);
    return HttpResponse.json(
      {
        referenceNumber: `APP-${Date.now()}`,
        programId: body.programId,
        status: "submitted",
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }
);

const applicationsByProject = http.get(
  `${INDEXER_URL}/v2/funding-applications/project/:projectUID`,
  async () => {
    await delay(50);
    return HttpResponse.json([]);
  }
);

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

const health = http.get(`${INDEXER_URL}/health`, () => HttpResponse.json({ status: "ok" }));

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** All shared integration test handlers */
export const integrationHandlers = [
  // Projects
  projectsListPaginated,
  projectByIdOrSlug,
  projectGrants,
  // Communities
  communitiesList,
  communityBySlug,
  // Programs
  programsList,
  programById,
  createProgram,
  // Auth
  authStaff,
  userProfile,
  reviewerPrograms,
  userProjects,
  // Applications
  submitApplication,
  applicationsByProject,
  // Misc
  health,
];

/**
 * Convenience helpers for creating scenario-specific override handlers.
 * Usage: server.use(createProjectsErrorHandler(500))
 */

export function createProjectsErrorHandler(statusCode: number = 500) {
  return http.get(`${INDEXER_URL}/v2/projects`, () =>
    HttpResponse.json({ error: "Server error", statusCode }, { status: statusCode })
  );
}

export function createProjectsEmptyHandler() {
  return http.get(`${INDEXER_URL}/v2/projects`, () =>
    HttpResponse.json(createPaginatedProjectsResponse([], { totalCount: 0 }))
  );
}

export function createProjectsHandler(projects: Project[]) {
  return http.get(`${INDEXER_URL}/v2/projects`, () =>
    HttpResponse.json(
      createPaginatedProjectsResponse(projects, {
        totalCount: projects.length,
      })
    )
  );
}

export function createCommunitiesErrorHandler(statusCode: number = 500) {
  return http.get(`${INDEXER_URL}/v2/communities`, () =>
    HttpResponse.json({ error: "Server error", statusCode }, { status: statusCode })
  );
}

export function createApplicationSubmitErrorHandler(statusCode: number = 400) {
  return http.post(`${INDEXER_URL}/v2/funding-applications`, () =>
    HttpResponse.json(
      { error: "Validation error", message: "Missing required fields", statusCode },
      { status: statusCode }
    )
  );
}

export { http, HttpResponse, delay };
