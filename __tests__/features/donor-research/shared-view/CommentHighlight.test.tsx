/**
 * @file Tests for the text-range highlight overlay. Covers the kind
 * gate (only `text_range` renders), orphan suppression, and re-resolve
 * on window resize.
 */

import { act, render } from "@testing-library/react";
import * as resolveModule from "@/src/features/donor-research/components/anchor/resolve";
import type { CommentAnchor } from "@/src/features/donor-research/components/anchor/types";
import { CommentHighlight } from "@/src/features/donor-research/components/shared-view/CommentHighlight";

function makeRangeMock(rects: DOMRect[]): Range {
  const list: { [k: number]: DOMRect } & {
    length: number;
    item: (i: number) => DOMRect | null;
  } = {
    length: rects.length,
    item: (i: number) => rects[i] ?? null,
  };
  for (let i = 0; i < rects.length; i += 1) list[i] = rects[i];
  return {
    getClientRects: () => list as unknown as DOMRectList,
  } as unknown as Range;
}

function rect(x: number, y: number, w: number, h: number): DOMRect {
  return {
    top: y,
    left: x,
    right: x + w,
    bottom: y + h,
    width: w,
    height: h,
    x,
    y,
    toJSON: () => ({}),
  } as DOMRect;
}

const textRangeAnchor: CommentAnchor = {
  kind: "text_range",
  targetKind: "candidate",
  targetId: "c1",
  quote: "promising work",
  prefix: "the",
  suffix: ".",
};

describe("CommentHighlight", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (window as { scrollX?: number }).scrollX = 0;
    (window as { scrollY?: number }).scrollY = 0;
  });

  it("renders nothing for section anchors", () => {
    const sectionAnchor: CommentAnchor = { kind: "section", sectionKey: "methodology" };
    const root = document.createElement("div");
    const { container } = render(<CommentHighlight anchor={sectionAnchor} root={root} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for candidate anchors", () => {
    const candidateAnchor: CommentAnchor = { kind: "candidate", candidateId: "c1" };
    const root = document.createElement("div");
    const { container } = render(<CommentHighlight anchor={candidateAnchor} root={root} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when resolveAnchor returns orphan", () => {
    vi.spyOn(resolveModule, "resolveAnchor").mockReturnValue({ kind: "orphan" });
    const root = document.createElement("div");
    const { container } = render(<CommentHighlight anchor={textRangeAnchor} root={root} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("paints one absolute span per visual line rect", () => {
    vi.spyOn(resolveModule, "resolveAnchor").mockReturnValue({
      kind: "range",
      range: makeRangeMock([rect(10, 20, 100, 18), rect(10, 40, 80, 18)]),
      element: document.createElement("div"),
    });
    const root = document.createElement("div");
    const { container } = render(<CommentHighlight anchor={textRangeAnchor} root={root} />);
    const spans = container.querySelectorAll("[data-comment-highlight]");
    expect(spans).toHaveLength(2);
    expect((spans[0] as HTMLElement).style.top).toBe("20px");
    expect((spans[1] as HTMLElement).style.top).toBe("40px");
  });

  it("re-resolves on window resize", () => {
    const resolveSpy = vi
      .spyOn(resolveModule, "resolveAnchor")
      .mockReturnValueOnce({
        kind: "range",
        range: makeRangeMock([rect(0, 0, 50, 18)]),
        element: document.createElement("div"),
      })
      .mockReturnValueOnce({
        kind: "range",
        range: makeRangeMock([rect(0, 0, 100, 18)]),
        element: document.createElement("div"),
      });
    const root = document.createElement("div");
    render(<CommentHighlight anchor={textRangeAnchor} root={root} />);
    expect(resolveSpy).toHaveBeenCalledTimes(1);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(resolveSpy).toHaveBeenCalledTimes(2);
  });

  it("renders skip when root is null", () => {
    const { container } = render(<CommentHighlight anchor={textRangeAnchor} root={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the active variant with data-active when isActive=true", () => {
    vi.spyOn(resolveModule, "resolveAnchor").mockReturnValue({
      kind: "range",
      range: makeRangeMock([rect(0, 0, 50, 18)]),
      element: document.createElement("div"),
    });
    const root = document.createElement("div");
    const { container } = render(
      <CommentHighlight anchor={textRangeAnchor} root={root} isActive />
    );
    const span = container.querySelector("[data-comment-highlight]");
    expect(span?.getAttribute("data-active")).toBe("true");
  });

  it("renders an interactive marker <button> when onActivate is supplied", () => {
    vi.spyOn(resolveModule, "resolveAnchor").mockReturnValue({
      kind: "range",
      range: makeRangeMock([rect(0, 0, 50, 18)]),
      element: document.createElement("div"),
    });
    const onActivate = vi.fn();
    const root = document.createElement("div");
    const { container } = render(
      <CommentHighlight anchor={textRangeAnchor} root={root} onActivate={onActivate} />
    );
    // The highlight bands stay non-interactive (pointer-events:none) so text
    // is re-selectable; the clickable affordance is a separate marker button.
    const band = container.querySelector("[data-comment-highlight]") as HTMLElement | null;
    expect(band?.style.pointerEvents).toBe("none");
    const btn = container.querySelector("button[data-comment-marker]");
    expect(btn).not.toBeNull();
    btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onActivate).toHaveBeenCalled();
  });
});
