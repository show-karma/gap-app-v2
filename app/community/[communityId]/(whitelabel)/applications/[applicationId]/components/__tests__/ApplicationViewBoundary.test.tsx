/**
 * Tests for ApplicationViewBoundary — the wrapper that marks the streamed
 * application view subtree non-translatable.
 *
 * Scope note: GAP-FRONTEND-212 is a React 19 stream-resume ($RS) crash thrown at
 * global scope (`mechanism: onerror, handled: no`), OUTSIDE React's render and
 * lifecycle phases. An error boundary cannot catch it, so this component does
 * NOT attempt to. Its job is purely the source-level mitigation: marking the
 * subtree `translate="no"` (+ `notranslate`) so machine translation does not
 * rewrite the React-owned text nodes that desynchronize the DOM $RS later
 * splices. These tests verify exactly that — they do not (and cannot) reproduce
 * or assert containment of the real onerror/$RS crash.
 */

import { render, screen } from "@testing-library/react";
import { ApplicationViewBoundary } from "../ApplicationViewBoundary";

describe("ApplicationViewBoundary", () => {
  it("renders children", () => {
    render(
      <ApplicationViewBoundary>
        <div>Application content</div>
      </ApplicationViewBoundary>
    );

    expect(screen.getByText("Application content")).toBeInTheDocument();
  });

  it('marks the subtree non-translatable with translate="no" and the notranslate class', () => {
    render(
      <ApplicationViewBoundary>
        <div>Application content</div>
      </ApplicationViewBoundary>
    );

    const region = screen.getByText("Application content").closest(".notranslate");
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("translate", "no");
  });
});
