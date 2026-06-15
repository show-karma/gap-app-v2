import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageResponse } from "@/src/components/ai-elements/message-response";

// Capture the props Streamdown receives so we can assert that the memo
// comparator lets `mode` (and other forwarded prop) changes through even when
// `children` is unchanged. This guards #1462: when the last assistant message
// finishes streaming its content is identical at the final frame while `mode`
// flips streaming→static.
const streamdownSpy = vi.fn();

vi.mock("streamdown", () => ({
  Streamdown: (props: { mode?: string; className?: string; children?: React.ReactNode }) => {
    streamdownSpy(props);
    return <div data-testid="streamdown">{props.children}</div>;
  },
}));

// The math/mermaid plugins lazy-load via dynamic import(); stub them so the
// effect resolves synchronously enough for the test and doesn't throw.
vi.mock("@streamdown/math", () => ({ math: {} }));
vi.mock("@streamdown/mermaid", () => ({ mermaid: {} }));
vi.mock("@streamdown/cjk", () => ({ cjk: {} }));
vi.mock("@streamdown/code", () => ({ code: {} }));

describe("MessageResponse memo comparator", () => {
  it("re-renders and forwards the new mode when only `mode` changes (#1462)", () => {
    streamdownSpy.mockClear();

    const children = "Same content at the final streaming frame.";
    const { rerender } = render(<MessageResponse mode="streaming">{children}</MessageResponse>);

    expect(streamdownSpy).toHaveBeenLastCalledWith(expect.objectContaining({ mode: "streaming" }));

    // Identical children, only the mode flips — the comparator must NOT bail.
    rerender(<MessageResponse mode="static">{children}</MessageResponse>);

    expect(streamdownSpy).toHaveBeenLastCalledWith(expect.objectContaining({ mode: "static" }));
  });

  it("forwards an updated `className` when `children` is unchanged", () => {
    streamdownSpy.mockClear();

    const children = "Same content, restyled.";
    const { rerender } = render(<MessageResponse className="first">{children}</MessageResponse>);

    expect(streamdownSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ className: expect.stringContaining("first") })
    );

    // Only className changes — relying on memo's default shallow compare, the
    // updated class must still reach Streamdown (a children-only comparator
    // would have swallowed this).
    rerender(<MessageResponse className="second">{children}</MessageResponse>);

    expect(streamdownSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ className: expect.stringContaining("second") })
    );
  });
});
