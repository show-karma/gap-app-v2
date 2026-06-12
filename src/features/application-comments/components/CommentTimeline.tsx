"use client";

import { AlertCircle, MessageSquare, RefreshCw } from "lucide-react";
import pluralize from "pluralize";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";
import { cn } from "@/utilities/tailwind";

type ActivityFilter = "all" | "comment" | "status";

const ACTIVITY_FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "status", label: "Status" },
  { key: "comment", label: "Comments" },
];

import { useApplicationComments } from "../hooks/use-application-comments";
import type { CommentTimelineProps } from "../types";
import { CommentInput } from "./CommentInput";
import { CommentItem } from "./CommentItem";
import { StatusChangeItem } from "./StatusChangeItem";

export function CommentTimeline({ applicationId, statusHistory }: CommentTimelineProps) {
  const { user } = useAuth();
  const {
    comments,
    isLoading,
    error,
    canComment,
    canViewComments,
    addComment,
    editComment,
    deleteComment,
    refetch,
  } = useApplicationComments({
    applicationId,
    canViewComments: true,
  });

  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<ActivityFilter>("all");

  // Combine comments with status history for unified timeline
  const timelineItems = useMemo(() => {
    const items = [
      ...comments.map((c) => ({ ...c, type: "comment" as const })),
      ...statusHistory.map((s) => ({ ...s, type: "status" as const })),
    ];

    return items.sort((a, b) => {
      const dateA = new Date("createdAt" in a ? a.createdAt : a.timestamp).getTime();
      const dateB = new Date("createdAt" in b ? b.createdAt : b.timestamp).getTime();
      return dateA - dateB;
    });
  }, [comments, statusHistory]);

  if (!canViewComments) {
    return null;
  }

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(newComment);
      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    await editComment(commentId, content);
    setEditingId(null);
  };

  const handleDelete = async (commentId: string) => {
    await deleteComment(commentId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner data-testid="loading-spinner" className="size-6" />
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

  const statusCount = statusHistory.length;
  const commentCount = comments.length;
  const filteredItems =
    filter === "all" ? timelineItems : timelineItems.filter((item) => item.type === filter);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Activity</h2>
            <p className="text-[13px] text-muted-foreground">
              {pluralize("status update", statusCount, true)} ·{" "}
              {pluralize("comment", commentCount, true)}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {ACTIVITY_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors",
                filter === key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="relative mb-4 max-h-[500px] space-y-4 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-sm">Be the first to add a comment</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              if (item.type === "comment") {
                const isUserComment = user ? compareAllWallets(user, item.authorAddress) : false;

                return (
                  <div key={item.id} data-testid={`timeline-item-comment-${index}`}>
                    <CommentItem
                      comment={item}
                      isOwner={isUserComment}
                      isEditing={editingId === item.id}
                      onEdit={() => setEditingId(item.id)}
                      onSave={(content) => handleEdit(item.id, content)}
                      onCancel={() => setEditingId(null)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  </div>
                );
              }
              return (
                <div key={`status-${item.timestamp}`} data-testid={`timeline-item-status-${index}`}>
                  <StatusChangeItem status={item} />
                </div>
              );
            })
          )}
        </div>

        {canComment && (
          <CommentInput
            value={newComment}
            onChange={setNewComment}
            onSubmit={handleSubmit}
            placeholder="Add a comment..."
            disabled={isSubmitting}
            isLoading={isSubmitting}
          />
        )}
      </div>
    </section>
  );
}
