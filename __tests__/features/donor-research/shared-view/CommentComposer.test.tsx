/**
 * @file Tests for CommentComposer — body input, submit gating, anchor
 * descriptor rendering, reply mode context, error surfacing, and
 * pending-state copy on the submit button.
 */

import { fireEvent, render, screen } from "@testing-library/react";

import { CommentComposer } from "@/src/features/donor-research/components/shared-view/CommentComposer";

describe("CommentComposer", () => {
  it("disables submit when the body is empty", () => {
    render(<CommentComposer onCancel={() => {}} onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: /^comment$/i })).toBeDisabled();
  });

  it("calls onSubmit with the trimmed body on form submit", async () => {
    const onSubmit = vi.fn();
    render(<CommentComposer onCancel={() => {}} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText(/add a comment/i), {
      target: { value: "  hi there  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /^comment$/i }));
    expect(onSubmit).toHaveBeenCalledWith("hi there");
  });

  it("renders the anchor descriptor for section anchors", () => {
    render(
      <CommentComposer
        anchor={{ kind: "section", sectionKey: "methodology" }}
        onCancel={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByText(/on methodology/i)).toBeInTheDocument();
  });

  it("renders the anchor descriptor for candidate anchors", () => {
    render(
      <CommentComposer
        anchor={{ kind: "candidate", candidateId: "c1" }}
        onCancel={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByText(/on this candidate/i)).toBeInTheDocument();
  });

  it("truncates long quote anchors in the descriptor", () => {
    const longQuote = "x".repeat(100);
    render(
      <CommentComposer
        anchor={{
          kind: "text_range",
          targetKind: "candidate",
          targetId: "c1",
          quote: longQuote,
          prefix: "p",
          suffix: "s",
        }}
        onCancel={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByText(/on "x{80}…"/i)).toBeInTheDocument();
  });

  it("switches to reply mode when parentDisplayName is supplied", () => {
    render(
      <CommentComposer parentDisplayName="Donor Dana" onCancel={() => {}} onSubmit={() => {}} />
    );
    expect(screen.getByText(/replying to donor dana/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/write a reply/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reply$/i })).toBeInTheDocument();
  });

  it("caps the textarea at 5000 chars via maxLength", () => {
    render(<CommentComposer onCancel={() => {}} onSubmit={() => {}} />);
    expect(screen.getByPlaceholderText(/add a comment/i)).toHaveAttribute("maxLength", "5000");
  });

  it("renders the external error inline with role=alert", () => {
    render(
      <CommentComposer
        externalError="Slow down — try again in 30s."
        onCancel={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/slow down/i);
  });

  it("shows 'Posting…' copy while submitting and disables submit", () => {
    render(<CommentComposer isSubmitting onCancel={() => {}} onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: /posting/i })).toBeDisabled();
  });

  it("invokes onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<CommentComposer onCancel={onCancel} onSubmit={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
