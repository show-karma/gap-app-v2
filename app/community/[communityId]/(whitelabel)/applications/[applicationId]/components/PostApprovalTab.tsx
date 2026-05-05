"use client";

import { type FC, useState } from "react";
import ApplicationSubmission from "@/components/FundingPlatform/ApplicationView/ApplicationSubmission";
import { PostApprovalDataView } from "@/components/FundingPlatform/ApplicationView/ApplicationTab/PostApprovalDataView";
import { usePostApprovalSubmit } from "@/src/features/applications/hooks/use-post-approval-submit";
import type { IFormSchema, IFundingApplication } from "@/types/funding-platform";
import type { Application, FundingProgram } from "@/types/whitelabel-entities";

interface PostApprovalTabProps {
  communityId: string;
  application: Application;
  program: FundingProgram | null;
  isOwner: boolean;
}

export const PostApprovalTab: FC<PostApprovalTabProps> = ({
  communityId,
  application,
  program,
  isOwner,
}) => {
  const postApprovalFormSchema = program?.applicationConfig?.postApprovalFormSchema;
  const hasExistingData =
    !!application.postApprovalData && Object.keys(application.postApprovalData).length > 0;

  // Track locally submitted data so we can show read-only view immediately
  // after submit without waiting for a server re-render
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null);

  const { submitPostApprovalForm, isSubmitting } = usePostApprovalSubmit(
    communityId,
    application.referenceNumber,
    application
  );

  const handleSubmit = async (data: Record<string, unknown>) => {
    const success = await submitPostApprovalForm(data);
    if (success) {
      setSubmittedData(data);
    }
  };

  if (!postApprovalFormSchema?.fields?.length) {
    return null;
  }

  const _dataToDisplay = submittedData ?? application.postApprovalData;
  const hasData = hasExistingData || !!submittedData;

  // Show the form if owner has no data yet
  if (isOwner && !hasData) {
    return (
      <div className="rounded-xl border border-border">
        <div className="border-b border-border p-4">
          <h2 className="text-xl font-semibold text-foreground">Post-Approval Information</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Please complete the required post-approval information below.
          </p>
        </div>
        <div className="p-6">
          <ApplicationSubmission
            programId={application.programId}
            formSchema={postApprovalFormSchema as IFormSchema}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
            initialData={application.postApprovalData as Record<string, any>}
            isEditMode={false}
          />
        </div>
      </div>
    );
  }

  // Show existing data (read-only view)
  if (hasData) {
    // Build a display-only application object with the latest data
    const displayApplication = submittedData
      ? { ...application, postApprovalData: submittedData as Record<string, unknown> }
      : application;

    return (
      <div className="rounded-xl border border-border">
        <div className="border-b border-border p-4">
          <h2 className="text-xl font-semibold text-foreground">Post-Approval Information</h2>
        </div>
        <div className="p-6">
          <PostApprovalDataView
            application={displayApplication as unknown as IFundingApplication}
            program={program as any}
          />
        </div>
      </div>
    );
  }

  // Non-owner viewing an application without post-approval data
  return (
    <div className="rounded-xl border border-border p-6 text-center">
      <p className="text-muted-foreground">Post-approval information has not been submitted yet.</p>
    </div>
  );
};
