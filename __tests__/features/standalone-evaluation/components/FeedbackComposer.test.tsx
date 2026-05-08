/**
 * @file Tests the disabled-without-sample state of FeedbackComposer.
 */
import { render, screen } from "@testing-library/react";

import { FeedbackComposer } from "@/src/features/standalone-evaluation/components/FeedbackComposer";

describe("FeedbackComposer", () => {
  it("shows the empty-state hint when there is no sample", () => {
    render(<FeedbackComposer hasSample={false} isPending={false} onSubmit={() => {}} />);
    expect(
      screen.getByText(/Run an initial evaluation on a sample application/i)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Feedback")).not.toBeInTheDocument();
  });

  it("renders the textarea when a sample is set", () => {
    render(<FeedbackComposer hasSample isPending={false} onSubmit={() => {}} />);
    expect(screen.getByLabelText("Feedback")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Re-evaluate/i })).toBeDisabled(); // empty feedback shouldn't allow submit
  });
});
