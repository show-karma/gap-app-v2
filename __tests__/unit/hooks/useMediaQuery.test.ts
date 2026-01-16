/**
 * @file Tests for useMediaQuery hook
 * @description Tests media query matching hook with resize event handling
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import useMediaQuery from "@/hooks/useMediaQuery";

describe("useMediaQuery", () => {
  let mockMatchMedia: jest.Mock;
  let matchMediaResult: {
    matches: boolean;
    media: string;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
  };

  beforeEach(() => {
    matchMediaResult = {
      matches: false,
      media: "",
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    mockMatchMedia = jest.fn().mockReturnValue(matchMediaResult);
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    });

    // Mock window.addEventListener and removeEventListener
    jest.spyOn(window, "addEventListener");
    jest.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    jest.clearAllMocks();
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

  describe("Resize Event Handling", () => {
    it("should add resize event listener on mount", () => {
      renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(window.addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    });

    it("should remove resize event listener on unmount", () => {
      const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    });

    it("should update matches state on resize", () => {
      matchMediaResult.matches = false;

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(result.current).toBe(false);

      // Simulate resize that changes the match
      act(() => {
        matchMediaResult.matches = true;
        const resizeHandler = (window.addEventListener as jest.Mock).mock.calls[0][1];
        resizeHandler();
      });

      expect(result.current).toBe(true);
    });

    it("should handle multiple resize events", () => {
      matchMediaResult.matches = false;

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      const resizeHandler = (window.addEventListener as jest.Mock).mock.calls[0][1];

      act(() => {
        matchMediaResult.matches = true;
        resizeHandler();
      });
      expect(result.current).toBe(true);

      act(() => {
        matchMediaResult.matches = false;
        resizeHandler();
      });
      expect(result.current).toBe(false);

      act(() => {
        matchMediaResult.matches = true;
        resizeHandler();
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

      // Simulate resize where matches stays the same
      act(() => {
        matchMediaResult.matches = true;
        const resizeHandler = (window.addEventListener as jest.Mock).mock.calls[0][1];
        resizeHandler();
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

      const addEventListenerCalls = (window.addEventListener as jest.Mock).mock.calls.length;

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledTimes(addEventListenerCalls);
    });

    it("should cleanup and re-setup on query change", () => {
      const { rerender, unmount } = renderHook(({ query }) => useMediaQuery(query), {
        initialProps: { query: "(min-width: 768px)" },
      });

      const initialAddCalls = (window.addEventListener as jest.Mock).mock.calls.length;

      rerender({ query: "(min-width: 1024px)" });

      // Should have added new listeners
      expect((window.addEventListener as jest.Mock).mock.calls.length).toBe(initialAddCalls + 1);

      unmount();

      // Should have removed all listeners
      expect(window.removeEventListener).toHaveBeenCalled();
    });
  });

  describe("State Updates", () => {
    it("should update state when media query match changes", () => {
      matchMediaResult.matches = false;

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(result.current).toBe(false);

      act(() => {
        matchMediaResult.matches = true;
        const resizeHandler = (window.addEventListener as jest.Mock).mock.calls[0][1];
        resizeHandler();
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
