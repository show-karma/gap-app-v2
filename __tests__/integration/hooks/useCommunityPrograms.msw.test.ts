/**
 * MSW integration tests for useCommunityPrograms hook (exported from usePrograms.ts).
 *
 * The hook fetches programs via programService.getCommunityPrograms which
 * calls fetchData (axios) against /communities/:communityId/programs.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

installMswLifecycle();

const COMMUNITY_ID = "community-uid-001";

describe("useCommunityPrograms (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() => useCommunityPrograms(COMMUNITY_ID));
    expect(result.current.isLoading).toBe(true);
  });

  it("returns programs on success", async () => {
    server.use(
      http.get("*/communities/:id/programs", () =>
        HttpResponse.json([
          {
            uid: "prog-001",
            name: "Open Source Grants",
            description: "Funding open source projects",
            status: "active",
          },
          {
            uid: "prog-002",
            name: "Research Grants",
            description: "Funding research",
            status: "active",
          },
        ])
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityPrograms(COMMUNITY_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].name).toBe("Open Source Grants");
  });

  it("returns error on 500", async () => {
    server.use(
      http.get("*/communities/:id/programs", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityPrograms(COMMUNITY_ID));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("handles empty programs list", async () => {
    server.use(http.get("*/communities/:id/programs", () => HttpResponse.json([])));

    const { result } = renderHookWithProviders(() => useCommunityPrograms(COMMUNITY_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it("does not fetch when communityId is empty", () => {
    const { result } = renderHookWithProviders(() => useCommunityPrograms(""));
    // enabled: !!communityId is false
    expect(result.current.isLoading).toBe(false);
  });

  it("does not fetch when disabled", () => {
    const { result } = renderHookWithProviders(() =>
      useCommunityPrograms(COMMUNITY_ID, { enabled: false })
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
  });
});
