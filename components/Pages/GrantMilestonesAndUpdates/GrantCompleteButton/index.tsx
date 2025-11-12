"use client";

import type { FC } from "react";
import {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useGrantCompletionRevoke } from "@/hooks/useGrantCompletionRevoke";
import { useProjectAuthorization } from "@/hooks/useProjectAuthorization";
import { GrantCompletedButton } from "./GrantCompletedButton";
import { GrantNotCompletedButton } from "./GrantNotCompletedButton";

interface GrantCompleteProps {
  project: IProjectResponse;
  grant: IGrantResponse;
  text?: string;
}

export const GrantCompleteButton: FC<GrantCompleteProps> = ({
  grant,
  project,
  text = "Mark as Complete",
}) => {
  const { isAuthorized, isOnChainAuthorized } = useProjectAuthorization();

  const { revokeCompletion, isRevoking } = useGrantCompletionRevoke({
    grant,
    project,
    isOnChainAuthorized,
  });

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

  return (
    <GrantNotCompletedButton
      project={project}
      grantUID={grant.uid}
      text={text}
    />
  );
};
