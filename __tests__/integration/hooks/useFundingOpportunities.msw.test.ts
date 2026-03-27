/**
 * MSW integration tests for useFundingOpportunities hook.
 *
 * The hook is an infinite query that fetches funding programs via
 * fundingProgramsService.getAll which calls fetchData (axios)
 * against /v2/program-registry/search.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useFundingOpportunities } from "@/hooks/useFundingOpportunities";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

installMswLifecycle();

const COMMUNITY_UID = "community-uid-001";

describe("useFundingOpportunities (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() =>
      useFundingOpportunities({ communityUid: COMMUNITY_UID })
    );
    expect(result.current.isLoading).toBe(true);
  });

  it("returns funding programs on success", async () => {
    server.use(
      http.get("*/v2/program-registry/search", () =>
        HttpResponse.json({
          programs: [
            {
              programId: "prog-001",
              name: "Open Source Grants",
              status: "Active",
              metadata: { description: "Fund open source" },
            },
          ],
          count: 1,
          totalPages: 1,
        })
      )
    );

    const { result } = renderHookWithProviders(() =>
      useFundingOpportunities({ communityUid: COMMUNITY_UID })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.pages).toHaveLength(1);
    expect(result.current.data!.pages[0].programs).toHaveLength(1);
    expect(result.current.data!.pages[0].programs[0].name).toBe("Open Source Grants");
  });

  it("returns error on 500", async () => {
    server.use(
      http.get("*/v2/program-registry/search", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      )
    );

    const { result } = renderHookWithProviders(() =>
      useFundingOpportunities({ communityUid: COMMUNITY_UID })
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("handles empty programs list", async () => {
    server.use(
      http.get("*/v2/program-registry/search", () =>
        HttpResponse.json({
          programs: [],
          count: 0,
          totalPages: 0,
        })
      )
    );

    const { result } = renderHookWithProviders(() =>
      useFundingOpportunities({ communityUid: COMMUNITY_UID })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data!.pages[0].programs).toEqual([]);
    expect(result.current.data!.pages[0].count).toBe(0);
  });

  it("does not fetch when communityUid is empty", () => {
    const { result } = renderHookWithProviders(() => useFundingOpportunities({ communityUid: "" }));
    // enabled: enabled && !!communityUid is false
    expect(result.current.isLoading).toBe(false);
  });

  it("does not fetch when disabled", () => {
    const { result } = renderHookWithProviders(() =>
      useFundingOpportunities({
        communityUid: COMMUNITY_UID,
        enabled: false,
      })
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
  });
});
