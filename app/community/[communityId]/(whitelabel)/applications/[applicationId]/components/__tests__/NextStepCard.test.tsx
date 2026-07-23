import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import type { ApplicationStatus } from "@/types/whitelabel-entities";
import { type ApplicationViewerRole, NextStepCard } from "../NextStepCard";

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

interface Overrides {
  status?: ApplicationStatus;
  viewerRole?: ApplicationViewerRole;
  hasMilestones?: boolean;
  postApprovalPending?: boolean;
  onGoToMilestones?: () => void;
  onGoToPostApproval?: () => void;
  onViewActivity?: () => void;
}

function renderCard(overrides: Overrides = {}) {
  return render(
    <NextStepCard
      status={overrides.status ?? "pending"}
      viewerRole={overrides.viewerRole ?? "owner"}
      hasMilestones={overrides.hasMilestones ?? false}
      postApprovalPending={overrides.postApprovalPending ?? false}
      editHref="/edit"
      reviewHref="/review"
      onGoToMilestones={overrides.onGoToMilestones}
      onGoToPostApproval={overrides.onGoToPostApproval}
      onViewActivity={overrides.onViewActivity}
    />
  );
}

describe("NextStepCard", () => {
  it("renders nothing for a guest viewer", () => {
    const { container } = renderCard({ viewerRole: "guest", status: "approved" });
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the admin-panel CTA for a reviewer", () => {
    renderCard({ viewerRole: "reviewer", status: "under_review" });
    expect(screen.getByText("Review this application")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /go to admin panel/i });
    expect(link).toHaveAttribute("href", "/review");
    expect(link).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it.each<[ApplicationStatus, string]>([
    ["pending", "Application submitted"],
    ["under_review", "Under review"],
    ["resubmitted", "Resubmitted"],
  ])("renders an informational card with no CTA for %s", (status, title) => {
    renderCard({ status });
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("links to the edit page when revision is requested", () => {
    renderCard({ status: "revision_requested" });
    expect(screen.getByText("Changes requested")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit application/i })).toHaveAttribute(
      "href",
      "/edit"
    );
  });

  it("offers the milestones CTA for an approved application with milestones", () => {
    const onGoToMilestones = vi.fn();
    renderCard({ status: "approved", hasMilestones: true, onGoToMilestones });
    fireEvent.click(screen.getByRole("button", { name: /go to milestones/i }));
    expect(onGoToMilestones).toHaveBeenCalledTimes(1);
  });

  it("offers the post-approval CTA when approved with a pending form and no milestones", () => {
    const onGoToPostApproval = vi.fn();
    renderCard({
      status: "approved",
      hasMilestones: false,
      postApprovalPending: true,
      onGoToPostApproval,
    });
    fireEvent.click(screen.getByRole("button", { name: /complete post-approval form/i }));
    expect(onGoToPostApproval).toHaveBeenCalledTimes(1);
  });

  it("shows a plain approved card when there are no milestones or pending form", () => {
    renderCard({ status: "approved" });
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lets a rejected applicant jump to the activity feedback", () => {
    const onViewActivity = vi.fn();
    renderCard({ status: "rejected", onViewActivity });
    fireEvent.click(screen.getByRole("button", { name: /view feedback/i }));
    expect(onViewActivity).toHaveBeenCalledTimes(1);
  });

  it("shows a rejected card with no CTA when there's no activity surface", () => {
    renderCard({ status: "rejected" }); // no onViewActivity handler
    expect(screen.getByText("Not approved this round")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
