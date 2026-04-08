/**
 * MSW integration tests for useCommunityGrants hook.
 *
 * The hook fetches grants for a community via getCommunityGrants service
 * which calls fetchData (axios) against /v2/communities/:slug/grants.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useCommunityGrants } from "@/hooks/useCommunityGrants";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

installMswLifecycle();

const TEST_SLUG = "ethereum-foundation";

describe("useCommunityGrants (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() => useCommunityGrants(TEST_SLUG));
    expect(result.current.isLoading).toBe(true);
  });

  it("returns grants data on success", async () => {
    server.use(
      http.get("*/v2/communities/:slug/grants", () =>
        HttpResponse.json([
          {
            uid: "grant-001",
            title: "Infrastructure Grant",
            programId: "prog-001",
            projectTitle: "Builder DAO",
            categories: [{ id: "cat-1", name: "Infrastructure" }],
          },
        ])
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityGrants(TEST_SLUG));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.grants).toHaveLength(1);
    expect(result.current.grants[0].title).toBe("Infrastructure Grant");
    expect(result.current.error).toBeNull();
  });

  it("returns empty array on 500 (service returns [] on error)", async () => {
    server.use(
      http.get("*/v2/communities/:slug/grants", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityGrants(TEST_SLUG));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // The service catches errors and returns [] so the hook sees data, not error
    expect(result.current.grants).toEqual([]);
  });

  it("handles empty response", async () => {
    server.use(http.get("*/v2/communities/:slug/grants", () => HttpResponse.json([])));

    const { result } = renderHookWithProviders(() => useCommunityGrants(TEST_SLUG));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.grants).toEqual([]);
  });

  it("does not fetch when slug is empty", () => {
    const { result } = renderHookWithProviders(() => useCommunityGrants(""));
    // enabled: !!communitySlug is false, so the query stays idle
    expect(result.current.isLoading).toBe(false);
    expect(result.current.grants).toEqual([]);
  });
});
