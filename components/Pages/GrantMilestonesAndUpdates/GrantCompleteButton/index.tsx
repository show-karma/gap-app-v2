"use client";

import type { FC } from "react";
import { useGrantCompletionRevoke } from "@/hooks/useGrantCompletionRevoke";
import { useProjectAuthorization } from "@/hooks/useProjectAuthorization";
import type { Grant } from "@/types/v2/grant";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { GrantCompletedButton } from "./GrantCompletedButton";
import { GrantNotCompletedButton } from "./GrantNotCompletedButton";

interface GrantCompleteProps {
  project: ProjectResponse;
  grant: Grant;
  text?: string;
}

export const GrantCompleteButton: FC<GrantCompleteProps> = ({
  grant,
  project,
  text = "Mark as Complete",
}) => {
  const { isAuthorized, isLoading: isAuthLoading } = useProjectAuthorization(grant.communityUID);

  const { revokeCompletion, isRevoking } = useGrantCompletionRevoke({
    grant,
    project,
  });

  if (isAuthLoading) {
    return (
      <div
        aria-hidden="true"
        data-testid="grant-complete-button-skeleton"
        className="animate-pulse h-9 w-40 bg-gray-200 dark:bg-zinc-800 rounded-md"
      />
    );
  }

  if (grant.completed) {
    return (
      <GrantCompletedButton
        onClick={revokeCompletion}
        disabled={isRevoking || !isAuthorized}
        isRevoking={isRevoking}
        isAuthorized={isAuthorized}
      />
    );
  }

  if (!isAuthorized || !project) return null;

  return <GrantNotCompletedButton project={project} grantUID={grant.uid} text={text} />;
};
