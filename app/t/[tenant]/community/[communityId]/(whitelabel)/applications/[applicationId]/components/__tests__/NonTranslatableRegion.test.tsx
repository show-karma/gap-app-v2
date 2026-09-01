/**
 * Tests for NonTranslatableRegion — the wrapper that marks the streamed
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
import { NonTranslatableRegion } from "../NonTranslatableRegion";

describe("NonTranslatableRegion", () => {
  it("renders children", () => {
    render(
      <NonTranslatableRegion>
        <div>Application content</div>
      </NonTranslatableRegion>
    );

    expect(screen.getByText("Application content")).toBeInTheDocument();
  });

  it('marks the subtree non-translatable with translate="no" and the notranslate class', () => {
    render(
      <NonTranslatableRegion>
        <div>Application content</div>
      </NonTranslatableRegion>
    );

    const region = screen.getByText("Application content").closest(".notranslate");
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("translate", "no");
  });
});
