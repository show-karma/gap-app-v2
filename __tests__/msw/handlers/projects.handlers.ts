import { HttpResponse, http } from "msw";
import { paginatedProjectsResponseSchema, projectSchema } from "../../contracts/contracts/schemas";
import { BASE } from "./base-url";
import { validateResponse } from "./validate";

export interface MockProject {
  uid: string;
  slug: string;
  title: string;
  description: string;
  payoutAddress: string;
  chainId: number;
  createdAt: string;
  updatedAt: string;
}

const defaultProject: MockProject = {
  uid: "proj-uid-001",
  slug: "decentralized-identity",
  title: "Decentralized Identity Protocol",
  description: "Building self-sovereign identity infrastructure for Web3 applications.",
  payoutAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
  chainId: 1,
  createdAt: "2024-02-01T00:00:00.000Z",
  updatedAt: "2024-06-10T00:00:00.000Z",
};

/**
 * Converts a simplified MockProject into a shape that satisfies `projectSchema`.
 * Used for paginated responses that are validated against the Zod contract.
 */
function toSchemaProject(p: MockProject) {
  return {
    uid: `0x${p.uid.replace(/[^a-f0-9]/gi, "").padStart(8, "0")}`,
    chainID: p.chainId,
    owner: `0x${p.payoutAddress.replace(/^0x/, "")}`,
    payoutAddress: p.payoutAddress,
    details: {
      title: p.title,
      description: p.description,
      slug: p.slug,
    },
    members: [
      {
        address: p.payoutAddress,
        role: "Owner",
        joinedAt: p.createdAt,
      },
    ],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function projectHandlers(options?: { list?: MockProject[]; detail?: Partial<MockProject> }) {
  const list = options?.list ?? [defaultProject];
  const detail = { ...defaultProject, ...options?.detail };

  return [
    http.get(`${BASE}/v2/projects`, ({ request }) => {
      const url = new URL(request.url);
      const page = url.searchParams.get("page");

      if (page) {
        const pageNum = Number(page);
        const paginatedResponse = {
          payload: list.map(toSchemaProject),
          pagination: {
            totalCount: list.length,
            page: pageNum,
            limit: 10,
            totalPages: 1,
            nextPage: null,
            prevPage: pageNum > 1 ? pageNum - 1 : null,
            hasNextPage: false,
            hasPrevPage: pageNum > 1,
          },
        };
        validateResponse(
          paginatedProjectsResponseSchema,
          paginatedResponse,
          "GET /v2/projects (paginated)"
        );
        return HttpResponse.json(paginatedResponse);
      }

      return HttpResponse.json(list);
    }),

    http.get(`${BASE}/v2/projects/slug/check/:slug`, ({ params }) =>
      HttpResponse.json({ available: params.slug !== detail.slug })
    ),

    http.get(`${BASE}/v2/projects/:projectIdOrSlug`, ({ params }) => {
      const id = params.projectIdOrSlug as string;
      const found = list.find((p) => p.uid === id || p.slug === id) ?? detail;
      return HttpResponse.json(found);
    }),

    http.get(`${BASE}/v2/projects/:projectIdOrSlug/grants`, () => HttpResponse.json([])),

    http.get(`${BASE}/v2/projects/:projectUid/grants/:programId/milestones`, () =>
      HttpResponse.json([])
    ),

    http.get(`${BASE}/v2/projects/:projectIdOrSlug/updates`, () => HttpResponse.json([])),

    http.get(`${BASE}/v2/projects/:projectIdOrSlug/milestones`, () => HttpResponse.json([])),

    http.get(`${BASE}/v2/projects/:projectId/chain-payout-address`, () =>
      HttpResponse.json({ address: detail.payoutAddress })
    ),

    http.put(`${BASE}/v2/projects/:projectId/chain-payout-address`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(body);
    }),

    http.get(`${BASE}/v2/projects/:projectUID/regions`, () => HttpResponse.json([])),

    http.put(`${BASE}/v2/projects/:projectUID/regions`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(body);
    }),

    http.post(`${BASE}/v2/projects/contracts/address-availability`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ available: true, ...body });
    }),

    http.get(`${BASE}/v2/projects/contracts/deployer`, () =>
      HttpResponse.json({ deployer: "0x0000000000000000000000000000000000000000" })
    ),

    http.post(`${BASE}/v2/projects/contracts/verify-message`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ verified: true, ...body });
    }),

    http.post(`${BASE}/v2/projects/contracts/verify-signature`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ verified: true, ...body });
    }),

    http.get(`${BASE}/v2/projects/logos/presigned`, () =>
      HttpResponse.json({
        url: "https://storage.example.com/upload/presigned-url",
        key: "logos/temp-123",
      })
    ),

    http.post(`${BASE}/v2/projects/logos/promote-to-permanent`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        permanentUrl: "https://storage.example.com/logos/permanent-123",
        ...body,
      });
    }),

    http.get(`${BASE}/v2/search`, ({ request }) => {
      const url = new URL(request.url);
      const q = url.searchParams.get("q") ?? "";
      const filtered = list.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()));
      return HttpResponse.json({ projects: filtered, programs: [], communities: [] });
    }),
  ];
}

export function projectErrorHandlers() {
  return [
    http.get(`${BASE}/v2/projects/:projectIdOrSlug`, () =>
      HttpResponse.json({ error: "Project not found" }, { status: 404 })
    ),

    http.get(`${BASE}/v2/projects`, () =>
      HttpResponse.json({ error: "Server error" }, { status: 500 })
    ),
  ];
}
