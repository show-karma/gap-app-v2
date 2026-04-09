import { HttpResponse, http } from "msw";
import { BASE } from "./base-url";

export interface MockGrantAgreement {
  grantUID: string;
  enabled: boolean;
  signedAt: string | null;
}

export interface MockMilestoneInvoice {
  uid: string;
  grantUID: string;
  milestoneTitle: string;
  amount: string;
  status: "pending" | "approved" | "rejected";
}

const defaultAgreement: MockGrantAgreement = {
  grantUID: "grant-uid-001",
  enabled: true,
  signedAt: "2024-04-15T12:00:00.000Z",
};

const defaultInvoice: MockMilestoneInvoice = {
  uid: "invoice-uid-001",
  grantUID: "grant-uid-001",
  milestoneTitle: "Phase 1 Completion",
  amount: "5000",
  status: "approved",
};

export function claimsHandlers(options?: {
  agreements?: MockGrantAgreement[];
  invoices?: MockMilestoneInvoice[];
}) {
  const agreements = options?.agreements ?? [defaultAgreement];
  const invoices = options?.invoices ?? [defaultInvoice];

  return [
    // Grant Agreements
    http.get(`${BASE}/v2/grant-agreements/:grantUID`, ({ params }) => {
      const found = agreements.find((a) => a.grantUID === params.grantUID) ?? defaultAgreement;
      return HttpResponse.json(found);
    }),

    http.post(`${BASE}/v2/grant-agreements/:grantUID`, ({ params }) =>
      HttpResponse.json({
        grantUID: params.grantUID as string,
        enabled: true,
        signedAt: new Date().toISOString(),
      })
    ),

    // Milestone Invoices
    http.get(`${BASE}/v2/milestone-invoices/grant/:grantUID`, () => HttpResponse.json(invoices)),

    http.post(`${BASE}/v2/milestone-invoices/:grantUID`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(
        { ...defaultInvoice, ...body, uid: "new-invoice-uid" },
        { status: 201 }
      );
    }),
  ];
}

export function claimsErrorHandlers() {
  return [
    http.get(`${BASE}/v2/grant-agreements/:grantUID`, () =>
      HttpResponse.json({ error: "Agreement not found" }, { status: 404 })
    ),

    http.post(`${BASE}/v2/milestone-invoices/:grantUID`, () =>
      HttpResponse.json({ error: "Validation failed" }, { status: 400 })
    ),
  ];
}
