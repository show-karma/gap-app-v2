import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageResponse } from "@/src/components/ai-elements/message-response";

// Capture the props Streamdown receives so we can assert that the memo
// comparator lets `mode` changes through even when `children` is unchanged.
// This guards #1462: when the last assistant message finishes streaming its
// content is identical at the final frame while `mode` flips streaming→static.
const streamdownSpy = vi.fn();

vi.mock("streamdown", () => ({
  Streamdown: (props: { mode?: string; children?: React.ReactNode }) => {
    streamdownSpy(props.mode);
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

    expect(streamdownSpy).toHaveBeenLastCalledWith("streaming");

    // Identical children, only the mode flips — the comparator must NOT bail.
    rerender(<MessageResponse mode="static">{children}</MessageResponse>);

    expect(streamdownSpy).toHaveBeenLastCalledWith("static");
  });
});
