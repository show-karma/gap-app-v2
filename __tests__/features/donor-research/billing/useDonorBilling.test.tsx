/**
 * @file Tests for donor-research billing hooks (entitlement, checkout, portal).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

import {
  donorEntitlementQueryKey,
  useDonorEntitlement,
  useDonorPlanCatalog,
  useOpenBillingPortal,
  useStartCheckout,
} from "@/hooks/useDonorBilling";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

const mockFetchData = vi.mocked(fetchData);

const ENTITLEMENT = {
  advisorId: "advisor-1",
  plan: "starter",
  planLabel: "Nonprofit Research — Starter",
  status: "active",
  reportsIncluded: 5,
  reportsUsed: 2,
  freeReportsGranted: 2,
  freeReportsUsed: 2,
  reportsRemaining: 3,
  canCreateReport: true,
  currentPeriodStart: "2026-08-01T00:00:00.000Z",
  currentPeriodEnd: "2026-09-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  hasBillingAccount: true,
  billingEnabled: true,
};

const buildClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

const wrapper =
  (qc: QueryClient) =>
  ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );

describe("useDonorEntitlement", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = buildClient();
  });
  afterEach(() => qc.clear());

  it("loads the advisor's remaining allowance", async () => {
    mockFetchData.mockResolvedValue([ENTITLEMENT, null, null, 200]);

    const { result } = renderHook(() => useDonorEntitlement(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.reportsRemaining).toBe(3);
    expect(mockFetchData).toHaveBeenCalledWith(INDEXER.DONOR_RESEARCH.BILLING_SUBSCRIPTION);
  });

  it("surfaces an error state rather than empty data", async () => {
    mockFetchData.mockResolvedValue([null, "Failed", null, 500]);

    const { result } = renderHook(() => useDonorEntitlement(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("skips the request when disabled", async () => {
    const { result } = renderHook(() => useDonorEntitlement({ enabled: false }), {
      wrapper: wrapper(qc),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetchData).not.toHaveBeenCalled();
  });
});

describe("useDonorPlanCatalog", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = buildClient();
  });
  afterEach(() => qc.clear());

  it("requests the public catalog unauthenticated", async () => {
    mockFetchData.mockResolvedValue([
      { freeSignupReportGrant: 2, billingEnabled: true, plans: [] },
      null,
      null,
      200,
    ]);

    const { result } = renderHook(() => useDonorPlanCatalog(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // 6th positional arg is `isAuthorized` — false so a logged-out visitor on
    // the marketing page doesn't trip the Privy token path.
    expect(mockFetchData).toHaveBeenCalledWith(
      INDEXER.DONOR_RESEARCH.BILLING_PLANS,
      "GET",
      {},
      {},
      {},
      false
    );
  });
});

describe("useStartCheckout", () => {
  let qc: QueryClient;
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = buildClient();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "https://gap.karmahq.xyz", href: "" },
    });
  });

  afterEach(() => {
    qc.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("sends absolute return URLs on this origin and redirects to Stripe", async () => {
    mockFetchData.mockResolvedValue([
      { url: "https://checkout.stripe.com/c/pay/cs_1", sessionId: "cs_1" },
      null,
      null,
      201,
    ]);

    const { result } = renderHook(() => useStartCheckout(), { wrapper: wrapper(qc) });
    result.current.mutate({ plan: "starter" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetchData).toHaveBeenCalledWith(INDEXER.DONOR_RESEARCH.BILLING_CHECKOUT, "POST", {
      plan: "starter",
      successUrl: "https://gap.karmahq.xyz/nonprofit-research/billing?checkout=success",
      cancelUrl: "https://gap.karmahq.xyz/nonprofit-research/billing?checkout=cancel",
    });
    expect(window.location.href).toBe("https://checkout.stripe.com/c/pay/cs_1");
  });

  it("invalidates the cached entitlement so the return trip re-reads it", async () => {
    qc.setQueryData(donorEntitlementQueryKey, ENTITLEMENT);
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    mockFetchData.mockResolvedValue([{ url: "https://checkout" }, null, null, 201]);

    const { result } = renderHook(() => useStartCheckout(), { wrapper: wrapper(qc) });
    result.current.mutate({ plan: "pro" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: donorEntitlementQueryKey });
  });

  it("surfaces a checkout failure without navigating", async () => {
    mockFetchData.mockResolvedValue([null, "Billing not configured", null, 503]);

    const { result } = renderHook(() => useStartCheckout(), { wrapper: wrapper(qc) });
    result.current.mutate({ plan: "starter" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Billing not configured");
    expect(window.location.href).toBe("");
  });
});

describe("useOpenBillingPortal", () => {
  let qc: QueryClient;
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = buildClient();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "https://gap.karmahq.xyz", href: "" },
    });
  });

  afterEach(() => {
    qc.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("opens the Stripe portal with a return URL on this origin", async () => {
    mockFetchData.mockResolvedValue([
      { url: "https://billing.stripe.com/session/abc" },
      null,
      null,
      201,
    ]);

    const { result } = renderHook(() => useOpenBillingPortal(), { wrapper: wrapper(qc) });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchData).toHaveBeenCalledWith(INDEXER.DONOR_RESEARCH.BILLING_PORTAL, "POST", {
      returnUrl: "https://gap.karmahq.xyz/nonprofit-research/billing?portal=return",
    });
    expect(window.location.href).toBe("https://billing.stripe.com/session/abc");
  });
});
