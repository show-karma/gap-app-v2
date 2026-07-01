/**
 * @file Tests for the pin badge rendered next to each anchored target.
 * Validates count + label pluralization, render-suppression at zero,
 * `<button>` semantics, keyboard activation, and aria-label composition.
 */

import { fireEvent, render, screen } from "@testing-library/react";

import { CommentPin } from "@/src/features/donor-research/components/shared-view/CommentPin";

describe("CommentPin", () => {
  it("renders nothing when count is zero", () => {
    const { container } = render(
      <CommentPin count={0} targetKey="section:methodology" onActivate={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("pluralizes the count via the pluralize library", () => {
    const { rerender } = render(
      <CommentPin count={1} targetKey="section:methodology" onActivate={() => {}} />
    );
    expect(screen.getByRole("button")).toHaveTextContent(/^1 comment$/);
    rerender(<CommentPin count={3} targetKey="section:methodology" onActivate={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent(/^3 comments$/);
  });

  it("renders as a <button> with the target key in data-target-key", () => {
    render(<CommentPin count={2} targetKey="candidate:abc" onActivate={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-comment-pin");
    expect(btn).toHaveAttribute("data-target-key", "candidate:abc");
  });

  it("invokes onActivate(targetKey) on click", () => {
    const onActivate = vi.fn();
    render(<CommentPin count={2} targetKey="section:lead-candidate" onActivate={onActivate} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onActivate).toHaveBeenCalledWith("section:lead-candidate");
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
  ])("activates on %s key", (_, key) => {
    const onActivate = vi.fn();
    render(<CommentPin count={1} targetKey="section:masthead" onActivate={onActivate} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: key === "{Enter}" ? "Enter" : " " });
    expect(onActivate).toHaveBeenCalledWith("section:masthead");
  });

  it("composes the aria-label with optional human label", () => {
    render(
      <CommentPin
        count={2}
        targetKey="candidate:c1"
        onActivate={() => {}}
        ariaLabel="lead candidate"
      />
    );
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "2 comments on lead candidate"
    );
  });

  it("uses the bare label when ariaLabel is omitted", () => {
    render(<CommentPin count={4} targetKey="section:runners-up" onActivate={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "4 comments");
  });
});
