import { fireEvent, render, screen } from "@testing-library/react";
import { EvaluationFeedback } from "@/components/FundingPlatform/ApplicationView/IntegrationsTab/EvaluationFeedback";

const mutate = vi.fn();

vi.mock("@/hooks/useApplicationIntegrations", () => ({
  useSimocracyFeedback: () => ({ data: [] }),
  useSubmitSimocracyFeedback: () => ({ mutate, isPending: false }),
}));

const renderForm = () =>
  render(
    <EvaluationFeedback
      referenceNumber="APP-1"
      subject={{ commentUri: "at://did:plc:host/org.impactindexer.review.comment/ms-1" }}
      simUri="at://did:plc:sim/org.simocracy.sim/s1"
      canGiveFeedback
      viewerAddresses={new Set(["0xme"])}
    />
  );

describe("EvaluationFeedback", () => {
  beforeEach(() => mutate.mockClear());

  it("should_stay_quiet_until_the_reviewer_starts", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Save feedback" })).toBeDisabled();
    expect(screen.queryByText(/to save/)).toBeNull();
  });

  it("should_ask_for_a_vote_when_only_a_note_is_typed", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Feedback note"), { target: { value: "Looks right" } });

    expect(screen.getByText("Choose thumbs up or down to save.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save feedback" })).toBeDisabled();
  });

  it("should_ask_for_a_note_when_only_a_vote_is_picked", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Represented faithfully" }));

    expect(screen.getByText("Add a note to save.")).toBeVisible();
  });

  it("should_save_once_both_are_given", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Represented faithfully" }));
    fireEvent.change(screen.getByLabelText("Feedback note"), { target: { value: "Looks right" } });
    fireEvent.click(screen.getByRole("button", { name: "Save feedback" }));

    expect(screen.queryByText(/to save/)).toBeNull();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ verdict: "up", comment: "Looks right" })
    );
  });
});
