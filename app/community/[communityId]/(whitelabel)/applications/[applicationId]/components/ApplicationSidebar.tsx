"use client";

import type { Application, FundingProgram } from "@/types/whitelabel-entities";
import { ApplicationInfoCard } from "./ApplicationInfoCard";
import { ApplicationStatusStepper } from "./ApplicationStatusStepper";
import { type ApplicationViewerRole, NextStepCard } from "./NextStepCard";

interface ApplicationSidebarProps {
  application: Application;
  program: FundingProgram | null;
  programName: string;
  viewerRole: ApplicationViewerRole;
  hasMilestones: boolean;
  postApprovalPending: boolean;
  editHref: string;
  reviewHref: string;
  /**
   * Status history with `reason` bodies already gated for the current viewer.
   * Passed in (rather than read from `application`) so the rejection/revision
   * communications are only shown to the applicant, reviewers, and admins.
   */
  statusHistory: Application["statusHistory"];
  onGoToMilestones?: () => void;
  onGoToPostApproval?: () => void;
  onViewActivity?: () => void;
}

export function ApplicationSidebar({
  application,
  program,
  programName,
  viewerRole,
  hasMilestones,
  postApprovalPending,
  editHref,
  reviewHref,
  statusHistory,
  onGoToMilestones,
  onGoToPostApproval,
  onViewActivity,
}: ApplicationSidebarProps) {
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
      <NextStepCard
        status={application.status}
        viewerRole={viewerRole}
        hasMilestones={hasMilestones}
        postApprovalPending={postApprovalPending}
        editHref={editHref}
        reviewHref={reviewHref}
        onGoToMilestones={onGoToMilestones}
        onGoToPostApproval={onGoToPostApproval}
        onViewActivity={onViewActivity}
      />

      <ApplicationStatusStepper status={application.status} statusHistory={statusHistory || []} />

      <ApplicationInfoCard
        referenceNumber={application.referenceNumber}
        programName={programName}
        lastSubmission={application.updatedAt}
        deadline={program?.metadata.endsAt}
        applicantEmail={application.applicantEmail}
        ownerAddress={application.ownerAddress}
      />
    </aside>
  );
}
