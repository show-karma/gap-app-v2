/**
 * MSW integration tests for useCommunityMetrics hook.
 *
 * The hook uses useParams() from next/navigation to get communityId,
 * then fetches via getCommunityMetrics which calls fetchData (axios)
 * against /v2/communities/:slug/community-metrics.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useCommunityMetrics } from "@/hooks/useCommunityMetrics";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

// Mock next/navigation useParams to return a communityId
vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: "ethereum-foundation" }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/test",
  useSearchParams: () => new URLSearchParams(),
}));

installMswLifecycle();

describe("useCommunityMetrics (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() => useCommunityMetrics());
    expect(result.current.isLoading).toBe(true);
  });

  it("returns metrics on success", async () => {
    server.use(
      http.get("*/v2/communities/:slug/community-metrics", () =>
        HttpResponse.json({
          metrics: [
            {
              metricName: "total_projects",
              value: 45,
              timestamp: "2024-06-01T00:00:00.000Z",
            },
            {
              metricName: "total_funding",
              value: 1250000,
              timestamp: "2024-06-01T00:00:00.000Z",
            },
          ],
        })
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });

  it("returns null on 404 (endpoint may not exist)", async () => {
    server.use(
      http.get("*/v2/communities/:slug/community-metrics", () =>
        HttpResponse.json({ message: "Not Found" }, { status: 404 })
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // getCommunityMetrics returns null on 404 gracefully
    expect(result.current.data).toBeNull();
  });

  it("returns null on 500 (graceful error handling)", async () => {
    server.use(
      http.get("*/v2/communities/:slug/community-metrics", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // getCommunityMetrics returns null on all errors
    expect(result.current.data).toBeNull();
  });

  it("handles empty metrics", async () => {
    server.use(
      http.get("*/v2/communities/:slug/community-metrics", () => HttpResponse.json({ metrics: [] }))
    );

    const { result } = renderHookWithProviders(() => useCommunityMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
