import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchFeedback } from "../components/search-feedback";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("../hooks/use-feedback", () => ({
  useSubmitFeedback: () => ({ mutate, isPending: false }),
}));

describe("SearchFeedback", () => {
  beforeEach(() => {
    mutate.mockReset();
  });

  it("renders the rating prompt and both controls", () => {
    render(<SearchFeedback traceId="t1" />);

    expect(screen.getByText("How were these results?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Helpful results" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not helpful results" })).toBeInTheDocument();
  });

  it("submits positive feedback with value 1 on Helpful", () => {
    render(<SearchFeedback traceId="trace-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Helpful results" }));

    expect(mutate).toHaveBeenCalledWith(
      { traceId: "trace-1", value: 1 },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it("does not re-submit positive feedback once selected", () => {
    render(<SearchFeedback traceId="trace-2" />);

    const button = screen.getByRole("button", { name: "Helpful results" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("opens a comment box on Not helpful and submits value -1 with the comment", () => {
    render(<SearchFeedback traceId="trace-3" />);

    fireEvent.click(screen.getByRole("button", { name: "Not helpful results" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "missing midwest funders" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));

    expect(mutate).toHaveBeenCalledWith(
      { traceId: "trace-3", value: -1, comment: "missing midwest funders" },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it("caps the comment at 2000 characters", () => {
    render(<SearchFeedback traceId="trace-4" />);

    fireEvent.click(screen.getByRole("button", { name: "Not helpful results" }));
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "x".repeat(2500) } });

    expect(textarea.value).toHaveLength(2000);
  });

  it("clears the comment and resets selection on Cancel", () => {
    render(<SearchFeedback traceId="trace-5" />);

    fireEvent.click(screen.getByRole("button", { name: "Not helpful results" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not helpful results" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows a confirmation and hides the controls after a successful submission", () => {
    mutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());
    render(<SearchFeedback traceId="trace-6" />);

    fireEvent.click(screen.getByRole("button", { name: "Helpful results" }));

    expect(screen.getByText(/Thanks for the feedback/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Helpful results" })).not.toBeInTheDocument();
  });
});
