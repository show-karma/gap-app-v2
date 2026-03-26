/**
 * MSW integration tests for useCommunities hook.
 *
 * The hook fetches a paginated community list via an infinite query
 * using fetchData (axios) against /v2/communities/.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useCommunities } from "@/hooks/useCommunities";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

// TokenManager must be mocked so fetchData skips real Privy token retrieval
vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

installMswLifecycle();

describe("useCommunities (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() => useCommunities());
    expect(result.current.isLoading).toBe(true);
  });

  it("returns paginated community data on success", async () => {
    // Override the default handler with a response shape the hook expects
    server.use(
      http.get("*/v2/communities/", () =>
        HttpResponse.json({
          payload: [
            {
              uid: "c1",
              chainID: 1,
              details: {
                name: "Test Community",
                description: "A test community",
                logoUrl: "https://example.com/logo.png",
                slug: "test-community",
              },
              stats: { totalProjects: 10, totalGrants: 5, totalMembers: 100 },
              createdAt: "2024-01-01T00:00:00.000Z",
              updatedAt: "2024-01-01T00:00:00.000Z",
            },
          ],
          pagination: {
            totalCount: 1,
            totalPages: 1,
            page: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        })
      )
    );

    const { result } = renderHookWithProviders(() => useCommunities());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.pages).toHaveLength(1);
    expect(result.current.data!.pages[0].payload).toHaveLength(1);
    expect(result.current.data!.pages[0].payload[0].details.name).toBe("Test Community");
  });

  it("returns error on 500", async () => {
    server.use(
      http.get("*/v2/communities/", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      )
    );

    const { result } = renderHookWithProviders(() => useCommunities());

    // The hook specifies retry: 2 which overrides the query client default.
    // We need to wait long enough for all retries to exhaust.
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 10000 }
    );
  });

  it("handles empty response", async () => {
    server.use(
      http.get("*/v2/communities/", () =>
        HttpResponse.json({
          payload: [],
          pagination: {
            totalCount: 0,
            totalPages: 0,
            page: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        })
      )
    );

    const { result } = renderHookWithProviders(() => useCommunities());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data!.pages[0].payload).toEqual([]);
  });
});
