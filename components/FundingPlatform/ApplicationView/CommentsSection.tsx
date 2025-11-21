"use client";

import { FC } from "react";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import CommentsTimeline from "./CommentsTimeline";
import { IApplicationVersion, IFundingApplication } from "@/types/funding-platform";

interface CommentsSectionProps {
  applicationId: string;
  application?: IFundingApplication;
  comments: any[];
  statusHistory?: any[];
  versionHistory?: IApplicationVersion[];
  currentStatus: any;
  isAdmin: boolean;
  currentUserAddress?: string;
  onCommentAdd: (content: string) => Promise<void>;
  onCommentEdit: (commentId: string, content: string) => Promise<void>;
  onCommentDelete: (commentId: string) => Promise<void>;
  onVersionClick?: (versionId: string) => void;
  isLoading: boolean;
}

const CommentsSection: FC<CommentsSectionProps> = ({
  applicationId,
  application,
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
        application={application}
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
  );
};

export default CommentsSection;