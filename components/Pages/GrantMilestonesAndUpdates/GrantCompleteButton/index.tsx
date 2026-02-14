"use client";

import type { FC } from "react";
import { useGrantCompletionRevoke } from "@/hooks/useGrantCompletionRevoke";
import { useIsCommunityAdmin } from "@/src/core/rbac/context/permission-context";
import { useOwnerStore } from "@/store/owner";
import { useProjectStore } from "@/store/project";
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
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isCommunityAdmin = useIsCommunityAdmin();
  const isAuthorized = isOwner || isProjectAdmin || isCommunityAdmin;

  const { revokeCompletion, isRevoking } = useGrantCompletionRevoke({
    grant,
    project,
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

  return <GrantNotCompletedButton project={project} grantUID={grant.uid} text={text} />;
};
