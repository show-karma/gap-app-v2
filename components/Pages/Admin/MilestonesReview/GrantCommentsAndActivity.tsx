"use client";

import { useCallback, useMemo } from "react";
import CommentsTimeline from "@/components/FundingPlatform/ApplicationView/CommentsTimeline";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useGrantComments } from "@/src/features/grant-comments/hooks/use-grant-comments";
import { useOwnerStore } from "@/store";
import type { ApplicationComment } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

interface GrantCommentsAndActivityProps {
  projectUID: string;
  programId: string;
  communityId: string;
  currentUserAddress?: string;
  /** Application reference number used to fetch grantee contacts for @-mention */
  referenceNumber?: string;
  embedded?: boolean;
}

export function GrantCommentsAndActivity({
  projectUID,
  programId,
  communityId,
  currentUserAddress,
  referenceNumber,
  embedded = false,
}: GrantCommentsAndActivityProps) {
  const { comments, isLoading, createCommentAsync, editCommentAsync, deleteCommentAsync } =
    useGrantComments({ projectUID, programId });
  const { isCommunityAdmin } = useIsCommunityAdmin(communityId);
  const isContractOwner = useOwnerStore((state) => state.isOwner);

  const isAdmin = useMemo(
    () => isCommunityAdmin || isContractOwner,
    [isCommunityAdmin, isContractOwner]
  );

  // Map GrantComment[] to ApplicationComment[] shape for CommentsTimeline compatibility
  const mappedComments = useMemo<ApplicationComment[]>(() => {
    return comments.map((c) => ({
      id: c.id,
      applicationId: `${c.projectUID}/${c.programId}`,
      authorAddress: c.authorAddress,
      authorRole: c.authorRole satisfies ApplicationComment["authorRole"],
      authorName: c.authorName,
      content: c.content,
      isDeleted: c.isDeleted,
      deletedAt: c.deletedAt,
      deletedBy: c.deletedBy,
      editHistory: c.editHistory,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }, [comments]);

  const handleCommentAdd = useCallback(
    async (content: string) => {
      await createCommentAsync({ content });
    },
    [createCommentAsync]
  );

  const handleCommentEdit = useCallback(
    async (commentId: string, content: string) => {
      await editCommentAsync({ commentId, content });
    },
    [editCommentAsync]
  );

  const handleCommentDelete = useCallback(
    async (commentId: string) => {
      await deleteCommentAsync(commentId);
    },
    [deleteCommentAsync]
  );

  return (
    <div
      className={cn(
        embedded
          ? "px-0 py-0"
          : "rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-zinc-900"
      )}
    >
      <CommentsTimeline
        applicationId={`${projectUID}/${programId}`}
        comments={mappedComments}
        statusHistory={[]}
        currentStatus="pending"
        isAdmin={isAdmin}
        currentUserAddress={currentUserAddress}
        isLoading={isLoading}
        onCommentAdd={handleCommentAdd}
        onCommentEdit={handleCommentEdit}
        onCommentDelete={handleCommentDelete}
        onVersionClick={undefined}
        programId={programId}
        enableMentions={!!programId}
        referenceNumber={referenceNumber}
      />
    </div>
  );
}
