/**
 * @file Tests for credit hooks (balance + Stripe redirect).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ authenticated: true })),
}));

import {
  useCredits,
  usePurchaseCredits,
} from "@/src/features/standalone-evaluation/hooks/useCredits";
import fetchData from "@/utilities/fetchData";

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

describe("useCredits", () => {
  let qc: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks();
    qc = buildClient();
  });
  afterEach(() => qc.clear());

  it("fetches the credit balance", async () => {
    (fetchData as vi.Mock).mockResolvedValueOnce([
      { balance: 42, totalPurchased: 100, totalUsed: 58, recentTransactions: [] },
      null,
      null,
      200,
    ]);

    const { result } = renderHook(() => useCredits(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.balance).toBe(42);
    expect(fetchData).toHaveBeenCalledWith("/v2/evaluate/credits", "GET");
  });
});

describe("usePurchaseCredits", () => {
  let qc: QueryClient;
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = buildClient();
    originalLocation = window.location;
    // Stripe redirect sets window.location.href directly. Stub it so we can assert.
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, href: "" },
    });
  });
  afterEach(() => {
    qc.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("redirects the browser to the Stripe checkout URL", async () => {
    (fetchData as vi.Mock).mockResolvedValueOnce([
      { url: "https://checkout.stripe.com/abc", sessionId: "cs_123" },
      null,
      null,
      201,
    ]);

    const { result } = renderHook(() => usePurchaseCredits(), {
      wrapper: wrapper(qc),
    });

    result.current.mutate({ pack: "PACK_100" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchData).toHaveBeenCalledWith(
      "/v2/evaluate/credits/purchase",
      "POST",
      expect.objectContaining({
        pack: "PACK_100",
        successUrl: expect.stringContaining("/evaluate"),
        cancelUrl: expect.stringContaining("/evaluate"),
      })
    );
    expect(window.location.href).toBe("https://checkout.stripe.com/abc");
  });
});
