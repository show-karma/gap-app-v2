import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLastKnownGrant } from "@/components/Pages/Admin/ControlCenter/useGrantDetailsModal";

const rows = [{ grantUid: "a" }, { grantUid: "b" }];

describe("useLastKnownGrant", () => {
  it("should_return_null_when_no_grant_is_selected", () => {
    const { result } = renderHook(() => useLastKnownGrant(null, rows));

    expect(result.current).toBeNull();
  });

  it("should_return_the_live_row_when_present", () => {
    const { result } = renderHook(() => useLastKnownGrant("b", rows));

    expect(result.current).toBe(rows[1]);
  });

  it("should_keep_the_last_known_row_when_it_leaves_the_current_page", () => {
    const { result, rerender } = renderHook(({ r }) => useLastKnownGrant("b", r), {
      initialProps: { r: rows },
    });

    rerender({ r: [{ grantUid: "a" }] });

    expect(result.current).toBe(rows[1]);
  });

  it("should_clear_the_snapshot_when_selection_is_cleared", () => {
    const { result, rerender } = renderHook(({ uid }) => useLastKnownGrant(uid, rows), {
      initialProps: { uid: "b" as string | null },
    });

    rerender({ uid: null });

    expect(result.current).toBeNull();
  });
});
