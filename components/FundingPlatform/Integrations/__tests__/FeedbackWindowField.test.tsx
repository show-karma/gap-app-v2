import { fireEvent, render, screen } from "@testing-library/react";
import { FeedbackWindowField } from "../FeedbackWindowField";

describe("FeedbackWindowField", () => {
  it("commits the parsed hours on blur when the value is a valid window", () => {
    const onCommit = vi.fn();
    render(
      <FeedbackWindowField
        programId="p1"
        value="72"
        disabled={false}
        onChange={vi.fn()}
        onCommit={onCommit}
      />
    );

    fireEvent.blur(screen.getByLabelText("Feedback window"));

    expect(onCommit).toHaveBeenCalledWith(72);
    expect(screen.getByText("hours")).toBeInTheDocument();
  });

  it("commits null for an empty or out-of-range value", () => {
    const onCommit = vi.fn();
    const { rerender } = render(
      <FeedbackWindowField
        programId="p1"
        value=""
        disabled={false}
        onChange={vi.fn()}
        onCommit={onCommit}
      />
    );
    fireEvent.blur(screen.getByLabelText("Feedback window"));
    rerender(
      <FeedbackWindowField
        programId="p1"
        value="9999"
        disabled={false}
        onChange={vi.fn()}
        onCommit={onCommit}
      />
    );
    fireEvent.blur(screen.getByLabelText("Feedback window"));

    expect(onCommit).toHaveBeenNthCalledWith(1, null);
    expect(onCommit).toHaveBeenNthCalledWith(2, null);
  });
});
