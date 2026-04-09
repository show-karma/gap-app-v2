import { HttpResponse, http } from "msw";
import { BASE } from "./base-url";

export interface MockProgram {
  uid: string;
  programId: string;
  name: string;
  description: string;
  chainId: number;
  status: "active" | "inactive" | "pending";
  createdAt: string;
  updatedAt: string;
}

const defaultProgram: MockProgram = {
  uid: "prog-uid-001",
  programId: "prog-001",
  name: "Open Source Grants",
  description: "Funding open source infrastructure and tooling for the ecosystem.",
  chainId: 1,
  status: "active",
  createdAt: "2024-01-15T00:00:00.000Z",
  updatedAt: "2024-03-20T00:00:00.000Z",
};

export function programHandlers(options?: { list?: MockProgram[]; detail?: Partial<MockProgram> }) {
  const list = options?.list ?? [defaultProgram];
  const detail = { ...defaultProgram, ...options?.detail };

  return [
    // Program Registry endpoints
    http.get(`${BASE}/v2/program-registry`, () =>
      HttpResponse.json({
        payload: list,
        pagination: { page: 1, limit: 10, total: list.length, totalPages: 1 },
      })
    ),

    http.get(`${BASE}/v2/program-registry/search`, () => HttpResponse.json(list)),

    http.get(`${BASE}/v2/program-registry/filters`, () =>
      HttpResponse.json({
        networks: [{ id: 1, name: "Ethereum" }],
        ecosystems: [{ id: "eth", name: "Ethereum" }],
        grantTypes: ["retroactive", "proactive"],
      })
    ),

    http.get(`${BASE}/v2/program-registry/pending`, () =>
      HttpResponse.json({ payload: [], pagination: { total: 0 } })
    ),

    http.get(`${BASE}/v2/program-registry/:programId`, () => HttpResponse.json(detail)),

    http.post(`${BASE}/v2/program-registry`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(
        { ...defaultProgram, ...body, uid: "new-prog-uid" },
        { status: 201 }
      );
    }),

    http.put(`${BASE}/v2/program-registry/:programId`, async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        ...detail,
        ...body,
        programId: params.programId as string,
        updatedAt: new Date().toISOString(),
      });
    }),

    http.post(`${BASE}/v2/program-registry/approve`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ ...body, approved: true });
    }),

    // Funding Program Config endpoints
    http.get(`${BASE}/v2/funding-program-configs`, () => HttpResponse.json(list)),

    http.get(`${BASE}/v2/funding-program-configs/enabled`, () =>
      HttpResponse.json(list.filter((p) => p.status === "active"))
    ),

    http.get(`${BASE}/v2/funding-program-configs/my-reviewer-programs`, () =>
      HttpResponse.json([])
    ),

    http.get(`${BASE}/v2/funding-program-configs/community/:communityId`, () =>
      HttpResponse.json(list)
    ),

    http.get(`${BASE}/v2/funding-program-configs/:programId`, () => HttpResponse.json(detail)),

    http.get(`${BASE}/v2/funding-program-configs/:programId/reviewers`, () =>
      HttpResponse.json([])
    ),

    http.get(`${BASE}/v2/funding-program-configs/:programId/check-permission`, () =>
      HttpResponse.json({ hasPermission: true })
    ),

    http.get(`${BASE}/v2/funding-program-configs/:programId/prompts`, () =>
      HttpResponse.json({ external: null, internal: null })
    ),

    http.post(
      `${BASE}/v2/funding-program-configs/:programId/prompts/:promptType`,
      async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(body, { status: 201 });
      }
    ),

    http.post(
      `${BASE}/v2/funding-program-configs/:programId/prompts/:promptType/test`,
      async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ result: "Evaluation complete", ...body });
      }
    ),

    http.post(`${BASE}/v2/funding-program-configs/:programId/evaluate-all`, () =>
      HttpResponse.json({ jobId: "job-001", status: "started" })
    ),

    http.get(`${BASE}/v2/funding-program-configs/:programId/evaluate-all/:jobId`, () =>
      HttpResponse.json({ jobId: "job-001", status: "completed", progress: 100 })
    ),

    // Program financials
    http.get(`${BASE}/v2/programs/:programId/financials`, () =>
      HttpResponse.json({
        totalBudget: "500000",
        totalDisbursed: "125000",
        totalPending: "50000",
        transactions: [],
      })
    ),

    // Milestone reviewers
    http.get(`${BASE}/v2/programs/:programId/milestone-reviewers`, () => HttpResponse.json([])),
  ];
}

export function programErrorHandlers() {
  return [
    http.get(`${BASE}/v2/program-registry/:programId`, () =>
      HttpResponse.json({ error: "Program not found" }, { status: 404 })
    ),

    http.get(`${BASE}/v2/funding-program-configs/:programId`, () =>
      HttpResponse.json({ error: "Server error" }, { status: 500 })
    ),

    http.post(`${BASE}/v2/program-registry`, () =>
      HttpResponse.json({ error: "Validation failed" }, { status: 400 })
    ),
  ];
}
