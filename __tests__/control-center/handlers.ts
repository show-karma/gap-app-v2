/**
 * MSW handlers for Control Center tests.
 * Provides realistic API mocking for community payouts, agreement toggle,
 * invoice save, and payout config endpoints.
 */

import { delay, HttpResponse, http } from "msw";
import {
  createMockAgreement,
  createMockInvoice,
  createMockPayoutConfig,
  createMockPayoutsResponse,
  mockCommunity,
} from "./fixtures";

const GAP_INDEXER_URL = process.env.NEXT_PUBLIC_GAP_INDEXER_URL || "https://gap-indexer.vercel.app";

/**
 * Community details handler
 */
const communityDetailsHandler = http.get(
  `${GAP_INDEXER_URL}/communities/:communityId`,
  async () => {
    await delay(50);
    return HttpResponse.json(mockCommunity);
  }
);

/**
 * Community payouts handler
 */
const communityPayoutsHandler = http.get(
  `${GAP_INDEXER_URL}/community-payouts/:communityUID`,
  async () => {
    await delay(50);
    return HttpResponse.json(createMockPayoutsResponse());
  }
);

/**
 * Toggle agreement handler
 */
const toggleAgreementHandler = http.post(
  `${GAP_INDEXER_URL}/grant-agreement/toggle`,
  async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as {
      grantUID: string;
      signed: boolean;
      signedAt?: string;
    };
    return HttpResponse.json(
      createMockAgreement({
        signed: body.signed,
        signedAt: body.signed ? body.signedAt || new Date().toISOString() : null,
        signedBy: body.signed ? "0xAdmin1234567890abcdef1234567890abcdef" : null,
      })
    );
  }
);

/**
 * Save milestone invoices handler
 */
const saveMilestoneInvoicesHandler = http.post(
  `${GAP_INDEXER_URL}/grant-agreement/invoices`,
  async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as {
      grantUID: string;
      invoices: Array<{
        milestoneLabel: string;
        milestoneUID?: string | null;
        invoiceReceivedAt?: string | null;
      }>;
    };
    return HttpResponse.json({
      invoices: body.invoices.map((inv) =>
        createMockInvoice({
          milestoneLabel: inv.milestoneLabel,
          milestoneUID: inv.milestoneUID || null,
          invoiceReceivedAt: inv.invoiceReceivedAt || null,
          invoiceStatus: inv.invoiceReceivedAt ? "received" : "not_submitted",
        })
      ),
    });
  }
);

/**
 * Payout configs by community handler
 */
const payoutConfigsByCommunityHandler = http.get(
  `${GAP_INDEXER_URL}/payout-config/community/:communityUID`,
  async () => {
    await delay(50);
    return HttpResponse.json([createMockPayoutConfig()]);
  }
);

/**
 * Staff authorization handler (required by global mocks)
 */
const staffAuthHandler = http.get(`${GAP_INDEXER_URL}/auth/staff/authorized`, async () => {
  await delay(50);
  return HttpResponse.json({ authorized: true });
});

/**
 * KYC config handler
 */
const kycConfigHandler = http.get(`${GAP_INDEXER_URL}/kyc/config/:communityUID`, async () => {
  await delay(50);
  return HttpResponse.json({ enabled: false });
});

/**
 * KYC batch statuses handler
 */
const kycBatchStatusesHandler = http.post(`${GAP_INDEXER_URL}/kyc/batch-status`, async () => {
  await delay(50);
  return HttpResponse.json({ statuses: {} });
});

/**
 * Default handlers for control center tests
 */
export const handlers = [
  communityDetailsHandler,
  communityPayoutsHandler,
  toggleAgreementHandler,
  saveMilestoneInvoicesHandler,
  payoutConfigsByCommunityHandler,
  staffAuthHandler,
  kycConfigHandler,
  kycBatchStatusesHandler,
];

/**
 * Factory for creating custom community payouts handler
 */
export function createPayoutsHandler(
  responseFactory: () => ReturnType<typeof createMockPayoutsResponse>,
  statusCode = 200
) {
  return http.get(`${GAP_INDEXER_URL}/community-payouts/:communityUID`, async () => {
    await delay(50);
    if (statusCode !== 200) {
      return new HttpResponse(JSON.stringify({ error: "Request failed" }), { status: statusCode });
    }
    return HttpResponse.json(responseFactory());
  });
}

/**
 * Factory for creating a failing toggle agreement handler
 */
export function createFailingToggleAgreementHandler(statusCode = 500) {
  return http.post(`${GAP_INDEXER_URL}/grant-agreement/toggle`, async () => {
    await delay(50);
    return new HttpResponse(JSON.stringify({ error: "Server error" }), { status: statusCode });
  });
}

export { http, HttpResponse, delay };
