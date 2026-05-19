import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlyingChip, type FlyingChipRect } from "@/src/features/ask-karma/components/flying-chip";

const startRect: FlyingChipRect = { left: 100, top: 200, width: 180, height: 32 };
const endRect: FlyingChipRect = { left: 50, top: 80, width: 600, height: 48 };

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("FlyingChip", () => {
  it("renders inside the document body with the chip text", () => {
    render(
      <FlyingChip
        text="How do I submit a milestone?"
        startRect={startRect}
        endRect={endRect}
        durationMs={200}
        onArrive={vi.fn()}
      />
    );
    const chip = screen.getByTestId("ask-karma-flying-chip");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent("How do I submit a milestone?");
    // Portal target: the chip lives directly under <body>, not inside the
    // test container, so its parent should be document.body.
    expect(chip.parentElement).toBe(document.body);
  });

  it("starts positioned at the source rect on mount", () => {
    render(
      <FlyingChip
        text="hello"
        startRect={startRect}
        endRect={endRect}
        durationMs={200}
        onArrive={vi.fn()}
      />
    );
    const chip = screen.getByTestId("ask-karma-flying-chip");
    expect(chip.style.left).toBe(`${startRect.left}px`);
    expect(chip.style.top).toBe(`${startRect.top}px`);
    expect(chip.style.opacity).toBe("1");
  });

  it("transitions to the end position after the double-RAF commit", async () => {
    render(
      <FlyingChip
        text="hello"
        startRect={startRect}
        endRect={endRect}
        durationMs={200}
        onArrive={vi.fn()}
      />
    );
    // RAF in JSDOM is implemented via setTimeout(~16ms). Advancing a few
    // frames flushes both the layout-commit RAF and the phase-flip RAF.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    const chip = screen.getByTestId("ask-karma-flying-chip");
    // Ends up at the input's left edge + 12px padding.
    expect(chip.style.left).toBe(`${endRect.left + 12}px`);
    expect(chip.style.opacity).toBe("0");
  });

  it("invokes onArrive after the duration elapses", async () => {
    const onArrive = vi.fn();
    render(
      <FlyingChip
        text="hello"
        startRect={startRect}
        endRect={endRect}
        durationMs={200}
        onArrive={onArrive}
      />
    );
    // First flush: RAFs fire → setPhase("end") → useEffect runs → 200ms timer scheduled
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(onArrive).not.toHaveBeenCalled();
    // Second flush: fire the 200ms timer.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(220);
    });
    expect(onArrive).toHaveBeenCalledTimes(1);
  });

  it("only calls onArrive once even when extra time elapses past the duration", async () => {
    const onArrive = vi.fn();
    render(
      <FlyingChip
        text="hello"
        startRect={startRect}
        endRect={endRect}
        durationMs={150}
        onArrive={onArrive}
      />
    );
    // Same split as above: let RAFs fire and the duration timer schedule,
    // then advance well past the duration. The arrivedRef guard ensures the
    // callback fires exactly once even if the effect's cleanup is racy.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(onArrive).toHaveBeenCalledTimes(1);
  });
});
