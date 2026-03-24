import { HttpResponse, http } from "msw";
import { BASE } from "./base-url";

export interface MockApplication {
  uid: string;
  referenceNumber: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "IN_REVIEW" | "DRAFT";
  projectUID: string;
  programId: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const defaultApplication: MockApplication = {
  uid: "app-uid-001",
  referenceNumber: "APP-2024-0001",
  status: "SUBMITTED",
  projectUID: "proj-uid-001",
  programId: "prog-001",
  title: "Community Growth Initiative",
  description: "A proposal to expand community outreach through workshops and events.",
  createdAt: "2024-06-15T10:30:00.000Z",
  updatedAt: "2024-06-15T10:30:00.000Z",
};

export function applicationHandlers(options?: {
  list?: MockApplication[];
  detail?: Partial<MockApplication>;
}) {
  const list = options?.list ?? [defaultApplication];
  const detail = { ...defaultApplication, ...options?.detail };

  return [
    http.get(`${BASE}/v2/funding-applications/program/:programId`, () => HttpResponse.json(list)),

    http.get(`${BASE}/v2/funding-applications/program/:programId/statistics`, () =>
      HttpResponse.json({
        total: list.length,
        submitted: list.filter((a) => a.status === "SUBMITTED").length,
        approved: list.filter((a) => a.status === "APPROVED").length,
        rejected: list.filter((a) => a.status === "REJECTED").length,
        inReview: list.filter((a) => a.status === "IN_REVIEW").length,
      })
    ),

    http.get(`${BASE}/v2/funding-applications/:applicationId`, () => HttpResponse.json(detail)),

    http.get(`${BASE}/v2/funding-applications/project/:projectUID`, () => HttpResponse.json(list)),

    http.get(`${BASE}/v2/funding-applications/program/:programId/by-email`, () =>
      HttpResponse.json(list)
    ),

    http.get(`${BASE}/v2/funding-applications/program/:programId/export`, () =>
      HttpResponse.json(list)
    ),

    http.get(`${BASE}/v2/funding-applications/admin/:programId/export`, () =>
      HttpResponse.json(list)
    ),

    http.get(`${BASE}/v2/funding-applications/:referenceNumber/versions/timeline`, () =>
      HttpResponse.json([
        {
          version: 1,
          createdAt: detail.createdAt,
          changes: { status: detail.status },
        },
      ])
    ),

    http.get(`${BASE}/v2/funding-applications/:applicationId/reviewers`, () =>
      HttpResponse.json([])
    ),

    http.post(`${BASE}/v2/funding-applications`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(
        {
          ...defaultApplication,
          ...body,
          uid: "new-app-uid",
          referenceNumber: "APP-2024-0099",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { status: 201 }
      );
    }),

    http.put(`${BASE}/v2/funding-applications/:applicationId`, async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        ...detail,
        ...body,
        uid: params.applicationId as string,
        updatedAt: new Date().toISOString(),
      });
    }),

    http.delete(`${BASE}/v2/funding-applications/:referenceNumber`, () =>
      HttpResponse.json({ success: true })
    ),
  ];
}

export function applicationErrorHandlers() {
  return [
    http.get(`${BASE}/v2/funding-applications/program/:programId`, () =>
      HttpResponse.json({ error: "Server error" }, { status: 500 })
    ),

    http.get(`${BASE}/v2/funding-applications/:applicationId`, () =>
      HttpResponse.json({ error: "Application not found" }, { status: 404 })
    ),

    http.post(`${BASE}/v2/funding-applications`, () =>
      HttpResponse.json({ error: "Validation failed" }, { status: 400 })
    ),
  ];
}
