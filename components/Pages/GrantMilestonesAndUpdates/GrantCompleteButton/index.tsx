"use client"

import type {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types"
import type { FC } from "react"
import { useGrantCompletionRevoke } from "@/hooks/useGrantCompletionRevoke"
import { useOwnerStore, useProjectStore } from "@/store"
import { useCommunityAdminStore } from "@/store/communityAdmin"
import { GrantCompletedButton } from "./GrantCompletedButton"
import { GrantNotCompletedButton } from "./GrantNotCompletedButton"

interface GrantCompleteProps {
  project: IProjectResponse
  grant: IGrantResponse
  text?: string
}

export const GrantCompleteButton: FC<GrantCompleteProps> = ({
  grant,
  project,
  text = "Mark as Complete",
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner)
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin)
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin)
  const isAuthorized = isOwner || isProjectAdmin || isCommunityAdmin

  const { revokeCompletion, isRevoking } = useGrantCompletionRevoke({
    grant,
    project,
  })

  if (grant.completed) {
    return (
      <GrantCompletedButton
        onClick={revokeCompletion}
        disabled={isRevoking || !isAuthorized}
        isRevoking={isRevoking}
        isAuthorized={isAuthorized}
      />
    )
  }

  if (!isAuthorized || !project) return null

  return <GrantNotCompletedButton project={project} grantUID={grant.uid} text={text} />
}
