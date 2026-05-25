import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Stateful nuqs mock: each query key is backed by its own useState so the
// hook's real wiring (sort cycling, clear-on-cards) is exercised.
vi.mock("nuqs", () => ({
  useQueryState: (_key: string, options: { defaultValue?: unknown }) => {
    const [value, setValue] = useState<unknown>(options?.defaultValue ?? null);
    return [value, (next: unknown) => setValue(next)] as const;
  },
}));

import { useCommunityUpdatesView } from "@/hooks/useCommunityUpdatesView";

describe("useCommunityUpdatesView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("defaults", () => {
    it("starts in cards view with no sort", () => {
      const { result } = renderHook(() => useCommunityUpdatesView());

      expect(result.current.view).toBe("cards");
      expect(result.current.isTableView).toBe(false);
      expect(result.current.sortBy).toBeNull();
      expect(result.current.sortOrder).toBe("asc");
    });
  });

  describe("setView", () => {
    it("switches to table view", () => {
      const { result } = renderHook(() => useCommunityUpdatesView());

      act(() => result.current.setView("table"));

      expect(result.current.view).toBe("table");
      expect(result.current.isTableView).toBe(true);
    });

    it("clears the sort when switching back to cards", () => {
      const { result } = renderHook(() => useCommunityUpdatesView());

      act(() => result.current.setView("table"));
      act(() => result.current.handleSort("dueDate"));
      expect(result.current.sortBy).toBe("dueDate");

      act(() => result.current.setView("cards"));

      expect(result.current.view).toBe("cards");
      expect(result.current.sortBy).toBeNull();
      expect(result.current.sortOrder).toBe("asc");
    });
  });

  describe("handleSort", () => {
    it("sorts a new column ascending", () => {
      const { result } = renderHook(() => useCommunityUpdatesView());

      act(() => result.current.handleSort("projectTitle"));

      expect(result.current.sortBy).toBe("projectTitle");
      expect(result.current.sortOrder).toBe("asc");
    });

    it("flips direction when the active column is clicked again", () => {
      const { result } = renderHook(() => useCommunityUpdatesView());

      act(() => result.current.handleSort("status"));
      act(() => result.current.handleSort("status"));

      expect(result.current.sortBy).toBe("status");
      expect(result.current.sortOrder).toBe("desc");
    });

    it("resets to ascending when switching to a different column", () => {
      const { result } = renderHook(() => useCommunityUpdatesView());

      act(() => result.current.handleSort("status"));
      act(() => result.current.handleSort("status"));
      act(() => result.current.handleSort("dueDate"));

      expect(result.current.sortBy).toBe("dueDate");
      expect(result.current.sortOrder).toBe("asc");
    });
  });
});
