import { HttpResponse, http } from "msw";
import { BASE } from "./base-url";

export interface MockDonation {
  uid: string;
  chainId: number;
  projectId: string;
  amount: string;
  tokenSymbol: string;
  tokenAddress: string;
  status: "pending" | "confirmed" | "failed";
  txHash: string;
  createdAt: string;
  updatedAt: string;
}

const defaultDonation: MockDonation = {
  uid: "donation-uid-001",
  chainId: 1,
  projectId: "proj-uid-001",
  amount: "100",
  tokenSymbol: "USDC",
  tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  status: "confirmed",
  txHash: "0xabc123def456",
  createdAt: "2024-07-01T10:00:00.000Z",
  updatedAt: "2024-07-01T10:05:00.000Z",
};

export function donationHandlers(options?: {
  donations?: MockDonation[];
  detail?: Partial<MockDonation>;
}) {
  const donations = options?.donations ?? [defaultDonation];
  const detail = { ...defaultDonation, ...options?.detail };

  return [
    http.get(`${BASE}/v2/donations/me`, () => HttpResponse.json(donations)),

    http.get(`${BASE}/v2/donations/:uid/:chainId`, ({ params }) => {
      const found =
        donations.find((d) => d.uid === params.uid && String(d.chainId) === params.chainId) ??
        detail;
      return HttpResponse.json(found);
    }),

    http.get(`${BASE}/v2/donations/:uid/:chainId/status`, () =>
      HttpResponse.json({ status: detail.status, txHash: detail.txHash })
    ),

    http.post(`${BASE}/v2/donations`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(
        {
          ...defaultDonation,
          ...body,
          uid: "new-donation-uid",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { status: 201 }
      );
    }),

    http.post(`${BASE}/v2/onramp/session`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        sessionId: "session-001",
        url: "https://onramp.example.com/session-001",
        ...body,
      });
    }),
  ];
}

export function donationErrorHandlers() {
  return [
    http.get(`${BASE}/v2/donations/me`, () =>
      HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
    ),

    http.get(`${BASE}/v2/donations/:uid/:chainId`, () =>
      HttpResponse.json({ error: "Donation not found" }, { status: 404 })
    ),

    http.post(`${BASE}/v2/donations`, () =>
      HttpResponse.json({ error: "Validation failed" }, { status: 400 })
    ),
  ];
}
