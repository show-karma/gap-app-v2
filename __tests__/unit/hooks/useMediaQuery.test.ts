/**
 * @file Tests for useMediaQuery hook
 * @description Tests media query matching hook with MediaQueryList change event handling
 */

import { act, renderHook } from "@testing-library/react";
import useMediaQuery from "@/hooks/useMediaQuery";

describe("useMediaQuery", () => {
  let mockMatchMedia: vi.Mock;
  let matchMediaResult: {
    matches: boolean;
    media: string;
    addEventListener: vi.Mock;
    removeEventListener: vi.Mock;
  };

  beforeEach(() => {
    matchMediaResult = {
      matches: false,
      media: "",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    mockMatchMedia = vi.fn().mockReturnValue(matchMediaResult);
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    });

    // Mock window.addEventListener and removeEventListener
    vi.spyOn(window, "addEventListener");
    vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with false when query does not match", () => {
      matchMediaResult.matches = false;

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(result.current).toBe(false);
      expect(mockMatchMedia).toHaveBeenCalledWith("(min-width: 768px)");
    });

    it("should initialize with true when query matches", () => {
      matchMediaResult.matches = true;

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(result.current).toBe(true);
    });

    it("should call matchMedia with provided query", () => {
      const query = "(max-width: 1024px)";

      renderHook(() => useMediaQuery(query));

      expect(mockMatchMedia).toHaveBeenCalledWith(query);
    });
  });

  describe("Change Event Handling", () => {
    it("should add a change event listener on the MediaQueryList on mount", () => {
      renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(matchMediaResult.addEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function)
      );
    });

    it("should remove the change event listener on unmount", () => {
      const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      unmount();

      expect(matchMediaResult.removeEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function)
      );
    });

    it("should update matches state when the media query changes", () => {
      matchMediaResult.matches = false;

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(result.current).toBe(false);

      // Simulate a media query change event
      act(() => {
        const changeHandler = matchMediaResult.addEventListener.mock.calls[0][1];
        changeHandler({ matches: true });
      });

      expect(result.current).toBe(true);
    });

    it("should handle multiple change events", () => {
      matchMediaResult.matches = false;

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      const changeHandler = matchMediaResult.addEventListener.mock.calls[0][1];

      act(() => {
        changeHandler({ matches: true });
      });
      expect(result.current).toBe(true);

      act(() => {
        changeHandler({ matches: false });
      });
      expect(result.current).toBe(false);

      act(() => {
        changeHandler({ matches: true });
      });
      expect(result.current).toBe(true);
    });
  });

  describe("Query Changes", () => {
    it("should update when query changes", () => {
      const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
        initialProps: { query: "(min-width: 768px)" },
      });

      expect(mockMatchMedia).toHaveBeenCalledWith("(min-width: 768px)");

      matchMediaResult.matches = true;
      rerender({ query: "(min-width: 1024px)" });

      expect(mockMatchMedia).toHaveBeenCalledWith("(min-width: 1024px)");
    });

    it("should handle query change and match state update", () => {
      matchMediaResult.matches = false;

      const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
        initialProps: { query: "(min-width: 768px)" },
      });

      expect(result.current).toBe(false);

      matchMediaResult.matches = true;
      rerender({ query: "(min-width: 1024px)" });

      expect(result.current).toBe(true);
    });
  });

  describe("Common Media Queries", () => {
    it("should handle mobile breakpoint query", () => {
      matchMediaResult.matches = true;

      const { result } = renderHook(() => useMediaQuery("(max-width: 640px)"));

      expect(result.current).toBe(true);
      expect(mockMatchMedia).toHaveBeenCalledWith("(max-width: 640px)");
    });

    it("should handle tablet breakpoint query", () => {
      matchMediaResult.matches = true;

      const { result } = renderHook(() =>
        useMediaQuery("(min-width: 768px) and (max-width: 1024px)")
      );

      expect(result.current).toBe(true);
    });

    it("should handle desktop breakpoint query", () => {
      matchMediaResult.matches = true;

      const { result } = renderHook(() => useMediaQuery("(min-width: 1280px)"));

      expect(result.current).toBe(true);
    });

    it("should handle orientation queries", () => {
      matchMediaResult.matches = true;

      const { result } = renderHook(() => useMediaQuery("(orientation: portrait)"));

      expect(result.current).toBe(true);
      expect(mockMatchMedia).toHaveBeenCalledWith("(orientation: portrait)");
    });

    it("should handle prefer-color-scheme queries", () => {
      matchMediaResult.matches = true;

      const { result } = renderHook(() => useMediaQuery("(prefers-color-scheme: dark)"));

      expect(result.current).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty query string", () => {
      matchMediaResult.matches = false;

      const { result } = renderHook(() => useMediaQuery(""));

      expect(result.current).toBe(false);
      expect(mockMatchMedia).toHaveBeenCalledWith("");
    });

    it("should handle complex query with multiple conditions", () => {
      matchMediaResult.matches = true;

      const { result } = renderHook(() =>
        useMediaQuery("(min-width: 768px) and (max-width: 1024px) and (orientation: landscape)")
      );

      expect(result.current).toBe(true);
    });

    it("should not update state unnecessarily when matches is same", () => {
      matchMediaResult.matches = true;

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(result.current).toBe(true);

      // Simulate a change event where matches stays the same
      act(() => {
        const changeHandler = matchMediaResult.addEventListener.mock.calls[0][1];
        changeHandler({ matches: true });
      });

      expect(result.current).toBe(true);
    });
  });

  describe("Multiple Hook Instances", () => {
    it("should handle multiple hooks with different queries", () => {
      const { result: result1 } = renderHook(() => useMediaQuery("(min-width: 768px)"));
      const { result: result2 } = renderHook(() => useMediaQuery("(max-width: 640px)"));

      expect(mockMatchMedia).toHaveBeenCalledWith("(min-width: 768px)");
      expect(mockMatchMedia).toHaveBeenCalledWith("(max-width: 640px)");
    });

    it("should handle multiple hooks with same query", () => {
      matchMediaResult.matches = true;

      const { result: result1 } = renderHook(() => useMediaQuery("(min-width: 768px)"));
      const { result: result2 } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(result1.current).toBe(true);
      expect(result2.current).toBe(true);
    });
  });

  describe("Cleanup", () => {
    it("should cleanup event listeners on unmount", () => {
      const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      unmount();

      expect(matchMediaResult.removeEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function)
      );
    });

    it("should cleanup and re-setup on query change", () => {
      const { rerender, unmount } = renderHook(({ query }) => useMediaQuery(query), {
        initialProps: { query: "(min-width: 768px)" },
      });

      const initialAddCalls = matchMediaResult.addEventListener.mock.calls.length;

      rerender({ query: "(min-width: 1024px)" });

      // Should have added new listeners
      expect(matchMediaResult.addEventListener.mock.calls.length).toBe(initialAddCalls + 1);

      unmount();

      // Should have removed all listeners
      expect(matchMediaResult.removeEventListener).toHaveBeenCalled();
    });
  });

  describe("State Updates", () => {
    it("should update state when media query match changes", () => {
      matchMediaResult.matches = false;

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(result.current).toBe(false);

      act(() => {
        const changeHandler = matchMediaResult.addEventListener.mock.calls[0][1];
        changeHandler({ matches: true });
      });

      expect(result.current).toBe(true);
    });

    it("should maintain state between renders if no changes", () => {
      matchMediaResult.matches = true;

      const { result, rerender } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(result.current).toBe(true);

      rerender();

      expect(result.current).toBe(true);
    });
  });

  describe("Responsive Breakpoints", () => {
    it("should handle sm breakpoint (640px)", () => {
      matchMediaResult.matches = true;

      const { result } = renderHook(() => useMediaQuery("(min-width: 640px)"));

      expect(result.current).toBe(true);
    });

    it("should handle md breakpoint (768px)", () => {
      matchMediaResult.matches = true;

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(result.current).toBe(true);
    });

    it("should handle lg breakpoint (1024px)", () => {
      matchMediaResult.matches = true;

      const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));

      expect(result.current).toBe(true);
    });

    it("should handle xl breakpoint (1280px)", () => {
      matchMediaResult.matches = true;

      const { result } = renderHook(() => useMediaQuery("(min-width: 1280px)"));

      expect(result.current).toBe(true);
    });

    it("should handle 2xl breakpoint (1536px)", () => {
      matchMediaResult.matches = true;

      const { result } = renderHook(() => useMediaQuery("(min-width: 1536px)"));

      expect(result.current).toBe(true);
    });
  });
});
