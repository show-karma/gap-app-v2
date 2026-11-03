import { render, screen, within } from "@testing-library/react";
import { FundingPipeline } from "@/components/Inbox/FundingPipeline";
import type { IMilestoneTimeline } from "@/types/funding-platform";

const timeline = (overrides: Partial<IMilestoneTimeline> = {}): IMilestoneTimeline => ({
  milestoneUid: "ms-1",
  milestoneTitle: "M1",
  grantUid: "grant-1",
  grantTitle: "G",
  projectUid: "proj-1",
  projectTitle: "Proj",
  projectSlug: "p",
  programId: "959",
  currentStatus: "completed",
  dueDate: "2026-03-30T00:00:00.000Z",
  attentionReason: "invoice_unpaid",
  stageAgeDays: 77,
  events: [
    { type: "created", at: "2026-01-01T00:00:00.000Z" },
    { type: "completed", at: "2026-05-21T00:00:00.000Z" },
    { type: "verified", at: "2026-06-29T00:00:00.000Z" },
    { type: "invoice_received", at: "2026-08-07T00:00:00.000Z" },
  ],
  stageDurations: { toDeliveryDays: 140, inReviewDays: 39, toInvoiceDays: 78, toPaymentDays: null },
  invoice: null,
  ...overrides,
});

const step = (label: string) => screen.getByText(label).closest("li") as HTMLElement;

describe("FundingPipeline", () => {
  it("should_date_each_passed_step_and_mark_the_first_open_one_current", () => {
    render(<FundingPipeline timeline={timeline()} />);

    expect(within(step("Milestone due")).getByText("Submitted May 21, 2026")).toBeInTheDocument();
    expect(within(step("Review")).getByText("Verified Jun 29, 2026")).toBeInTheDocument();
    expect(within(step("Invoice due")).getByText("Received Aug 7, 2026")).toBeInTheDocument();
    expect(within(step("Payment due")).getByText("Not paid")).toBeInTheDocument();
    expect(step("Payment due")).toHaveAttribute("aria-current", "step");
    expect(step("Review")).not.toHaveAttribute("aria-current");
  });

  it("should_show_the_due_date_while_the_milestone_is_not_delivered", () => {
    render(
      <FundingPipeline
        timeline={timeline({ events: [], attentionReason: "past_due", currentStatus: null })}
      />
    );

    expect(
      within(step("Milestone due")).getByText("Due Mar 30, 2026 · 77 days late")
    ).toBeInTheDocument();
    expect(step("Milestone due")).toHaveAttribute("aria-current", "step");
    expect(within(step("Review")).getByText("Not verified")).toBeInTheDocument();
  });

  it("should_show_a_payment_override_and_a_requested_invoice", () => {
    render(
      <FundingPipeline
        timeline={timeline({
          events: [
            { type: "completed", at: "2026-05-21T00:00:00.000Z" },
            { type: "verified", at: "2026-06-29T00:00:00.000Z" },
            { type: "invoice_sent", at: "2026-07-01T00:00:00.000Z" },
          ],
          invoice: {
            status: "pending",
            sentAt: "2026-07-01T00:00:00.000Z",
            receivedAt: null,
            receivedBy: null,
            fileUrl: null,
            paymentStatusOverride: "pending",
            paymentStatusOverrideDate: null,
            paymentStatusOverrideBy: null,
          },
        })}
      />
    );

    expect(within(step("Invoice due")).getByText("Requested Jul 1, 2026")).toBeInTheDocument();
    expect(within(step("Payment due")).getByText("Marked pending")).toBeInTheDocument();
  });

  it("should_send_a_rejected_milestone_back_to_the_first_step_until_it_is_resubmitted", () => {
    render(
      <FundingPipeline
        timeline={timeline({
          events: [
            { type: "completed", at: "2026-01-10T00:00:00.000Z" },
            { type: "rejected", at: "2026-02-01T00:00:00.000Z" },
          ],
          attentionReason: "past_due",
        })}
      />
    );

    expect(
      within(step("Milestone due")).getByText("Rejected Feb 1, 2026 · 77 days late")
    ).toBeInTheDocument();
    expect(step("Milestone due")).toHaveAttribute("aria-current", "step");
    expect(within(step("Review")).getByText("Not verified")).toBeInTheDocument();
  });

  it("should_ignore_a_rejection_that_predates_the_latest_delivery", () => {
    render(
      <FundingPipeline
        timeline={timeline({
          events: [
            { type: "completed", at: "2026-01-10T00:00:00.000Z" },
            { type: "rejected", at: "2026-02-01T00:00:00.000Z" },
            { type: "completed", at: "2026-03-01T00:00:00.000Z" },
          ],
          attentionReason: "awaiting_review",
        })}
      />
    );

    expect(within(step("Milestone due")).getByText("Submitted Mar 1, 2026")).toBeInTheDocument();
    expect(step("Review")).toHaveAttribute("aria-current", "step");
  });

  it("should_pass_the_invoice_step_when_payment_was_recorded_without_one", () => {
    render(
      <FundingPipeline
        timeline={timeline({
          events: [
            { type: "completed", at: "2026-05-21T00:00:00.000Z" },
            { type: "verified", at: "2026-06-29T00:00:00.000Z" },
            { type: "payment_disbursed", at: "2026-08-07T00:00:00.000Z" },
          ],
          attentionReason: null,
        })}
      />
    );

    expect(within(step("Invoice due")).getByText("No invoice")).toBeInTheDocument();
    expect(within(step("Payment due")).getByText("Paid Aug 7, 2026")).toBeInTheDocument();
    expect(screen.queryByRole("listitem", { current: "step" })).not.toBeInTheDocument();
  });

  it("should_keep_review_open_when_the_invoice_arrived_before_verification", () => {
    render(
      <FundingPipeline
        timeline={timeline({
          events: [
            { type: "completed", at: "2026-09-28T00:00:00.000Z" },
            { type: "invoice_received", at: "2026-09-28T00:00:00.000Z" },
          ],
          attentionReason: "awaiting_review",
        })}
      />
    );

    expect(within(step("Milestone due")).getByText("Submitted Sep 28, 2026")).toBeInTheDocument();
    expect(within(step("Review")).getByText("Not verified")).toBeInTheDocument();
    expect(step("Review")).toHaveAttribute("aria-current", "step");
    expect(within(step("Invoice due")).getByText("Received Sep 28, 2026")).toBeInTheDocument();
    expect(within(step("Payment due")).getByText("Not paid")).toBeInTheDocument();
    expect(step("Payment due")).not.toHaveAttribute("aria-current");
  });
});
