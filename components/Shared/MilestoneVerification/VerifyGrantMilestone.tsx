"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMilestoneCompletionVerification } from "@/hooks/useMilestoneCompletionVerification";
import { useProjectGrantMilestones } from "@/hooks/useProjectGrantMilestones";
import type {
  GrantMilestoneWithCompletion,
  ProjectGrantMilestonesResponse,
} from "@/services/milestones";
import { useGrantMilestoneVerifyAccess } from "@/src/core/rbac/hooks/use-resource-access";
import { useProjectStore } from "@/store";
import { queryClient } from "@/utilities/query-client";
import { createProjectQueryPredicate } from "@/utilities/queryKeys";
import { MilestoneVerificationForm } from "./MilestoneVerificationForm";

export interface VerifiableGrantMilestoneParams {
  milestoneUID: string;
  chainId?: number;
  programId?: string;
  communityUID?: string;
}

interface VerifiableGrantMilestone {
  milestone: GrantMilestoneWithCompletion;
  data: ProjectGrantMilestonesResponse;
  projectUID: string;
  isMilestoneReviewer: boolean;
}

/**
 * Resolves whether the current user may verify this grant milestone from the
 * project page, and only then loads the milestone in the shape the
 * verification flow needs. Returns null until both are true.
 */
const useVerifiableGrantMilestone = ({
  milestoneUID,
  chainId,
  programId,
  communityUID,
}: VerifiableGrantMilestoneParams): VerifiableGrantMilestone | null => {
  const project = useProjectStore((state) => state.project);
  const projectUID = project?.uid ?? "";
  const { canVerify, isMilestoneReviewer } = useGrantMilestoneVerifyAccess({
    communityUID,
    programId,
    chainId,
  });
  const { data } = useProjectGrantMilestones(canVerify ? projectUID : "", programId ?? "");

  if (!canVerify || !programId || !data) return null;

  const milestone = data.grantMilestones.find(
    (item) => item.uid.toLowerCase() === milestoneUID.toLowerCase()
  );

  if (!milestone || milestone.verificationDetails) return null;

  return { milestone, data, projectUID, isMilestoneReviewer };
};

interface VerifyGrantMilestoneTriggerProps extends VerifiableGrantMilestoneParams {
  onOpen: () => void;
}

export const VerifyGrantMilestoneTrigger: FC<VerifyGrantMilestoneTriggerProps> = ({
  onOpen,
  ...params
}) => {
  const verifiable = useVerifiableGrantMilestone(params);
  if (!verifiable) return null;

  return (
    <Button type="button" variant="outline" size="sm" onClick={onOpen}>
      <CheckCircleIcon aria-hidden="true" />
      Verify milestone
    </Button>
  );
};

interface VerifyGrantMilestonePanelProps extends VerifiableGrantMilestoneParams {
  onClose: () => void;
  onVerified?: () => void;
}

export const VerifyGrantMilestonePanel: FC<VerifyGrantMilestonePanelProps> = ({
  onClose,
  onVerified,
  ...params
}) => {
  const verifiable = useVerifiableGrantMilestone(params);
  const [comment, setComment] = useState("");
  const project = useProjectStore((state) => state.project);

  const { verifyMilestone, isVerifying } = useMilestoneCompletionVerification({
    projectId: verifiable?.projectUID ?? "",
    programId: params.programId ?? "",
    onSuccess: async () => {
      onClose();
      onVerified?.();
      const predicate = createProjectQueryPredicate(
        project?.details?.slug || verifiable?.projectUID || ""
      );
      await queryClient.invalidateQueries({ predicate });
    },
  });

  if (!verifiable) return null;

  const { milestone, data, isMilestoneReviewer } = verifiable;

  return (
    <MilestoneVerificationForm
      milestoneUID={milestone.uid}
      comment={comment}
      onCommentChange={setComment}
      onSubmit={() => verifyMilestone(milestone, isMilestoneReviewer, data, comment)}
      onCancel={onClose}
      isSubmitting={isVerifying}
    />
  );
};
