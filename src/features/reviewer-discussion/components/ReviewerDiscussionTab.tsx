"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import CommentsTimeline from "@/components/FundingPlatform/ApplicationView/CommentsTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useReviewerComments } from "../hooks/use-reviewer-comments";

interface ReviewerDiscussionTabProps {
  referenceNumber: string;
  programId?: string;
  /** Resolved reviewer/admin flag. Fails closed: false renders nothing and fetches nothing. */
  canView: boolean;
  /** Admins can remove anyone's message; reviewers only their own. */
  isAdmin: boolean;
  currentUserAddress?: string;
}

export function ReviewerDiscussionTab({ canView, ...props }: ReviewerDiscussionTabProps) {
  if (!canView) {
    return null;
  }

  return <ReviewerDiscussionContent {...props} />;
}

function ReviewerDiscussionContent({
  referenceNumber,
  programId,
  isAdmin,
  currentUserAddress,
}: Omit<ReviewerDiscussionTabProps, "canView">) {
  const { comments, isLoading, error, refetch, addComment, editComment, deleteComment } =
    useReviewerComments(referenceNumber);

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Failed to load the reviewer discussion.</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <CommentsTimeline
      applicationId={referenceNumber}
      comments={comments}
      statusHistory={[]}
      isAdmin={isAdmin}
      currentUserAddress={currentUserAddress}
      isLoading={isLoading}
      onCommentAdd={addComment}
      onCommentEdit={editComment}
      onCommentDelete={deleteComment}
      programId={programId}
      enableMentions={!!programId}
      title="Reviewer Discussion"
      placeholder="Discuss this application with other reviewers... Use @ to mention reviewers."
      emptyTitle="No reviewer discussion yet"
      emptyDescription="Only reviewers and admins can see this thread. Applicants never do."
      draftKey={`reviewer-discussion:${referenceNumber}`}
    />
  );
}
