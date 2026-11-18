import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { IntentPrefetchLink } from "@/src/components/navigation/IntentPrefetchLink";

// Record the `prefetch` value Next's Link receives on each render; the real
// Link only prefetches in production builds, so the prop is what we can assert.
const prefetchValues: unknown[] = [];

vi.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
    prefetch,
    ...props
  }: {
    children: ReactNode;
    href: string;
    prefetch?: unknown;
  }) => {
    prefetchValues.push(prefetch);
    return (
      <a href={href} data-prefetch={String(prefetch)} {...props}>
        {children}
      </a>
    );
  };
  return { __esModule: true, default: MockLink };
});

function renderLink(props: Partial<Parameters<typeof IntentPrefetchLink>[0]> = {}) {
  render(
    <IntentPrefetchLink href="/project/tally" {...props}>
      Tally
    </IntentPrefetchLink>
  );
  return screen.getByRole("link", { name: "Tally" });
}

describe("IntentPrefetchLink", () => {
  beforeEach(() => {
    prefetchValues.length = 0;
  });

  it("does not prefetch before the visitor shows intent", () => {
    const link = renderLink();

    expect(link).toHaveAttribute("data-prefetch", "false");
  });

  it.each([
    ["hover", (el: HTMLElement) => fireEvent.mouseEnter(el)],
    ["keyboard focus", (el: HTMLElement) => fireEvent.focus(el)],
    ["touch", (el: HTMLElement) => fireEvent.touchStart(el)],
  ])("restores the default prefetch on %s", (_intent, showIntent) => {
    const link = renderLink();

    showIntent(link);

    // `null` is Next's default ("auto"), the value every card had before.
    expect(link).toHaveAttribute("data-prefetch", "null");
    expect(prefetchValues.at(-1)).toBeNull();
  });

  it("still calls the caller's own handlers", () => {
    const onMouseEnter = vi.fn();
    const onFocus = vi.fn();
    const onTouchStart = vi.fn();
    const link = renderLink({ onMouseEnter, onFocus, onTouchStart });

    fireEvent.mouseEnter(link);
    fireEvent.focus(link);
    fireEvent.touchStart(link);

    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onTouchStart).toHaveBeenCalledTimes(1);
  });

  it("keeps the href and other props", () => {
    const link = renderLink({ className: "card" });

    expect(link).toHaveAttribute("href", "/project/tally");
    expect(link).toHaveClass("card");
  });
});
