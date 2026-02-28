"use client";

import { AlertCircle, MessageSquare, RefreshCw } from "lucide-react";
import pluralize from "pluralize";
import React, { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useApplicationComments } from "../hooks/use-application-comments";
import type { CommentTimelineProps } from "../types";
import { CommentInput } from "./CommentInput";
import { CommentItem } from "./CommentItem";
import { StatusChangeItem } from "./StatusChangeItem";

export function CommentTimeline({
  applicationId,
  statusHistory,
  currentUserAddress,
  communityId,
}: CommentTimelineProps) {
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

  if (!canViewComments) {
    return null;
  }

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

  const totalItems = timelineItems.length;

  return (
    <Accordion type="single" collapsible defaultValue="comments">
      <AccordionItem value="comments">
        <AccordionTrigger className="px-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <span className="text-xl font-semibold">Comments & Activity</span>
            <span className="text-sm text-muted-foreground">
              {totalItems} {pluralize("item", totalItems)}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-0">
          <div className="relative pb-4">
            {/* Timeline items */}
            <div className="relative space-y-4 mb-4 px-2 py-2 max-h-[500px] overflow-y-auto">
              {timelineItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-lg font-medium">No activity yet</p>
                  <p className="text-sm">Be the first to add a comment</p>
                </div>
              ) : (
                timelineItems.map((item, index) => {
                  if (item.type === "comment") {
                    const isUserComment = currentUserAddress
                      ? item.authorAddress.toLowerCase() === currentUserAddress.toLowerCase()
                      : false;

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

            {/* Comment input */}
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
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
