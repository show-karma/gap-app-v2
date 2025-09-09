"use client";

import { FC } from "react";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import CommentsTimeline from "./CommentsTimeline";

interface CommentsSectionProps {
  applicationId: string;
  comments: any[];
  statusHistory?: any[];
  currentStatus: any;
  isAdmin: boolean;
  currentUserAddress?: string;
  onCommentAdd: (content: string) => Promise<void>;
  onCommentEdit: (commentId: string, content: string) => Promise<void>;
  onCommentDelete: (commentId: string) => Promise<void>;
  isLoading: boolean;
}

const CommentsSection: FC<CommentsSectionProps> = ({
  applicationId,
  comments,
  statusHistory = [],
  currentStatus,
  isAdmin,
  currentUserAddress,
  onCommentAdd,
  onCommentEdit,
  onCommentDelete,
  isLoading,
}) => {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <CommentsTimeline
        applicationId={applicationId}
        comments={comments}
        statusHistory={statusHistory}
        currentStatus={currentStatus}
        isAdmin={isAdmin}
        currentUserAddress={currentUserAddress}
        onCommentAdd={onCommentAdd}
        onCommentEdit={onCommentEdit}
        onCommentDelete={onCommentDelete}
        isLoading={isLoading}
      />
    </div>
  );
};

export default CommentsSection;