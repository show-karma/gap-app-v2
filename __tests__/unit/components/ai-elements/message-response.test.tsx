import { render } from "@testing-library/react";
import remarkGfm from "remark-gfm";
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
vi.mock("@streamdown/cjk", () => ({ cjk: { remarkPluginsAfter: [] } }));
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

describe("MessageResponse remark-gfm", () => {
  // remark-gfm is forwarded as a `[plugin, options]` tuple so we can pass
  // `singleTilde: false`. Pull it back out of the forwarded remarkPlugins array.
  const findGfm = (remarkPlugins: unknown[]) =>
    remarkPlugins.find((p) => p === remarkGfm || (Array.isArray(p) && p[0] === remarkGfm));

  // Streamdown enables remark-gfm by default, but a custom `remarkPlugins` array
  // REPLACES that default — which silently dropped GFM table rendering for
  // consumers passing their own plugins (find-funders narratives rendered tables
  // as raw `| pipes |`). MessageResponse must always merge remark-gfm back in.
  it("forwards remark-gfm even when no remarkPlugins are passed", () => {
    streamdownSpy.mockClear();

    render(<MessageResponse>{"| a | b |\n|---|---|\n| 1 | 2 |"}</MessageResponse>);

    const props = streamdownSpy.mock.calls.at(-1)?.[0];
    expect(findGfm(props.remarkPlugins)).toBeDefined();
  });

  // A single `~` means "approximately" in AI narratives ("~$182K ... ~$20K");
  // default GFM pairs those two tildes and strikes through everything between.
  it("disables single-tilde strikethrough so `~` reads as 'approximately'", () => {
    streamdownSpy.mockClear();

    render(<MessageResponse>{"~$182K"}</MessageResponse>);

    const props = streamdownSpy.mock.calls.at(-1)?.[0];
    const gfm = findGfm(props.remarkPlugins);
    expect(gfm).toEqual([remarkGfm, { singleTilde: false }]);
  });

  it("preserves consumer remarkPlugins AND keeps remark-gfm", () => {
    streamdownSpy.mockClear();
    const customPlugin = () => {};

    render(<MessageResponse remarkPlugins={[customPlugin]}>{"text"}</MessageResponse>);

    const props = streamdownSpy.mock.calls.at(-1)?.[0];
    expect(findGfm(props.remarkPlugins)).toBeDefined();
    expect(props.remarkPlugins).toContain(customPlugin);
  });
});
