/**
 * MSW integration tests for useCommunityStats hook.
 *
 * The hook fetches global community stats via fetchData (axios)
 * against /v2/communities/stats and transforms the response into
 * an array of SummaryStats objects.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useCommunityStats } from "@/hooks/useCommunityStats";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

installMswLifecycle();

describe("useCommunityStats (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() => useCommunityStats());
    expect(result.current.isLoading).toBe(true);
  });

  it("returns transformed stats on success", async () => {
    server.use(
      http.get("*/v2/communities/stats", () =>
        HttpResponse.json({
          activeCommunities: 42,
          totalProjectUpdates: 1200,
          totalProjects: 350,
          totalGrants: 780,
        })
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data).toHaveLength(4);

    const titles = result.current.data!.map((s) => s.title);
    expect(titles).toEqual(["Active Communities", "Projects", "Grants Tracked", "Project Updates"]);

    const communityItem = result.current.data!.find((s) => s.title === "Active Communities");
    expect(communityItem!.value).toBe(42);
    expect(communityItem!.shouldRound).toBe(false);
  });

  it("returns error on 500", async () => {
    server.use(
      http.get("*/v2/communities/stats", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityStats());

    // The hook specifies retry: 2 which overrides the query client default.
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 10000 }
    );
  });

  it("returns error when response is null", async () => {
    server.use(http.get("*/v2/communities/stats", () => HttpResponse.json(null)));

    const { result } = renderHookWithProviders(() => useCommunityStats());

    // The hook specifies retry: 2 and null response triggers "No response received" error.
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 10000 }
    );
  });
});
