/**
 * @file Tests for the anchor capture utility used by the donor-shared
 * report comment surface. captureTextRangeAnchor reads from the live
 * window.getSelection() and walks the DOM looking for an anchorable
 * ancestor (`data-section` / `data-candidate-id`). captureElementAnchor
 * builds a pin anchor directly from an element.
 */

import {
  captureElementAnchor,
  captureTextRangeAnchor,
} from "@/src/features/donor-research/components/anchor/capture";

function makeAnchoredDocument(html: string): { root: HTMLElement; cleanup: () => void } {
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

function selectRange(start: Node, startOffset: number, end: Node, endOffset: number): Selection {
  const sel = window.getSelection();
  if (!sel) throw new Error("Selection unavailable in jsdom");
  sel.removeAllRanges();
  const range = document.createRange();
  range.setStart(start, startOffset);
  range.setEnd(end, endOffset);
  sel.addRange(range);
  return sel;
}

describe("captureTextRangeAnchor", () => {
  let cleanup: () => void = () => {};

  beforeEach(() => {
    window.getSelection()?.removeAllRanges();
  });

  afterEach(() => {
    cleanup();
    cleanup = () => {};
  });

  it("returns null when the selection is collapsed", () => {
    const { root, cleanup: c } = makeAnchoredDocument(
      `<section data-section="masthead"><p id="p">Hello world</p></section>`
    );
    cleanup = c;
    const text = root.querySelector("#p")!.firstChild!;
    selectRange(text, 3, text, 3);
    expect(captureTextRangeAnchor(window.getSelection() as Selection)).toBeNull();
  });

  it("returns null when no anchorable ancestor exists", () => {
    const { root, cleanup: c } = makeAnchoredDocument(`<p id="p">Hello world</p>`);
    cleanup = c;
    const text = root.querySelector("#p")!.firstChild!;
    selectRange(text, 0, text, 5);
    expect(captureTextRangeAnchor(window.getSelection() as Selection)).toBeNull();
  });

  it("captures a text-range anchor scoped to a section", () => {
    const { root, cleanup: c } = makeAnchoredDocument(
      `<section data-section="methodology">
         <p id="p">The methodology used by the engine is described here in detail.</p>
       </section>`
    );
    cleanup = c;
    const text = root.querySelector("#p")!.firstChild!;
    selectRange(text, 4, text, 15); // "methodology"
    const anchor = captureTextRangeAnchor(window.getSelection() as Selection);
    expect(anchor).not.toBeNull();
    expect(anchor!.kind).toBe("text_range");
    if (anchor!.kind === "text_range") {
      expect(anchor.targetKind).toBe("section");
      expect(anchor.targetId).toBe("methodology");
      expect(anchor.quote).toBe("methodology");
      expect(anchor.suffix.startsWith(" used by")).toBe(true);
      expect(anchor.prefix.endsWith("The ")).toBe(true);
    }
  });

  it("captures a text-range anchor scoped to a candidate", () => {
    const { root, cleanup: c } = makeAnchoredDocument(
      `<section data-section="lead-candidate" data-candidate-id="cand-1">
         <p id="p">Best Friends Animal Society leads the field on dogs.</p>
       </section>`
    );
    cleanup = c;
    const text = root.querySelector("#p")!.firstChild!;
    selectRange(text, 0, text, 27); // "Best Friends Animal Society"
    const anchor = captureTextRangeAnchor(window.getSelection() as Selection);
    expect(anchor).not.toBeNull();
    if (anchor && anchor.kind === "text_range") {
      expect(anchor.targetKind).toBe("candidate");
      expect(anchor.targetId).toBe("cand-1");
      expect(anchor.quote).toBe("Best Friends Animal Society");
    }
  });

  it("returns null when the selection straddles two different anchor targets", () => {
    const { root, cleanup: c } = makeAnchoredDocument(
      `<section data-section="lead-candidate" data-candidate-id="cand-1">
         <p id="a">Lead candidate paragraph.</p>
       </section>
       <section data-section="runners-up" data-candidate-id="cand-2">
         <p id="b">Runner-up paragraph.</p>
       </section>`
    );
    cleanup = c;
    const a = root.querySelector("#a")!.firstChild!;
    const b = root.querySelector("#b")!.firstChild!;
    selectRange(a, 0, b, 5);
    expect(captureTextRangeAnchor(window.getSelection() as Selection)).toBeNull();
  });

  it("returns null when the quote exceeds the bound", () => {
    const long = "x".repeat(700);
    const { root, cleanup: c } = makeAnchoredDocument(
      `<section data-section="methodology"><p id="p">${long}</p></section>`
    );
    cleanup = c;
    const text = root.querySelector("#p")!.firstChild!;
    selectRange(text, 0, text, 700);
    expect(captureTextRangeAnchor(window.getSelection() as Selection)).toBeNull();
  });
});

describe("captureElementAnchor", () => {
  let cleanup: () => void = () => {};

  afterEach(() => {
    cleanup();
    cleanup = () => {};
  });

  it("returns null when no anchor ancestor exists", () => {
    const { root, cleanup: c } = makeAnchoredDocument(`<p id="p">Hello</p>`);
    cleanup = c;
    expect(captureElementAnchor(root.querySelector("#p"))).toBeNull();
  });

  it("builds a candidate anchor when on a candidate root", () => {
    const { root, cleanup: c } = makeAnchoredDocument(
      `<section data-section="lead-candidate" data-candidate-id="cand-9"><p id="p">Hi</p></section>`
    );
    cleanup = c;
    const anchor = captureElementAnchor(root.querySelector("#p"));
    expect(anchor).toEqual({ kind: "candidate", candidateId: "cand-9" });
  });

  it("builds a section anchor when only a section ancestor exists", () => {
    const { root, cleanup: c } = makeAnchoredDocument(
      `<section data-section="methodology"><p id="p">Hi</p></section>`
    );
    cleanup = c;
    const anchor = captureElementAnchor(root.querySelector("#p"));
    expect(anchor).toEqual({ kind: "section", sectionKey: "methodology" });
  });

  it("ignores section keys outside the bounded enum", () => {
    const { root, cleanup: c } = makeAnchoredDocument(
      `<section data-section="bogus"><p id="p">Hi</p></section>`
    );
    cleanup = c;
    expect(captureElementAnchor(root.querySelector("#p"))).toBeNull();
  });
});
