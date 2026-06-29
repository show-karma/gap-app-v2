import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import { RotatingWord } from "./rotating-word";

// useReducedMotion drives both the auto-rotation and the transition; mock it so
// each test can pin the user's motion preference.
const { reduceMotionMock } = vi.hoisted(() => ({ reduceMotionMock: vi.fn(() => false) }));
vi.mock("motion/react", () => ({
  useReducedMotion: () => reduceMotionMock(),
}));

// The visible word is the only one at full opacity; the spacer is `invisible`
// and the rest are `opacity-0`.
const activeWord = (container: HTMLElement) =>
  container.querySelector(".opacity-100")?.textContent ?? null;

describe("RotatingWord", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reduceMotionMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders every word so the slot reserves the widest width", () => {
    render(<RotatingWord words={["nonprofits", "projects", "initiatives"]} />);
    expect(screen.getByText("nonprofits")).toBeInTheDocument();
    expect(screen.getByText("projects")).toBeInTheDocument();
    // "initiatives" is the longest, so it appears twice: the spacer + the overlay.
    expect(screen.getAllByText("initiatives").length).toBe(2);
  });

  it("is hidden from assistive technology", () => {
    const { container } = render(<RotatingWord words={["one", "two"]} />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("starts on the first word and cycles on the interval", () => {
    const { container } = render(
      <RotatingWord words={["one", "two", "three"]} intervalMs={1000} />
    );
    expect(activeWord(container)).toBe("one");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(activeWord(container)).toBe("two");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(activeWord(container)).toBe("three");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(activeWord(container)).toBe("one");
  });

  it("holds on the first word when reduced motion is preferred", () => {
    reduceMotionMock.mockReturnValue(true);
    const { container } = render(<RotatingWord words={["one", "two"]} intervalMs={1000} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(activeWord(container)).toBe("one");
  });

  it("does not rotate with a single word", () => {
    const { container } = render(<RotatingWord words={["only"]} intervalMs={1000} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(activeWord(container)).toBe("only");
  });
});
