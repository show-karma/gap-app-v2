import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePrefersReducedMotion } from "@/src/features/ask-karma/hooks/use-prefers-reduced-motion";

interface MockMediaQueryList {
  matches: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

let mediaQueryList: MockMediaQueryList;
let listeners: Array<(event: MediaQueryListEvent) => void>;

beforeEach(() => {
  listeners = [];
  mediaQueryList = {
    matches: false,
    addEventListener: vi.fn((_evt: string, fn: (event: MediaQueryListEvent) => void) => {
      listeners.push(fn);
    }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mediaQueryList));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePrefersReducedMotion", () => {
  it("returns false when the user has not opted into reduced motion", () => {
    mediaQueryList.matches = false;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when the user has opted into reduced motion", () => {
    mediaQueryList.matches = true;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it("updates when the media query changes", () => {
    mediaQueryList.matches = false;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      // Simulate the OS toggling reduced motion on.
      for (const fn of listeners) fn({ matches: true } as MediaQueryListEvent);
    });
    expect(result.current).toBe(true);
  });

  it("removes the listener on unmount", () => {
    const { unmount } = renderHook(() => usePrefersReducedMotion());
    unmount();
    expect(mediaQueryList.removeEventListener).toHaveBeenCalled();
  });
});
