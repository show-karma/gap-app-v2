/**
 * MSW integration tests for useCategories hook.
 *
 * The hook fetches categories via fetchData (axios)
 * against /communities/:idOrSlug/categories.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useCategories } from "@/hooks/useCategories";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

installMswLifecycle();

const COMMUNITY_ID = "community-uid-001";

describe("useCategories (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() => useCategories(COMMUNITY_ID));
    expect(result.current.isLoading).toBe(true);
  });

  it("returns sorted categories on success", async () => {
    server.use(
      http.get("*/communities/:id/categories", () =>
        HttpResponse.json([
          { id: "cat-2", name: "Infrastructure" },
          { id: "cat-1", name: "Community Building" },
          { id: "cat-3", name: "Tooling" },
        ])
      )
    );

    const { result } = renderHookWithProviders(() => useCategories(COMMUNITY_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    // The hook sorts by name using localeCompare
    expect(result.current.data!.map((c) => c.name)).toEqual([
      "Community Building",
      "Infrastructure",
      "Tooling",
    ]);
  });

  it("returns error on 500", async () => {
    server.use(
      http.get("*/communities/:id/categories", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      )
    );

    const { result } = renderHookWithProviders(() => useCategories(COMMUNITY_ID));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("handles empty categories", async () => {
    server.use(http.get("*/communities/:id/categories", () => HttpResponse.json([])));

    const { result } = renderHookWithProviders(() => useCategories(COMMUNITY_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it("does not fetch when communityId is the zero UID", () => {
    const zeroUID = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const { result } = renderHookWithProviders(() => useCategories(zeroUID));
    // enabled: !!communityId && communityId !== zeroUID is false
    expect(result.current.isLoading).toBe(false);
  });

  it("does not fetch when communityId is empty", () => {
    const { result } = renderHookWithProviders(() => useCategories(""));
    expect(result.current.isLoading).toBe(false);
  });
});
