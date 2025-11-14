"use client"

import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline"
import type { FC } from "react"
import type { IApplicationVersion } from "@/types/funding-platform"
import CommentsTimeline from "./CommentsTimeline"

interface CommentsSectionProps {
  applicationId: string
  comments: any[]
  statusHistory?: any[]
  versionHistory?: IApplicationVersion[]
  currentStatus: any
  isAdmin: boolean
  currentUserAddress?: string
  onCommentAdd: (content: string) => Promise<void>
  onCommentEdit: (commentId: string, content: string) => Promise<void>
  onCommentDelete: (commentId: string) => Promise<void>
  onVersionClick?: (versionId: string) => void
  isLoading: boolean
}

const CommentsSection: FC<CommentsSectionProps> = ({
  applicationId,
  comments,
  statusHistory = [],
  versionHistory = [],
  currentStatus,
  isAdmin,
  currentUserAddress,
  onCommentAdd,
  onCommentEdit,
  onCommentDelete,
  onVersionClick,
  isLoading,
}) => {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <CommentsTimeline
        applicationId={applicationId}
        comments={comments}
        statusHistory={statusHistory}
        versionHistory={versionHistory}
        currentStatus={currentStatus}
        isAdmin={isAdmin}
        currentUserAddress={currentUserAddress}
        onCommentAdd={onCommentAdd}
        onCommentEdit={onCommentEdit}
        onCommentDelete={onCommentDelete}
        onVersionClick={onVersionClick}
        isLoading={isLoading}
      />
    </div>
  )
}

export default CommentsSection
