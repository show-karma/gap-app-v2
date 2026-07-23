import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/__tests__/utils/render";
import type { DashboardAdminCommunity } from "@/hooks/useDashboardAdmin";
import type { FundingProgram } from "@/services/fundingPlatformService";

const mockGetReviewerInbox = vi.fn();
vi.mock("@/services/reviewerInboxService", () => ({
  getReviewerInbox: (...args: unknown[]) => mockGetReviewerInbox(...args),
}));

import { useReviewsSummary } from "@/components/Pages/Dashboard/v3/useReviewsSummary";

const program = (slug: string, name: string): FundingProgram =>
  ({
    programId: `${slug}-p`,
    communitySlug: slug,
    communityName: name,
  }) as unknown as FundingProgram;

const stats = (action: number) => ({
  items: [],
  pagination: null,
  stats: { action, waiting: 0, done: 0 },
});

describe("useReviewsSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is empty when the user reviews in no communities", () => {
    const { result } = renderHookWithProviders(() => useReviewsSummary([], [], true));
    expect(result.current.status).toBe("empty");
    expect(mockGetReviewerInbox).not.toHaveBeenCalled();
  });

  it("counts the inbox's actionable items, not a metrics number", async () => {
    mockGetReviewerInbox.mockImplementation((communityId: string) =>
      Promise.resolve(stats(communityId === "filecoin" ? 4 : 1))
    );

    const { result } = renderHookWithProviders(() =>
      useReviewsSummary(
        [program("filecoin", "Filecoin"), program("optimism", "Optimism")],
        [],
        true
      )
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));
    // big = total actionable across communities (4 + 1); rows sorted by count.
    expect(result.current.summary?.big).toBe(5);
    expect(result.current.summary?.rows[0]).toMatchObject({
      label: "Filecoin",
      badge: { tone: "amber", label: "4 to review" },
    });
    expect(result.current.summary?.rows[1].label).toBe("Optimism");
  });

  it("hides communities with zero actionable items", async () => {
    mockGetReviewerInbox.mockResolvedValue(stats(0));

    const { result } = renderHookWithProviders(() =>
      useReviewsSummary([program("filecoin", "Filecoin")], [], true)
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.summary?.big).toBe(0);
    expect(result.current.summary?.rows).toHaveLength(0);
  });

  it("does not fetch until enabled", () => {
    const admin = {
      uid: "0x1",
      name: "Optimism",
      slug: "optimism",
      chainID: 10,
      pendingApplicationsCount: 3,
    } as DashboardAdminCommunity;

    renderHookWithProviders(() => useReviewsSummary([], [admin], false));
    expect(mockGetReviewerInbox).not.toHaveBeenCalled();
  });
});
