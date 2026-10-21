import { act, waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/__tests__/utils/render";
import { useQueueSummary } from "@/hooks/useQueueSummary";

const service = vi.hoisted(() => ({ getQueueItemSummary: vi.fn() }));
vi.mock("@/services/milestoneActionItemsService", () => service);

const brief = (summary: string, cached = false) => ({
  summary,
  generatedAt: "2024-03-10T12:00:00.000Z",
  cached,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useQueueSummary", () => {
  it("should_fetch_the_brief_for_the_target", async () => {
    service.getQueueItemSummary.mockResolvedValue(brief("First brief.", true));

    const { result } = renderHookWithProviders(() =>
      useQueueSummary("filecoin", { kind: "application", id: "APP-1" })
    );

    await waitFor(() => expect(result.current.summary?.summary).toBe("First brief."));
    expect(service.getQueueItemSummary).toHaveBeenCalledWith("filecoin", {
      kind: "application",
      id: "APP-1",
    });
  });

  it("should_swap_in_the_rewritten_brief", async () => {
    service.getQueueItemSummary
      .mockResolvedValueOnce(brief("First brief.", true))
      .mockResolvedValueOnce(brief("Fresh brief."));

    const { result } = renderHookWithProviders(() =>
      useQueueSummary("filecoin", { kind: "milestone", id: "ms-1" })
    );
    await waitFor(() => expect(result.current.summary?.summary).toBe("First brief."));

    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.summary?.summary).toBe("Fresh brief."));
    expect(service.getQueueItemSummary).toHaveBeenLastCalledWith(
      "filecoin",
      { kind: "milestone", id: "ms-1" },
      { refresh: true }
    );
  });

  it("should_not_fetch_without_a_target", () => {
    renderHookWithProviders(() => useQueueSummary("filecoin", undefined));

    expect(service.getQueueItemSummary).not.toHaveBeenCalled();
  });
});
