/**
 * MSW integration tests for useCommunityProjects hook.
 *
 * The hook uses useParams() from next/navigation to get communityId,
 * then fetches via fetchData (axios) against
 * /v2/communities/:slug/projects.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useCommunityProjects } from "@/hooks/useCommunityProjects";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

// Mock next/navigation useParams to return a communityId
const mockCommunityId = "ethereum-foundation";
vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: mockCommunityId }),
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

describe("useCommunityProjects (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() => useCommunityProjects());
    expect(result.current.isLoading).toBe(true);
  });

  it("returns projects on success", async () => {
    server.use(
      http.get("*/v2/communities/:slug/projects", () =>
        HttpResponse.json({
          payload: [
            {
              uid: "proj-001",
              details: {
                title: "DeFi Protocol",
                slug: "defi-protocol",
              },
            },
            {
              uid: "proj-002",
              title: "NFT Marketplace",
              slug: "nft-marketplace",
            },
          ],
        })
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityProjects());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data).toHaveLength(2);
    // First project uses details.title
    expect(result.current.data![0].title).toBe("DeFi Protocol");
    // Second project falls back to direct title
    expect(result.current.data![1].title).toBe("NFT Marketplace");
  });

  it("returns error on 500", async () => {
    server.use(
      http.get("*/v2/communities/:slug/projects", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      )
    );

    const { result } = renderHookWithProviders(() => useCommunityProjects());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("handles empty projects list", async () => {
    server.use(
      http.get("*/v2/communities/:slug/projects", () => HttpResponse.json({ payload: [] }))
    );

    const { result } = renderHookWithProviders(() => useCommunityProjects());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it("passes programId filter when provided", async () => {
    let capturedUrl = "";
    server.use(
      http.get("*/v2/communities/:slug/projects", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ payload: [] });
      })
    );

    const { result } = renderHookWithProviders(() => useCommunityProjects("prog-001"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(capturedUrl).toContain("programIds=prog-001");
  });
});
