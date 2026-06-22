/**
 * Tests for ApplicationViewBoundary — the recovery boundary that contains the
 * React 19 streaming/Suspense-resume reconciliation crash on the applications
 * view (GAP-FRONTEND-212).
 *
 * Covers:
 * - rendering children when nothing throws
 * - marking the subtree non-translatable (translate="no" + notranslate) so
 *   browser translation does not collide with React-owned DOM nodes
 * - catching the parentNode-null reconciliation crash and showing a recovery UI
 *   instead of letting it propagate as an uncaught top-level error
 * - remounting/recovering the subtree on "Reload view"
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationViewBoundary } from "../ApplicationViewBoundary";

describe("ApplicationViewBoundary", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React logs caught errors to console.error -- suppress during tests.
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    delete (window as unknown as { __LAST_ERROR_BOUNDARY__?: unknown }).__LAST_ERROR_BOUNDARY__;
  });

  it("renders children when nothing throws", () => {
    render(
      <ApplicationViewBoundary>
        <div>Application content</div>
      </ApplicationViewBoundary>
    );

    expect(screen.getByText("Application content")).toBeInTheDocument();
    expect(screen.queryByTestId("application-view-recovery")).not.toBeInTheDocument();
  });

  it("wraps the subtree in a non-translatable region", () => {
    render(
      <ApplicationViewBoundary>
        <div>Application content</div>
      </ApplicationViewBoundary>
    );

    const region = screen.getByText("Application content").closest(".notranslate");
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("translate", "no");
  });

  it("catches the parentNode-null reconciliation crash and shows recovery UI", () => {
    const Crashing = () => {
      throw new TypeError("Cannot read properties of null (reading 'parentNode')");
    };

    render(
      <ApplicationViewBoundary>
        <Crashing />
      </ApplicationViewBoundary>
    );

    expect(screen.getByTestId("application-view-recovery")).toBeInTheDocument();
    expect(screen.getByText("This view needs to reload")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload view/i })).toBeInTheDocument();
  });

  it("recovers the subtree when Reload view is clicked", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    const ConditionalCrash = () => {
      if (shouldThrow) {
        throw new TypeError("Cannot read properties of null (reading 'parentNode')");
      }
      return <div>Recovered application content</div>;
    };

    render(
      <ApplicationViewBoundary>
        <ConditionalCrash />
      </ApplicationViewBoundary>
    );

    expect(screen.getByTestId("application-view-recovery")).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: /reload view/i }));

    expect(screen.getByText("Recovered application content")).toBeInTheDocument();
    expect(screen.queryByTestId("application-view-recovery")).not.toBeInTheDocument();
  });
});
