"use client";

import { type FC, useRef, useState } from "react";
import { CommentInput } from "@/src/features/application-comments/components/CommentInput";
import type {
  ApplicationComment,
  FundingApplicationStatusV2,
  IApplicationVersion,
  IStatusHistoryEntry,
} from "@/types/funding-platform";
import { TimelineContainer } from "./TimelineContainer";

export interface DiscussionTabProps {
  /** Application ID */
  applicationId: string;
  /** Comments on the application */
  comments: ApplicationComment[];
  /** Status history entries */
  statusHistory?: IStatusHistoryEntry[];
  /** Version history entries */
  versionHistory?: IApplicationVersion[];
  /** Current application status */
  currentStatus: FundingApplicationStatusV2;
  /** Whether the current user is an admin */
  isAdmin: boolean;
  /** Current user's wallet address */
  currentUserAddress?: string;
  /** Callback when a comment is added */
  onCommentAdd: (content: string) => Promise<void>;
  /** Callback when a comment is edited */
  onCommentEdit: (commentId: string, content: string) => Promise<void>;
  /** Callback when a comment is deleted */
  onCommentDelete: (commentId: string) => Promise<void>;
  /** Callback when a version is clicked */
  onVersionClick?: (versionId: string) => void;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Program ID for @mention autocomplete */
  programId?: string;
  /** Enable @mention functionality */
  enableMentions?: boolean;
  /** Application reference number used to fetch grantee contacts for @-mention */
  referenceNumber?: string;
}

/**
 * Comments tab with comment input at the top and timeline below.
 * Displays comments, status changes, and version history in reverse chronological order (newest first).
 */
export const DiscussionTab: FC<DiscussionTabProps> = ({
  applicationId: _applicationId,
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
  isLoading = false,
  programId,
  enableMentions = false,
  referenceNumber,
}) => {
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const commentContentRef = useRef(commentContent);

  const handleCommentChange = (value: string) => {
    commentContentRef.current = value;
    setCommentContent(value);
  };

  const handleAddComment = async () => {
    setIsAddingComment(true);
    try {
      await onCommentAdd(commentContentRef.current.trim());
      commentContentRef.current = "";
      setCommentContent("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsAddingComment(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Comment Input at Top */}
      <div className="mb-6 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4">
        <CommentInput
          value={commentContent}
          onChange={handleCommentChange}
          onSubmit={handleAddComment}
          isLoading={isAddingComment}
          placeholder={
            isAdmin ? "Add an admin comment..." : "Add a comment for this application..."
          }
          programId={programId}
          isAdmin={isAdmin}
          referenceNumber={referenceNumber}
        />
      </div>

      {/* Timeline below (newest first) */}
      <TimelineContainer
        comments={comments}
        statusHistory={statusHistory}
        versionHistory={versionHistory}
        currentStatus={currentStatus}
        isAdmin={isAdmin}
        currentUserAddress={currentUserAddress}
        onCommentEdit={onCommentEdit}
        onCommentDelete={onCommentDelete}
        onVersionClick={onVersionClick}
        isLoading={isLoading}
        programId={programId}
        enableMentions={enableMentions}
      />
    </div>
  );
};

export default DiscussionTab;
