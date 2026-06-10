import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/Inbox/InboxBadges";

// The milestone tones/labels must stay in sync with MILESTONE_STATUS_CONFIG
// (components/Pages/Admin/MilestonesReview/utils/milestone-review-status.ts)
// so the same milestone never shows two different statuses across the
// Action Items list and the milestones review page.
describe("StatusBadge milestone statuses", () => {
  it("should_render_pending_verification_label_with_yellow_tone", () => {
    render(<StatusBadge status="pending_verification" />);

    const badge = screen.getByText("Pending Verification");
    expect(badge).toHaveClass("bg-yellow-100", "text-yellow-700");
  });

  it("should_render_completed_status_as_pending_verification", () => {
    render(<StatusBadge status="completed" />);

    const badge = screen.getByText("Pending Verification");
    expect(badge).toHaveClass("bg-yellow-100", "text-yellow-700");
  });

  it("should_render_verified_label_with_green_tone", () => {
    render(<StatusBadge status="verified" />);

    const badge = screen.getByText("Verified");
    expect(badge).toHaveClass("bg-green-100", "text-green-700");
  });

  it("should_humanize_unknown_statuses_with_neutral_tone", () => {
    render(<StatusBadge status="on_hold" />);

    const badge = screen.getByText("On Hold");
    expect(badge).toHaveClass("bg-slate-100", "text-slate-600");
  });
});
