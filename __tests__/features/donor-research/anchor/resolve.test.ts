/**
 * @file Tests for the anchor resolver. resolveAnchor takes a stored
 * anchor + a root DOM element and returns either an element handle, a
 * Range covering the resolved quote, or an orphan marker.
 */

import { resolveAnchor } from "@/src/features/donor-research/components/anchor/resolve";
import type { CommentAnchor } from "@/src/features/donor-research/components/anchor/types";

function makeRoot(html: string): { root: HTMLElement; cleanup: () => void } {
  const root = document.createElement("div");
  root.setAttribute("data-brief", "");
  root.innerHTML = html;
  document.body.appendChild(root);
  return {
    root,
    cleanup: () => {
      document.body.removeChild(root);
    },
  };
}

describe("resolveAnchor — section / candidate", () => {
  let cleanup: () => void = () => {};
  afterEach(() => {
    cleanup();
    cleanup = () => {};
  });

  it("returns an element handle for a section anchor that exists", () => {
    const { root, cleanup: c } = makeRoot(`<section data-section="methodology">Body</section>`);
    cleanup = c;
    const anchor: CommentAnchor = { kind: "section", sectionKey: "methodology" };
    const resolved = resolveAnchor(anchor, root);
    expect(resolved.kind).toBe("element");
    if (resolved.kind === "element") {
      expect(resolved.element.getAttribute("data-section")).toBe("methodology");
    }
  });

  it("returns orphan for a missing section anchor", () => {
    const { root, cleanup: c } = makeRoot(`<section data-section="masthead">Body</section>`);
    cleanup = c;
    const anchor: CommentAnchor = { kind: "section", sectionKey: "methodology" };
    expect(resolveAnchor(anchor, root).kind).toBe("orphan");
  });

  it("returns an element handle for a candidate anchor that exists", () => {
    const { root, cleanup: c } = makeRoot(`<div data-candidate-id="abc">Card</div>`);
    cleanup = c;
    expect(resolveAnchor({ kind: "candidate", candidateId: "abc" }, root).kind).toBe("element");
  });

  it("returns orphan when the candidate id is no longer present", () => {
    const { root, cleanup: c } = makeRoot(`<div data-candidate-id="abc">Card</div>`);
    cleanup = c;
    expect(resolveAnchor({ kind: "candidate", candidateId: "missing" }, root).kind).toBe("orphan");
  });
});

describe("resolveAnchor — text-range", () => {
  let cleanup: () => void = () => {};
  afterEach(() => {
    cleanup();
    cleanup = () => {};
  });

  it("returns a Range when the quote resolves in the target", () => {
    const { root, cleanup: c } = makeRoot(
      `<section data-section="methodology"><p>The methodology used by the engine is described here in detail.</p></section>`
    );
    cleanup = c;
    const anchor: CommentAnchor = {
      kind: "text_range",
      targetKind: "section",
      targetId: "methodology",
      quote: "methodology",
      prefix: "The ",
      suffix: " used",
    };
    const resolved = resolveAnchor(anchor, root);
    expect(resolved.kind).toBe("range");
    if (resolved.kind === "range") {
      expect(resolved.range.toString()).toContain("methodology");
    }
  });

  it("falls back to quote-only when the prefix shifted", () => {
    const { root, cleanup: c } = makeRoot(
      `<section data-section="methodology"><p>Enriched text the methodology used by the engine.</p></section>`
    );
    cleanup = c;
    const anchor: CommentAnchor = {
      kind: "text_range",
      targetKind: "section",
      targetId: "methodology",
      quote: "methodology",
      prefix: "ORIGINAL ",
      suffix: " used",
    };
    const resolved = resolveAnchor(anchor, root);
    expect(resolved.kind).toBe("range");
  });

  it("returns orphan when the quote no longer appears in the target", () => {
    const { root, cleanup: c } = makeRoot(
      `<section data-section="methodology"><p>An entirely rewritten paragraph.</p></section>`
    );
    cleanup = c;
    const anchor: CommentAnchor = {
      kind: "text_range",
      targetKind: "section",
      targetId: "methodology",
      quote: "methodology",
      prefix: "",
      suffix: "",
    };
    expect(resolveAnchor(anchor, root).kind).toBe("orphan");
  });

  it("returns orphan when the target element itself disappeared", () => {
    const { root, cleanup: c } = makeRoot(`<div>nothing matches</div>`);
    cleanup = c;
    const anchor: CommentAnchor = {
      kind: "text_range",
      targetKind: "candidate",
      targetId: "missing",
      quote: "something",
      prefix: "",
      suffix: "",
    };
    expect(resolveAnchor(anchor, root).kind).toBe("orphan");
  });
});
