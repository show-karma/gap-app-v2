"use client";

import { AlertCircle, MessageSquare, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { usePublicCommenting } from "../hooks/use-public-commenting";
import { CommentInput } from "./CommentInput";
import { ConnectToCommentPrompt } from "./ConnectToCommentPrompt";
import { PublicCommentItem } from "./PublicCommentItem";

interface PublicCommentsProps {
  referenceNumber: string;
  communityId: string;
  enabled?: boolean;
  programId?: string;
  isAdmin?: boolean;
}

export function PublicComments({
  referenceNumber,
  communityId,
  enabled = true,
  programId,
  isAdmin = false,
}: PublicCommentsProps) {
  const {
    comments,
    isLoading,
    error,
    refetch,
    isAuthenticated,
    canComment,
    addComment,
    deleteComment,
    canDeleteComment,
    isAddingComment,
    isDeletingComment,
  } = usePublicCommenting({ referenceNumber, communityId, enabled });

  const [commentValue, setCommentValue] = useState("");

  const handleSubmitComment = async () => {
    if (!commentValue.trim()) return;
    await addComment(commentValue);
    setCommentValue("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner className="size-6" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <span>Failed to load comments: {error.message}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <CardTitle className="text-lg">
            {comments.length === 1 ? "1 Comment" : `${comments.length} Comments`}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment Input Section */}
        {isAuthenticated ? (
          <div data-testid="comment-input-section">
            <CommentInput
              value={commentValue}
              onChange={setCommentValue}
              onSubmit={handleSubmitComment}
              placeholder="Share your thoughts on this application..."
              disabled={!canComment}
              isLoading={isAddingComment}
              programId={programId}
              isAdmin={isAdmin}
            />
          </div>
        ) : (
          <ConnectToCommentPrompt />
        )}

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">No comments yet</p>
            <p className="text-sm">Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-4" data-testid="comments-list">
            {comments.map((comment) => (
              <PublicCommentItem
                key={comment.id}
                comment={comment}
                canDelete={canDeleteComment(comment)}
                onDelete={deleteComment}
                isDeleting={isDeletingComment}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
