/**
 * Tests for useMilestonesAdminRefetch.
 *
 * Two refresh triggers:
 *   1. `document.visibilitychange` → refetch when document becomes
 *      visible.
 *   2. `setInterval(refetch, intervalMs)` → periodic poll.
 *
 * Both gated by `isActive`. Cleanup must tear down both on unmount or
 * isActive flipping false.
 */

import { act, renderHook } from "@testing-library/react";
import { useMilestonesAdminRefetch } from "@/src/features/applications/hooks/use-milestones-admin-refetch";

function setDocumentVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useMilestonesAdminRefetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should_be_a_noop_when_isActive_is_false", () => {
    const refetch = vi.fn();
    renderHook(() => useMilestonesAdminRefetch({ isActive: false, refetch }));

    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    setDocumentVisibility("visible");

    expect(refetch).not.toHaveBeenCalled();
  });

  it("should_refetch_when_document_becomes_visible_and_isActive_is_true", () => {
    const refetch = vi.fn();
    renderHook(() => useMilestonesAdminRefetch({ isActive: true, refetch }));

    setDocumentVisibility("hidden");
    setDocumentVisibility("visible");

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("should_not_refetch_when_visibility_flips_to_hidden", () => {
    const refetch = vi.fn();
    renderHook(() => useMilestonesAdminRefetch({ isActive: true, refetch }));

    setDocumentVisibility("hidden");

    expect(refetch).not.toHaveBeenCalled();
  });

  it("should_refetch_every_interval_while_isActive", () => {
    const refetch = vi.fn();
    renderHook(() => useMilestonesAdminRefetch({ isActive: true, refetch, intervalMs: 5_000 }));

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(refetch).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(refetch).toHaveBeenCalledTimes(4);
  });

  it("should_stop_polling_when_isActive_flips_to_false", () => {
    const refetch = vi.fn();
    const { rerender } = renderHook(
      ({ isActive }: { isActive: boolean }) =>
        useMilestonesAdminRefetch({ isActive, refetch, intervalMs: 5_000 }),
      { initialProps: { isActive: true } }
    );

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(refetch).toHaveBeenCalledTimes(1);

    rerender({ isActive: false });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("should_remove_visibility_listener_on_unmount", () => {
    const refetch = vi.fn();
    const { unmount } = renderHook(() => useMilestonesAdminRefetch({ isActive: true, refetch }));

    unmount();
    setDocumentVisibility("hidden");
    setDocumentVisibility("visible");

    expect(refetch).not.toHaveBeenCalled();
  });
});
