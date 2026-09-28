"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMilestoneCompletionVerification } from "@/hooks/useMilestoneCompletionVerification";
import { useProjectGrantMilestones } from "@/hooks/useProjectGrantMilestones";
import { useGrantMilestoneVerifyAccess } from "@/src/core/rbac/hooks/use-resource-access";
import { useProjectStore } from "@/store";
import { queryClient } from "@/utilities/query-client";
import { createProjectQueryPredicate } from "@/utilities/queryKeys";

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
    <div className="flex w-full flex-col gap-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/10">
      <label
        htmlFor={`verify-comment-${milestoneUID}`}
        className="text-sm font-semibold text-green-900 dark:text-green-200"
      >
        Verify milestone completion
      </label>
      <Textarea
        id={`verify-comment-${milestoneUID}`}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Add a verification comment (optional)"
        rows={3}
        disabled={isVerifying}
        className="bg-white dark:bg-zinc-800"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => verifyMilestone(milestone, isMilestoneReviewer, data, comment)}
          disabled={isVerifying}
          isLoading={isVerifying}
        >
          Verify
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setIsOpen(false)}
          disabled={isVerifying}
        >
          Cancel
        </Button>
      </div>
    </div>
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
