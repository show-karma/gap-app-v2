import { act, waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/__tests__/utils/render";
import type { IMilestoneActionItem } from "@/types/funding-platform";

const service = vi.hoisted(() => ({
  getMilestoneActionItems: vi.fn(),
  createMilestoneActionItem: vi.fn(),
  updateMilestoneActionItem: vi.fn(),
  deleteMilestoneActionItem: vi.fn(),
}));

vi.mock("@/services/milestoneActionItemsService", () => service);

import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import { useMilestoneActionItems } from "@/hooks/useMilestoneActionItems";

const COMMUNITY = "filecoin";
const MILESTONE = "0xabc";

const makeItem = (overrides: Partial<IMilestoneActionItem> = {}): IMilestoneActionItem => ({
  id: "item-1",
  milestoneUID: MILESTONE,
  grantUID: "grant-1",
  communityUID: "community-1",
  programId: "774",
  content: "Emailed the team",
  followUpAt: null,
  completedAt: null,
  completedByAddress: null,
  createdByAddress: "0x1",
  createdByName: "art",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

describe("useMilestoneActionItems", () => {
  let serverItems: IMilestoneActionItem[];

  beforeEach(() => {
    vi.clearAllMocks();
    serverItems = [makeItem()];
    service.getMilestoneActionItems.mockImplementation(async () => serverItems);
  });

  it("should_prepend_an_optimistic_item_and_invalidate_the_inbox_on_create", async () => {
    let resolveCreate: (value: IMilestoneActionItem) => void = () => {};
    service.createMilestoneActionItem.mockReturnValue(
      new Promise<IMilestoneActionItem>((resolve) => {
        resolveCreate = resolve;
      })
    );

    const { result, queryClient } = renderHookWithProviders(() =>
      useMilestoneActionItems(COMMUNITY, MILESTONE)
    );
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    act(() => {
      result.current.createItem({ content: "Pinged on Slack", followUpAt: null });
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items[0].content).toBe("Pinged on Slack");
    expect(result.current.items[0].id).toMatch(/^optimistic-/);

    await act(async () => {
      const created = makeItem({ id: "item-2", content: "Pinged on Slack" });
      serverItems = [created, ...serverItems];
      resolveCreate(created);
    });

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["reviewer-inbox", COMMUNITY] })
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.milestoneActionItems(COMMUNITY, MILESTONE),
    });
  });

  it("should_restore_the_previous_list_when_create_fails", async () => {
    service.createMilestoneActionItem.mockRejectedValue(new Error("boom"));

    const { result } = renderHookWithProviders(() => useMilestoneActionItems(COMMUNITY, MILESTONE));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      result.current.createItem({ content: "will fail", followUpAt: null });
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].id).toBe("item-1");
  });

  it("should_mark_an_item_done_optimistically_and_reopen_it", async () => {
    service.updateMilestoneActionItem.mockImplementation(
      async (_community: string, id: string, input: { completed?: boolean }) => {
        const updated = makeItem({
          id,
          completedAt: input.completed ? "2026-09-21T12:00:00.000Z" : null,
        });
        serverItems = serverItems.map((item) => (item.id === id ? updated : item));
        return updated;
      }
    );

    const { result } = renderHookWithProviders(() => useMilestoneActionItems(COMMUNITY, MILESTONE));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.updateItem({ id: "item-1", input: { completed: true } });
    });
    await waitFor(() => expect(result.current.items[0].completedAt).not.toBeNull());
    expect(service.updateMilestoneActionItem).toHaveBeenCalledWith(COMMUNITY, "item-1", {
      completed: true,
    });

    act(() => {
      result.current.updateItem({ id: "item-1", input: { completed: false } });
    });
    await waitFor(() => expect(result.current.items[0].completedAt).toBeNull());
  });

  it("should_remove_an_item_optimistically_on_delete", async () => {
    service.deleteMilestoneActionItem.mockImplementation(async (_community: string, id: string) => {
      serverItems = serverItems.filter((item) => item.id !== id);
    });

    const { result } = renderHookWithProviders(() => useMilestoneActionItems(COMMUNITY, MILESTONE));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.deleteItem("item-1");
    });

    await waitFor(() => expect(result.current.items).toHaveLength(0));
    expect(service.deleteMilestoneActionItem).toHaveBeenCalledWith(COMMUNITY, "item-1");
  });
});
