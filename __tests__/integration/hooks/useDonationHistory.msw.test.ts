/**
 * MSW integration tests for useDonationHistory hook.
 *
 * The hook fetches the current user's donation history via
 * donationsService.getMyDonations which uses an authenticated
 * axios client against /v2/donations/me.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useDonationHistory } from "@/hooks/donation/useDonationHistory";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

// The donations service uses createAuthenticatedApiClient which
// internally calls TokenManager. We also need to mock the api-client
// factory so it returns a plain axios instance (MSW intercepts it).
vi.mock("@/utilities/auth/api-client", () => {
  const axios = require("axios");
  return {
    createAuthenticatedApiClient: (baseURL: string, timeout: number) =>
      axios.create({ baseURL, timeout }),
  };
});

installMswLifecycle();

describe("useDonationHistory (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() => useDonationHistory());
    expect(result.current.isLoading).toBe(true);
  });

  it("returns donation history on success", async () => {
    server.use(
      http.get("*/v2/donations/me", () =>
        HttpResponse.json([
          {
            uid: "donation-001",
            chainId: 1,
            projectId: "proj-001",
            amount: "100",
            tokenSymbol: "USDC",
            status: "confirmed",
            txHash: "0xabc123",
            createdAt: "2024-07-01T10:00:00.000Z",
          },
          {
            uid: "donation-002",
            chainId: 1,
            projectId: "proj-002",
            amount: "50",
            tokenSymbol: "ETH",
            status: "confirmed",
            txHash: "0xdef456",
            createdAt: "2024-07-02T10:00:00.000Z",
          },
        ])
      )
    );

    const { result } = renderHookWithProviders(() => useDonationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].uid).toBe("donation-001");
  });

  it("returns error on 401", async () => {
    server.use(
      http.get("*/v2/donations/me", () =>
        HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    );

    const { result } = renderHookWithProviders(() => useDonationHistory());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("returns error on 500", async () => {
    server.use(
      http.get("*/v2/donations/me", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      )
    );

    const { result } = renderHookWithProviders(() => useDonationHistory());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("handles empty donations list", async () => {
    server.use(http.get("*/v2/donations/me", () => HttpResponse.json([])));

    const { result } = renderHookWithProviders(() => useDonationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it("does not fetch when disabled", () => {
    const { result } = renderHookWithProviders(() => useDonationHistory({ enabled: false }));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
  });
});
