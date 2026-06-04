"use client";

import type { FC } from "react";
import { useGrantCompletionRevoke } from "@/hooks/useGrantCompletionRevoke";
import { useScopedCommunityAdmin } from "@/src/core/rbac/hooks/use-resource-access";
import { useOwnerStore, useProjectStore } from "@/store";
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
  // Scope community-admin to THIS grant's community (fixes the bug where a
  // community admin of any community could complete any grant).
  const { isCommunityAdmin } = useScopedCommunityAdmin(grant.communityUID, grant.chainID);
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
