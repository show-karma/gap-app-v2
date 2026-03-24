import { HttpResponse, http } from "msw";
import { BASE } from "./base-url";

export interface MockDisbursement {
  uid: string;
  grantUID: string;
  amount: string;
  token: string;
  chainId: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
}

const defaultDisbursement: MockDisbursement = {
  uid: "disb-uid-001",
  grantUID: "grant-uid-001",
  amount: "10000",
  token: "USDC",
  chainId: 1,
  status: "COMPLETED",
  createdAt: "2024-05-20T14:00:00.000Z",
};

export function payoutHandlers(options?: {
  disbursements?: MockDisbursement[];
  detail?: Partial<MockDisbursement>;
}) {
  const disbursements = options?.disbursements ?? [defaultDisbursement];
  const detail = { ...defaultDisbursement, ...options?.detail };

  return [
    http.post(`${BASE}/v2/payouts/disburse`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(
        {
          ...detail,
          ...body,
          uid: "new-disb-uid",
          status: "NOT_STARTED",
          createdAt: new Date().toISOString(),
        },
        { status: 201 }
      );
    }),

    http.post(`${BASE}/v2/payouts/:disbursementId/record-safe-tx`, async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        uid: params.disbursementId as string,
        safeTxHash: "0xabc123",
        ...body,
      });
    }),

    http.get(`${BASE}/v2/payouts/grant/:grantUID/history`, () =>
      HttpResponse.json({
        data: disbursements,
        pagination: { page: 1, limit: 10, total: disbursements.length, totalPages: 1 },
      })
    ),

    http.get(`${BASE}/v2/payouts/grant/:grantUID/total-disbursed`, () => {
      const total = disbursements
        .filter((d) => d.status === "COMPLETED")
        .reduce((sum, d) => sum + Number(d.amount), 0);
      return HttpResponse.json({ totalDisbursed: String(total) });
    }),

    http.get(`${BASE}/v2/payouts/community/:communityUID/pending`, () =>
      HttpResponse.json({
        data: disbursements.filter((d) => d.status !== "COMPLETED"),
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })
    ),

    http.put(`${BASE}/v2/payouts/:disbursementId/status`, async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        uid: params.disbursementId as string,
        status: body.status ?? "COMPLETED",
      });
    }),

    http.get(`${BASE}/v2/payouts/safe/:safeAddress/awaiting`, () =>
      HttpResponse.json({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })
    ),

    http.get(`${BASE}/v2/payouts/community/:communityUID/recent`, () =>
      HttpResponse.json({
        data: disbursements,
        pagination: { page: 1, limit: 10, total: disbursements.length, totalPages: 1 },
      })
    ),

    // Payout Config
    http.post(`${BASE}/v2/payout-config`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(body, { status: 201 });
    }),

    http.get(`${BASE}/v2/payout-config/community/:communityUID`, () =>
      HttpResponse.json({ communityUID: "community-uid-001", config: {} })
    ),

    http.get(`${BASE}/v2/payout-config/grant/:grantUID`, () =>
      HttpResponse.json({ grantUID: "grant-uid-001", config: {} })
    ),

    http.delete(`${BASE}/v2/payout-config/grant/:grantUID`, () =>
      HttpResponse.json({ success: true })
    ),
  ];
}

export function payoutErrorHandlers() {
  return [
    http.post(`${BASE}/v2/payouts/disburse`, () =>
      HttpResponse.json({ error: "Insufficient funds" }, { status: 400 })
    ),

    http.get(`${BASE}/v2/payouts/grant/:grantUID/history`, () =>
      HttpResponse.json({ error: "Server error" }, { status: 500 })
    ),
  ];
}
