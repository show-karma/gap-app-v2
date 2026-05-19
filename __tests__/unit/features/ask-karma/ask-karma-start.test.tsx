import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ASK_KARMA_ANIMATION,
  AskKarmaStart,
} from "@/src/features/ask-karma/components/ask-karma-start";
import type { AskKarmaConfig } from "@/src/features/ask-karma/types";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    asChild: _asChild,
    variant: _variant,
    size: _size,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    variant?: string;
    size?: string;
  }) => <span {...props}>{children}</span>,
}));

const config: AskKarmaConfig = {
  heading: "Ask us anything",
  subheading: "Learn how funding works.",
  inputPlaceholder: "Questions? Ask the Karma Assistant",
  examplesIntro: "Some examples to get the juices flowing:",
  exampleQuestions: ["How do I submit a milestone?", "Why can't I access a project?"],
  featuredTopicsHeading: "Check out these featured topics",
  featuredTopics: [
    {
      icon: "dollar",
      title: "Open Funding Rounds",
      description: "Browse programs",
      links: [{ label: "View open rounds", href: "/funding-opportunities" }],
    },
    {
      icon: "trending-up",
      title: "Track Active Projects",
      cta: { label: "View Funded Projects", href: "/projects" },
    },
  ],
  assistantTitle: "Karma Assistant",
  assistantSubtitle: "Here to help 24/7",
};

// React's setState → useEffect chain doesn't run between timer fires when
// you advance time in one giant chunk; we have to flush the timer queue at
// each phase boundary so the next phase's effect gets a chance to schedule
// its own timers. This helper walks the chip → fly → type → submit chain
// in the same order the component does.
async function advanceChipAnimation(text: string): Promise<void> {
  // 1) Flush the double-RAF that commits the start position then flips
  //    the chip clone to its end position.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50);
  });
  // 2) Fire the FlyingChip onArrive timeout (FLY_DURATION_MS) — moves the
  //    parent into the "typing" phase.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ASK_KARMA_ANIMATION.FLY_DURATION_MS + 20);
  });
  // 3) Drive the typing interval one character at a time. We can't bulk-
  //    advance because every tick mutates state and the post-type timeout
  //    is only scheduled when the final character ticks through.
  for (let i = 0; i < text.length; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ASK_KARMA_ANIMATION.TYPE_SPEED_MS);
    });
  }
  // 4) Fire the post-type pause and the final onSubmit call.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ASK_KARMA_ANIMATION.POST_TYPE_PAUSE_MS + 30);
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("AskKarmaStart — static rendering", () => {
  it("renders the heading, subheading, and section headings from config", () => {
    render(<AskKarmaStart config={config} onSubmit={vi.fn()} />);
    expect(screen.getByRole("heading", { name: config.heading, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(config.subheading)).toBeInTheDocument();
    expect(screen.getByText(config.examplesIntro)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: config.featuredTopicsHeading, level: 2 })
    ).toBeInTheDocument();
  });

  it("renders all example question chips", () => {
    render(<AskKarmaStart config={config} onSubmit={vi.fn()} />);
    for (const q of config.exampleQuestions) {
      expect(screen.getByRole("button", { name: q })).toBeInTheDocument();
    }
  });

  it("renders all featured topic cards", () => {
    render(<AskKarmaStart config={config} onSubmit={vi.fn()} />);
    for (const topic of config.featuredTopics) {
      expect(screen.getByRole("heading", { name: topic.title })).toBeInTheDocument();
    }
  });

  it("renders chips inside a <ul> with one <li> each", () => {
    render(<AskKarmaStart config={config} onSubmit={vi.fn()} />);
    const intro = screen.getByText(config.examplesIntro);
    const list = intro.parentElement?.querySelector("ul");
    expect(list).not.toBeNull();
    const items = within(list as HTMLElement).getAllByRole("listitem");
    expect(items).toHaveLength(config.exampleQuestions.length);
  });
});

describe("AskKarmaStart — direct input submissions", () => {
  it("submits the input value on Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AskKarmaStart config={config} onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText(config.inputPlaceholder);
    await user.type(input, "What is ProPGF?");
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("What is ProPGF?");
  });

  it("submits when the search button is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AskKarmaStart config={config} onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText(config.inputPlaceholder);
    await user.type(input, "Hello there");
    await user.click(screen.getByLabelText("Ask the Karma Assistant"));
    expect(onSubmit).toHaveBeenCalledWith("Hello there");
  });

  it("ignores submits when the input is empty or whitespace-only", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AskKarmaStart config={config} onSubmit={onSubmit} />);
    const button = screen.getByLabelText("Ask the Karma Assistant");
    expect(button).toBeDisabled();
    const input = screen.getByPlaceholderText(config.inputPlaceholder);
    await user.type(input, "   ");
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("caps free-text input length to prevent oversized prompts", () => {
    render(<AskKarmaStart config={config} onSubmit={vi.fn()} />);
    const input = screen.getByTestId("ask-karma-search-input");
    // Hard cap surfaced via the HTML maxLength attribute so the browser
    // itself rejects keystrokes/pastes past the limit. Value is intentional
    // and tested so we notice if it changes silently.
    expect(input).toHaveAttribute("maxLength", "500");
  });

  it("ignores Enter while IME composition is active", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const onSubmit = vi.fn();
    render(<AskKarmaStart config={config} onSubmit={onSubmit} />);
    const input = screen.getByTestId("ask-karma-search-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "konnichiwa" } });
    // IME composition active — Enter must NOT submit.
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
    // Now release composition and press Enter again — should submit.
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("konnichiwa");
  });
});

describe("AskKarmaStart — reduced motion", () => {
  beforeEach(() => {
    // Override the global matchMedia stub from __tests__/setup.ts so the
    // hook reports the user preferring reduced motion.
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    // Restore the default (matches: false) stub so other tests stay in the
    // "motion-allowed" world.
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("submits the chip text immediately without flying chip animation", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AskKarmaStart config={config} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: config.exampleQuestions[0] }));

    expect(onSubmit).toHaveBeenCalledWith(config.exampleQuestions[0]);
    // Critical: the chip clone never renders — confirms the motion path
    // was bypassed, not just visually suppressed.
    expect(screen.queryByTestId("ask-karma-flying-chip")).not.toBeInTheDocument();
  });
});

describe("AskKarmaStart — chip click animation", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("renders the flying chip clone immediately on click", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AskKarmaStart config={config} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: config.exampleQuestions[0] }));
    const clone = screen.getByTestId("ask-karma-flying-chip");
    expect(clone).toBeInTheDocument();
    expect(clone).toHaveTextContent(config.exampleQuestions[0]);
    // The container reflects the animation phase via a data attribute so
    // tests (and future a11y/UX work) can hang behaviour off it.
    expect(screen.getByText(config.heading).closest("[data-animation-phase]")).toHaveAttribute(
      "data-animation-phase",
      "flying"
    );
  });

  it("blocks further chip clicks during the animation", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSubmit = vi.fn();
    render(<AskKarmaStart config={config} onSubmit={onSubmit} />);
    const first = screen.getByRole("button", { name: config.exampleQuestions[0] });
    const second = screen.getByRole("button", { name: config.exampleQuestions[1] });
    await user.click(first);
    // Mid-animation: second chip is disabled.
    expect(second).toBeDisabled();
    await user.click(second);
    // Advance through the full sequence — only the first text should submit.
    await advanceChipAnimation(config.exampleQuestions[0]);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(config.exampleQuestions[0]);
  });

  it("auto-types the chip text into the input then calls onSubmit", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSubmit = vi.fn();
    render(<AskKarmaStart config={config} onSubmit={onSubmit} />);
    const text = config.exampleQuestions[0];
    await user.click(screen.getByRole("button", { name: text }));

    // Flush RAFs + complete the fly so we enter the typing phase.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ASK_KARMA_ANIMATION.FLY_DURATION_MS + 20);
    });
    const input = screen.getByPlaceholderText(config.inputPlaceholder) as HTMLInputElement;
    expect(input).toHaveAttribute("readonly");

    // Tick half the characters and verify the prefix accumulates in the input.
    const halfChars = Math.max(1, Math.floor(text.length / 2));
    for (let i = 0; i < halfChars; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ASK_KARMA_ANIMATION.TYPE_SPEED_MS);
      });
    }
    expect(input.value.length).toBeGreaterThan(0);
    expect(input.value.length).toBeLessThan(text.length);
    expect(text.startsWith(input.value)).toBe(true);

    // Finish the remaining characters + the post-type pause and the submit.
    for (let i = halfChars; i < text.length; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ASK_KARMA_ANIMATION.TYPE_SPEED_MS);
      });
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ASK_KARMA_ANIMATION.POST_TYPE_PAUSE_MS + 30);
    });

    expect(onSubmit).toHaveBeenCalledWith(text);
    expect(screen.getByText(config.heading).closest("[data-animation-phase]")).toHaveAttribute(
      "data-animation-phase",
      "idle"
    );
  });

  it("unmounts the flying chip clone after onArrive fires", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AskKarmaStart config={config} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: config.exampleQuestions[0] }));
    expect(screen.getByTestId("ask-karma-flying-chip")).toBeInTheDocument();
    // Flush RAFs and the fly duration so the parent transitions to "typing".
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ASK_KARMA_ANIMATION.FLY_DURATION_MS + 30);
    });
    expect(screen.queryByTestId("ask-karma-flying-chip")).not.toBeInTheDocument();
  });

  it("cleans up timers when unmounted mid-animation", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSubmit = vi.fn();
    const { unmount } = render(<AskKarmaStart config={config} onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: config.exampleQuestions[0] }));
    // Get into the typing phase, then unmount before the submit fires.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ASK_KARMA_ANIMATION.FLY_DURATION_MS + 30);
    });
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
