/**
 * MSW integration tests for useCommunityProjectUpdates hook.
 *
 * The hook fetches project updates via fetchCommunityProjectUpdates service
 * which uses native fetch() against /v2/communities/:id/project-updates.
 * MSW intercepts native fetch as well.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useCommunityProjectUpdates } from "@/hooks/useCommunityProjectUpdates";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

installMswLifecycle();

const COMMUNITY_ID = "community-uid-001";

describe("useCommunityProjectUpdates (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() => useCommunityProjectUpdates(COMMUNITY_ID));
    expect(result.current.isLoading).toBe(true);
  });

  it("returns project updates on success", async () => {
    server.use(
      http.get("*/v2/communities/:id/project-updates", () =>
        HttpResponse.json(
          {
            updates: [
              {
                uid: "update-001",
                projectTitle: "DeFi Dashboard",
                title: "Q1 Progress Report",
                createdAt: "2024-03-15T10:00:00.000Z",
              },
            ],
            pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
          },
          {
            headers: { "content-type": "application/json" },
          }
        )
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityProjectUpdates(COMMUNITY_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.updates).toHaveLength(1);
    expect(result.current.data!.updates[0].title).toBe("Q1 Progress Report");
  });

  it("returns error on 500", async () => {
    server.use(
      http.get("*/v2/communities/:id/project-updates", () =>
        HttpResponse.json(
          { message: "Internal Server Error" },
          { status: 500, headers: { "content-type": "application/json" } }
        )
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityProjectUpdates(COMMUNITY_ID));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("handles empty updates", async () => {
    server.use(
      http.get("*/v2/communities/:id/project-updates", () =>
        HttpResponse.json(
          {
            updates: [],
            pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
          },
          {
            headers: { "content-type": "application/json" },
          }
        )
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityProjectUpdates(COMMUNITY_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data!.updates).toEqual([]);
  });

  it("does not fetch when communityId is empty", () => {
    const { result } = renderHookWithProviders(() => useCommunityProjectUpdates(""));
    // enabled: !!communityId is false
    expect(result.current.isLoading).toBe(false);
  });
});
