"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMilestoneCompletionVerification } from "@/hooks/useMilestoneCompletionVerification";
import { useProjectGrantMilestones } from "@/hooks/useProjectGrantMilestones";
import { useGrantMilestoneVerifyAccess } from "@/src/core/rbac/hooks/use-resource-access";
import { useProjectStore } from "@/store";
import { queryClient } from "@/utilities/query-client";
import { createProjectQueryPredicate } from "@/utilities/queryKeys";
import { MilestoneVerificationForm } from "./MilestoneVerificationForm";

interface VerifyGrantMilestoneButtonProps {
  milestoneUID: string;
  chainId?: number;
  programId?: string;
  communityUID?: string;
  onVerified?: () => void;
}

interface VerifyGrantMilestoneControlProps {
  milestoneUID: string;
  programId: string;
  isMilestoneReviewer: boolean;
  onVerified?: () => void;
}

const VerifyGrantMilestoneControl: FC<VerifyGrantMilestoneControlProps> = ({
  milestoneUID,
  programId,
  isMilestoneReviewer,
  onVerified,
}) => {
  const project = useProjectStore((state) => state.project);
  const projectUID = project?.uid ?? "";
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const { data } = useProjectGrantMilestones(projectUID, programId);

  const { verifyMilestone, isVerifying } = useMilestoneCompletionVerification({
    projectId: projectUID,
    programId,
    onSuccess: async () => {
      setIsOpen(false);
      setComment("");
      onVerified?.();
      const predicate = createProjectQueryPredicate(project?.details?.slug || projectUID);
      await queryClient.invalidateQueries({ predicate });
    },
  });

  const milestone = data?.grantMilestones.find(
    (item) => item.uid.toLowerCase() === milestoneUID.toLowerCase()
  );

  if (!data || !milestone || milestone.verificationDetails) return null;

  if (!isOpen) {
    return (
      <Button type="button" size="sm" onClick={() => setIsOpen(true)}>
        <CheckCircleIcon className="h-4 w-4" />
        Verify
      </Button>
    );
  }

  return (
    <MilestoneVerificationForm
      milestoneUID={milestoneUID}
      comment={comment}
      onCommentChange={setComment}
      onSubmit={() => verifyMilestone(milestone, isMilestoneReviewer, data, comment)}
      onCancel={() => setIsOpen(false)}
      isSubmitting={isVerifying}
    />
  );
};

export const VerifyGrantMilestoneButton: FC<VerifyGrantMilestoneButtonProps> = ({
  milestoneUID,
  chainId,
  programId,
  communityUID,
  onVerified,
}) => {
  const { canVerify, isMilestoneReviewer } = useGrantMilestoneVerifyAccess({
    communityUID,
    programId,
    chainId,
  });

  if (!canVerify || !programId) return null;

  return (
    <VerifyGrantMilestoneControl
      milestoneUID={milestoneUID}
      programId={programId}
      isMilestoneReviewer={isMilestoneReviewer}
      onVerified={onVerified}
    />
  );
};
