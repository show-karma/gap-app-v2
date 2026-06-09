/**
 * AudienceSwitcher Tests
 *
 * Covers the URL-hash <-> active-tab sync behavior, the modern segmented
 * tab UI, accessibility wiring, and WAI-ARIA keyboard navigation.
 */

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudienceSwitcher } from "@/src/features/home/components/audience-switcher";

// motion/react does layout animations that confuse jsdom. Replace with a
// passthrough so AnimatePresence + motion.div / motion.span render as plain
// div/span elements. Strip motion-only props (layoutId, animate, initial, exit,
// transition) so React doesn't warn about unknown DOM attributes.
const MOTION_ONLY_PROPS = new Set([
  "layoutId",
  "layout",
  "animate",
  "initial",
  "exit",
  "transition",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileInView",
  "variants",
]);

function stripMotionProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!MOTION_ONLY_PROPS.has(key)) out[key] = value;
  }
  return out;
}

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        const Component = (props: { children?: React.ReactNode } & Record<string, unknown>) => {
          const { children, ...rest } = props;
          const Tag = tag as keyof JSX.IntrinsicElements;
          return <Tag {...stripMotionProps(rest)}>{children}</Tag>;
        };
        Component.displayName = `motion.${tag}`;
        return Component;
      },
    }
  ),
}));

// scrollIntoView isn't implemented in jsdom by default.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  // Reset URL hash between tests so state doesn't leak.
  window.history.replaceState(null, "", "/");
});

describe("AudienceSwitcher", () => {
  describe("Initial render", () => {
    it("defaults to the foundations tab when no hash is present", () => {
      render(<AudienceSwitcher />);
      const foundationsTab = screen.getByRole("tab", { name: "Foundations" });
      expect(foundationsTab).toHaveAttribute("aria-selected", "true");
      const donorsTab = screen.getByRole("tab", { name: "Donors & Advisors" });
      expect(donorsTab).toHaveAttribute("aria-selected", "false");
    });

    it("renders all three audience tabs", () => {
      render(<AudienceSwitcher />);
      expect(screen.getByRole("tab", { name: "Foundations" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Donors & Advisors" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Nonprofits" })).toBeInTheDocument();
    });

    it("renders the foundations panel content by default", () => {
      render(<AudienceSwitcher />);
      expect(
        screen.getByText(/AI-powered funding software that does the work for you/i)
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility wiring", () => {
    it("each tab has an id matching the panel's aria-labelledby pattern", () => {
      render(<AudienceSwitcher />);
      const activePanel = screen.getByRole("tabpanel");
      const labelId = activePanel.getAttribute("aria-labelledby");
      expect(labelId).toBe("audience-tab-foundations");
      expect(document.getElementById(labelId ?? "")).toBeInTheDocument();
    });

    it("only the active tab has tabIndex 0; inactive tabs are tabIndex -1", () => {
      render(<AudienceSwitcher />);
      expect(screen.getByRole("tab", { name: "Foundations" })).toHaveAttribute("tabindex", "0");
      expect(screen.getByRole("tab", { name: "Donors & Advisors" })).toHaveAttribute(
        "tabindex",
        "-1"
      );
      expect(screen.getByRole("tab", { name: "Nonprofits" })).toHaveAttribute("tabindex", "-1");
    });

    it("tablist has an accessible name", () => {
      render(<AudienceSwitcher />);
      expect(screen.getByRole("tablist")).toHaveAttribute("aria-label", "Audience");
    });
  });

  describe("URL hash sync", () => {
    it("selects the donors tab when mounted with #donors-advisors", () => {
      window.history.replaceState(null, "", "#donors-advisors");
      render(<AudienceSwitcher />);
      expect(screen.getByRole("tab", { name: "Donors & Advisors" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    it("selects the nonprofits tab when mounted with #nonprofits", () => {
      window.history.replaceState(null, "", "#nonprofits");
      render(<AudienceSwitcher />);
      expect(screen.getByRole("tab", { name: "Nonprofits" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    it("clicking a tab updates the URL hash", () => {
      render(<AudienceSwitcher />);
      fireEvent.click(screen.getByRole("tab", { name: "Nonprofits" }));
      expect(window.location.hash).toBe("#nonprofits");
    });

    it("clicking foundations writes #foundations to the URL", () => {
      window.history.replaceState(null, "", "#donors-advisors");
      render(<AudienceSwitcher />);
      fireEvent.click(screen.getByRole("tab", { name: "Foundations" }));
      expect(window.location.hash).toBe("#foundations");
    });

    it("responds to external hashchange events (back/forward navigation)", () => {
      render(<AudienceSwitcher />);
      act(() => {
        window.history.replaceState(null, "", "#nonprofits");
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
      expect(screen.getByRole("tab", { name: "Nonprofits" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    it("ignores unknown hashes and keeps the current tab", () => {
      render(<AudienceSwitcher />);
      act(() => {
        window.history.replaceState(null, "", "#some-other-anchor");
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
      expect(screen.getByRole("tab", { name: "Foundations" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });
  });

  describe("Keyboard navigation", () => {
    it("ArrowRight moves selection to the next tab", () => {
      render(<AudienceSwitcher />);
      fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
      expect(screen.getByRole("tab", { name: "Donors & Advisors" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    it("ArrowLeft wraps around to the last tab from the first", () => {
      render(<AudienceSwitcher />);
      fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowLeft" });
      expect(screen.getByRole("tab", { name: "Nonprofits" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    it("Home jumps to the first tab", () => {
      window.history.replaceState(null, "", "#nonprofits");
      render(<AudienceSwitcher />);
      fireEvent.keyDown(screen.getByRole("tablist"), { key: "Home" });
      expect(screen.getByRole("tab", { name: "Foundations" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    it("End jumps to the last tab", () => {
      render(<AudienceSwitcher />);
      fireEvent.keyDown(screen.getByRole("tablist"), { key: "End" });
      expect(screen.getByRole("tab", { name: "Nonprofits" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    it("non-navigation keys are ignored", () => {
      render(<AudienceSwitcher />);
      fireEvent.keyDown(screen.getByRole("tablist"), { key: "a" });
      expect(screen.getByRole("tab", { name: "Foundations" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });
  });
});
