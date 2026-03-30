import { act, renderHook } from "@testing-library/react";
import { useDebounce } from "../use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately without waiting for the delay", () => {
    const { result } = renderHook(() => useDebounce("initial", 500));
    expect(result.current).toBe("initial");
  });

  it("still returns the initial value before the delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    );

    rerender({ value: "updated", delay: 500 });

    // Advance time partially — not enough to trigger debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("initial");
  });

  it("returns the debounced value after the delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    );

    rerender({ value: "updated", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("updated");
  });

  it("resets the timer on rapid successive changes (only last value wins)", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: "first", delay: 300 } }
    );

    // Rapid changes
    rerender({ value: "second", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "third", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "final", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Still on initial value — not enough time has passed since "final"
    expect(result.current).toBe("first");

    // Now advance past the debounce delay from the last change
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Only the last value should be settled
    expect(result.current).toBe("final");
  });

  it("does not update value if delay has not been reached after multiple rapid updates", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 1000 } }
    );

    for (let i = 0; i < 10; i++) {
      rerender({ value: `change-${i}`, delay: 1000 });
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }

    // Only 1000ms total have passed, but each update resets the timer
    // Since the last update was at t=1000, the debounce fires 1000ms after that
    expect(result.current).toBe("a");
  });

  it("works with number values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: number; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 200 } }
    );

    expect(result.current).toBe(0);

    rerender({ value: 42, delay: 200 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(42);
  });

  it("works with object values (same reference after debounce)", () => {
    const obj = { name: "test" };
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: object; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: {} as object, delay: 100 } }
    );

    rerender({ value: obj, delay: 100 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(obj);
  });
});
