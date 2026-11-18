/**
 * `isUpdating` drives the activity feed's skeleton (UpdatesContent). It must
 * be set while the feed has nothing to show for the current query — the first
 * load and a filter change — but NOT during a background refresh of the feed
 * already on screen: after a save, that refresh would otherwise swap the feed
 * (and the dialog opened from one of its cards) for a skeleton mid-flow.
 */
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, renderHookWithProviders } from "@/__tests__/utils/render";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import type { UpdatesApiResponse } from "@/types/v2/roadmap";
import { refreshProjectQueries } from "@/utilities/queries/refreshProjectQueries";

const mockGetProjectUpdates = vi.fn();
vi.mock("@/services/project-updates.service", () => ({
  getProjectUpdates: (...args: unknown[]) => mockGetProjectUpdates(...args),
}));
vi.mock("@/services/project.service", () => ({
  getProject: vi.fn().mockResolvedValue({ uid: "0xproject", details: { slug: "my-project" } }),
}));
vi.mock("@/services/project-grants.service", () => ({
  getProjectGrants: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/services/project-impacts.service", () => ({
  getProjectImpacts: vi.fn().mockResolvedValue([]),
}));

const feed = (): UpdatesApiResponse => ({
  projectUpdates: [],
  projectMilestones: [],
  grantMilestones: [],
  grantUpdates: [],
});

/** A response the test releases by hand, to observe the in-flight state. */
function held() {
  let release: () => void = () => {};
  const promise = new Promise<UpdatesApiResponse>((resolve) => {
    release = () => resolve(feed());
  });
  return { promise, release };
}

describe("useProjectProfile — isUpdating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is set during the first load", async () => {
    const first = held();
    mockGetProjectUpdates.mockReturnValueOnce(first.promise);

    const { result } = renderHookWithProviders(() => useProjectProfile("my-project"));

    await waitFor(() => expect(result.current.isUpdating).toBe(true));
    act(() => first.release());
    await waitFor(() => expect(result.current.isUpdating).toBe(false));
  });

  it("is NOT set while the feed on screen is refreshed after a write", async () => {
    const queryClient = createTestQueryClient();
    mockGetProjectUpdates.mockResolvedValueOnce(feed());
    const { result } = renderHookWithProviders(() => useProjectProfile("my-project"), {
      queryClient,
    });
    await waitFor(() => expect(result.current.hasUpdatesData).toBe(true));

    const refresh = held();
    mockGetProjectUpdates.mockReturnValueOnce(refresh.promise);
    let refreshed: Promise<void> = Promise.resolve();
    act(() => {
      refreshed = refreshProjectQueries(queryClient, {
        identifiers: ["my-project"],
        families: ["project-updates"],
      });
    });

    await waitFor(() => expect(mockGetProjectUpdates).toHaveBeenCalledTimes(2));
    expect(result.current.isUpdating).toBe(false);
    await act(async () => {
      refresh.release();
      await refreshed;
    });
  });

  it("is set while a filter change has only the previous filter's items", async () => {
    let status: "completed" | undefined;
    mockGetProjectUpdates.mockResolvedValueOnce(feed());
    const { result, rerender } = renderHookWithProviders(() =>
      useProjectProfile("my-project", status)
    );
    await waitFor(() => expect(result.current.hasUpdatesData).toBe(true));

    const filtered = held();
    mockGetProjectUpdates.mockReturnValueOnce(filtered.promise);
    status = "completed";
    rerender();

    await waitFor(() => expect(result.current.isUpdating).toBe(true));
    act(() => filtered.release());
    await waitFor(() => expect(result.current.isUpdating).toBe(false));
  });
});
