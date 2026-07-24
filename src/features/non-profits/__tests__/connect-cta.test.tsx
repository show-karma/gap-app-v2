import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectFloatingCard } from "../components/connect-cta";

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

// Restored in afterEach — stubIntersectionObserver replaces the global stub
// from __tests__/setup.ts, and leaving it in place would leak a
// callback-capturing observer into every later test in the run.
const realIntersectionObserver = global.IntersectionObserver;

/**
 * The global IntersectionObserver stub in __tests__/setup.ts never invokes its
 * callback, so the card could never reach its retired state. This one captures
 * the callback and hands it back for the test to fire.
 */
function stubIntersectionObserver() {
  const callbacks: IntersectionObserverCallback[] = [];
  const disconnect = vi.fn();
  global.IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) {
      callbacks.push(cb);
    }
    observe() {}
    unobserve() {}
    disconnect = disconnect;
    takeRecords() {
      return [];
    }
  } as unknown as typeof global.IntersectionObserver;

  return {
    disconnect,
    // The observer fires outside React's event loop, so the resulting state
    // update has to be flushed explicitly.
    reachTarget: () => fire(callbacks, true),
    leaveTarget: () => fire(callbacks, false),
  };
}

function fire(callbacks: IntersectionObserverCallback[], isIntersecting: boolean) {
  act(() => {
    for (const cb of callbacks) {
      cb(
        [{ isIntersecting } as IntersectionObserverEntry],
        null as unknown as IntersectionObserver
      );
    }
  });
}

describe("ConnectFloatingCard", () => {
  let connector: HTMLElement;

  beforeEach(() => {
    window.sessionStorage.clear();
    connector = document.createElement("div");
    connector.id = "connector";
    document.body.appendChild(connector);
  });

  afterEach(() => {
    connector.remove();
    window.sessionStorage.clear();
    global.IntersectionObserver = realIntersectionObserver;
  });

  it("is visible from page load, without waiting on any scroll", () => {
    stubIntersectionObserver();
    render(<ConnectFloatingCard />);

    expect(screen.getByRole("link", { name: /Add to Claude/i })).toHaveAttribute(
      "href",
      "/nonprofits/find-funders/connect/claude"
    );
    expect(screen.getByRole("link", { name: /Add to ChatGPT/i })).toHaveAttribute(
      "href",
      "/nonprofits/find-funders/connect/chatgpt"
    );
  });

  it("hides while the connector section is on screen", () => {
    const { reachTarget } = stubIntersectionObserver();
    render(<ConnectFloatingCard />);

    reachTarget();

    // Section 05 makes the same offer full-size — floating a duplicate over it
    // would just cover it.
    expect(screen.queryByRole("link", { name: /Add to Claude/i })).not.toBeInTheDocument();
  });

  it("comes back after scrolling away from the connector section", () => {
    const { reachTarget, leaveTarget } = stubIntersectionObserver();
    render(<ConnectFloatingCard />);

    reachTarget();
    leaveTarget();

    expect(screen.getByRole("link", { name: /Add to Claude/i })).toBeInTheDocument();
  });

  it("stays dismissed for the rest of the session once closed", () => {
    stubIntersectionObserver();
    const { unmount } = render(<ConnectFloatingCard />);

    fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }));

    expect(screen.queryByRole("link", { name: /Add to Claude/i })).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem("np-connect-cta-dismissed")).toBe("1");

    unmount();
    stubIntersectionObserver();
    render(<ConnectFloatingCard />);

    expect(screen.queryByRole("link", { name: /Add to Claude/i })).not.toBeInTheDocument();
  });

  it("disconnects the observer on unmount", () => {
    const { disconnect } = stubIntersectionObserver();
    const { unmount } = render(<ConnectFloatingCard />);

    unmount();

    expect(disconnect).toHaveBeenCalled();
  });
});
