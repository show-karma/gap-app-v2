import { HttpResponse, http } from "msw";
import { BASE } from "./base-url";

export interface MockCommunity {
  uid: string;
  slug: string;
  name: string;
  description: string;
  imageURL: string;
  createdAt: string;
}

const defaultCommunity: MockCommunity = {
  uid: "community-uid-001",
  slug: "ethereum-foundation",
  name: "Ethereum Foundation",
  description: "Supporting the Ethereum ecosystem through grants and community building.",
  imageURL: "https://example.com/ef-logo.png",
  createdAt: "2023-01-10T00:00:00.000Z",
};

export function communityHandlers(options?: {
  list?: MockCommunity[];
  detail?: Partial<MockCommunity>;
}) {
  const list = options?.list ?? [defaultCommunity];
  const detail = { ...defaultCommunity, ...options?.detail };

  return [
    http.get(`${BASE}/v2/communities/`, () =>
      HttpResponse.json({
        data: list,
        meta: { total: list.length, page: 1, limit: 10 },
      })
    ),

    http.get(`${BASE}/v2/communities/stats`, () =>
      HttpResponse.json({
        totalCommunities: list.length,
        totalGrants: 42,
        totalProjects: 128,
      })
    ),

    http.get(`${BASE}/v2/communities/:slug`, ({ params }) => {
      const found = list.find((c) => c.slug === params.slug) ?? detail;
      return HttpResponse.json(found);
    }),

    http.get(`${BASE}/v2/communities/:slug/metrics`, () =>
      HttpResponse.json({
        totalGrants: 15,
        totalProjects: 45,
        totalFunding: "1250000",
        activeMilestones: 23,
      })
    ),

    http.get(`${BASE}/v2/communities/:slug/grants`, () =>
      HttpResponse.json({
        data: [],
        meta: { total: 0, page: 1, pageLimit: 10 },
      })
    ),

    http.get(`${BASE}/v2/communities/:slug/stats`, () =>
      HttpResponse.json({
        totalGrants: 15,
        activeProjects: 30,
        completedMilestones: 87,
      })
    ),

    http.get(`${BASE}/v2/communities/:slug/impact`, () => HttpResponse.json({ impacts: [] })),

    http.get(`${BASE}/v2/communities/:slug/projects`, () =>
      HttpResponse.json({
        data: [],
        meta: { total: 0, page: 1, limit: 10 },
      })
    ),

    http.get(`${BASE}/v2/communities/:slug/project-updates`, () => HttpResponse.json([])),

    http.get(`${BASE}/v2/communities/:slug/regions`, () => HttpResponse.json([])),

    http.get(`${BASE}/v2/communities/:slug/milestones/pending-verification`, () =>
      HttpResponse.json([])
    ),

    http.get(`${BASE}/v2/communities/:slug/community-metrics`, () =>
      HttpResponse.json({ metrics: [] })
    ),

    http.get(`${BASE}/v2/communities/:communityUID/payouts`, () =>
      HttpResponse.json({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })
    ),

    http.get(`${BASE}/v2/community-configs/:slug`, () =>
      HttpResponse.json({
        slug: detail.slug,
        features: {},
      })
    ),

    http.put(`${BASE}/v2/community-configs/:slug`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ slug: detail.slug, ...body });
    }),
  ];
}

export function communityErrorHandlers() {
  return [
    http.get(`${BASE}/v2/communities/:slug`, () =>
      HttpResponse.json({ error: "Community not found" }, { status: 404 })
    ),

    http.get(`${BASE}/v2/communities/:slug/metrics`, () =>
      HttpResponse.json({ error: "Server error" }, { status: 500 })
    ),
  ];
}
