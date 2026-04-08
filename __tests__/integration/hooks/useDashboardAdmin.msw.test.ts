/**
 * MSW integration tests for useDashboardAdmin hook.
 *
 * The hook requires authentication (useAuth) and fetches admin communities
 * via /v2/user/communities/admin, then enriches each with metrics from
 * /v2/communities/:id/metrics.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

// Mock useAuth to provide authenticated state
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    authenticated: true,
    address: "0x1234567890abcdef1234567890abcdef12345678",
    ready: true,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn(),
    isConnected: true,
  }),
}));

// Mock useWhitelabel
vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => ({
    isWhitelabel: false,
    communitySlug: null,
    brandName: "Karma",
  }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

installMswLifecycle();

describe("useDashboardAdmin (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() => useDashboardAdmin());
    expect(result.current.isLoading).toBe(true);
  });

  it("returns admin communities on success", async () => {
    server.use(
      http.get("*/v2/user/communities/admin", () =>
        HttpResponse.json({
          communities: [
            {
              uid: "comm-001",
              chainID: 1,
              details: {
                name: "Ethereum Foundation",
                slug: "ethereum-foundation",
                description: "Supporting Ethereum",
                logoUrl: "https://example.com/logo.png",
                imageURL: null,
              },
            },
          ],
        })
      ),
      http.get("*/v2/communities/:id/metrics", () =>
        HttpResponse.json({
          totalPrograms: 5,
          enabledPrograms: 3,
          totalApplications: 100,
          approvedApplications: 45,
          rejectedApplications: 10,
          pendingApplications: 20,
          revisionRequestedApplications: 5,
          underReviewApplications: 20,
        })
      )
    );

    const { result } = renderHookWithProviders(() => useDashboardAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.communities).toHaveLength(1);
    expect(result.current.communities[0].name).toBe("Ethereum Foundation");
    expect(result.current.communities[0].activeProgramsCount).toBe(3);
    expect(result.current.communities[0].pendingApplicationsCount).toBe(20);
    expect(result.current.isError).toBe(false);
  });

  it("returns error when admin communities API fails", async () => {
    server.use(
      http.get("*/v2/user/communities/admin", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      )
    );

    const { result } = renderHookWithProviders(() => useDashboardAdmin());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("handles empty communities list", async () => {
    server.use(
      http.get("*/v2/user/communities/admin", () => HttpResponse.json({ communities: [] }))
    );

    const { result } = renderHookWithProviders(() => useDashboardAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.communities).toEqual([]);
  });

  it("gracefully handles metrics failure for individual community", async () => {
    server.use(
      http.get("*/v2/user/communities/admin", () =>
        HttpResponse.json({
          communities: [
            {
              uid: "comm-001",
              chainID: 1,
              details: {
                name: "Test Community",
                slug: "test-community",
                description: "Testing",
                logoUrl: null,
                imageURL: null,
              },
            },
          ],
        })
      ),
      http.get("*/v2/communities/:id/metrics", () =>
        HttpResponse.json({ message: "Metrics unavailable" }, { status: 500 })
      )
    );

    const { result } = renderHookWithProviders(() => useDashboardAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // The hook uses Promise.allSettled so individual metrics failures
    // still resolve the community with default counts of 0
    expect(result.current.communities).toHaveLength(1);
    expect(result.current.communities[0].activeProgramsCount).toBe(0);
    expect(result.current.communities[0].pendingApplicationsCount).toBe(0);
  });
});
