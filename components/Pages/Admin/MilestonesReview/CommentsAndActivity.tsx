"use client";

import { useMemo, useCallback } from "react";
import CommentsTimeline from "@/components/FundingPlatform/ApplicationView/CommentsTimeline";
import { useApplicationComments, useApplicationVersions } from "@/hooks/useFundingPlatform";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { useOwnerStore } from "@/store";
import type {
  FundingApplicationStatusV2,
  ApplicationComment,
  IStatusHistoryEntry,
} from "@/types/funding-platform";

interface CommentsAndActivityProps {
  referenceNumber: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    reason?: string;
  }>;
  communityId: string;
  currentUserAddress?: string;
}

export function CommentsAndActivity({
  referenceNumber,
  statusHistory,
  communityId,
  currentUserAddress,
}: CommentsAndActivityProps) {
  const {
    comments,
    isLoading,
    createCommentAsync,
    editCommentAsync,
    deleteCommentAsync,
  } = useApplicationComments(referenceNumber);
  const { versions } = useApplicationVersions(referenceNumber);
  const { isCommunityAdmin } = useIsCommunityAdmin(communityId);
  const isContractOwner = useOwnerStore((state) => state.isOwner);

  // Map status history to IStatusHistoryEntry format
  const mappedStatusHistory = useMemo<IStatusHistoryEntry[]>(() => {
    return statusHistory.map((item) => ({
      status: item.status as FundingApplicationStatusV2,
      timestamp: item.timestamp,
      reason: item.reason,
    }));
  }, [statusHistory]);

  const isAdmin = isCommunityAdmin || isContractOwner;

  // Handler for adding a new comment
  const handleCommentAdd = useCallback(async (content: string) => {
    await createCommentAsync({ content });
  }, [createCommentAsync]);

  // Handler for editing an existing comment
  const handleCommentEdit = useCallback(async (commentId: string, content: string) => {
    await editCommentAsync({ commentId, content });
  }, [editCommentAsync]);

  // Handler for deleting a comment
  const handleCommentDelete = useCallback(async (commentId: string) => {
    await deleteCommentAsync(commentId);
  }, [deleteCommentAsync]);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
      <CommentsTimeline
        applicationId={referenceNumber}
        comments={comments}
        statusHistory={mappedStatusHistory}
        versionHistory={versions}
        currentStatus={
          mappedStatusHistory[mappedStatusHistory.length - 1]?.status
        }
        isAdmin={isAdmin}
        currentUserAddress={currentUserAddress}
        isLoading={isLoading}
        onCommentAdd={handleCommentAdd}
        onCommentEdit={handleCommentEdit}
        onCommentDelete={handleCommentDelete}
        onVersionClick={undefined}
      />
    </div>
  );
}
