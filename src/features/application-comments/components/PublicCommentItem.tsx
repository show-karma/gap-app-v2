"use client";

import { Clock, Trash2, User } from "lucide-react";
import React, { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { formatDate } from "@/utilities/formatDate";
import { shortAddress } from "@/utilities/shortAddress";
import { cn } from "@/utilities/tailwind";
import { ROLE_BADGE_CONFIG } from "../constants";
import type { PublicCommentItemProps } from "../types";

export const PublicCommentItem = React.memo(function PublicCommentItem({
  comment,
  canDelete,
  onDelete,
  isDeleting = false,
}: PublicCommentItemProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLocalDeleting, setIsLocalDeleting] = useState(false);

  const roleConfig = ROLE_BADGE_CONFIG[comment.authorRole] ?? ROLE_BADGE_CONFIG.community;

  const handleDelete = async () => {
    setIsLocalDeleting(true);
    try {
      await onDelete(comment.id);
      setIsDialogOpen(false);
    } finally {
      setIsLocalDeleting(false);
    }
  };

  return (
    <>
      <Card
        className={cn(
          "rounded-none",
          comment.isDeleted && "opacity-60",
          comment.authorRole === "admin" && "bg-blue-50 dark:bg-blue-900/5"
        )}
        data-testid="public-comment-item"
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {comment.authorName || shortAddress(comment.authorAddress)}
                    </span>
                    <Badge
                      variant={roleConfig.variant}
                      data-testid={`role-badge-${comment.authorRole}`}
                    >
                      {roleConfig.label}
                    </Badge>
                    {comment.isDeleted && <Badge variant="destructive">Deleted</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(comment.createdAt)}</span>
                    <span>{formatDate(comment.createdAt, "local", "h:mm a")}</span>
                  </div>
                </div>

                {/* Delete action */}
                {!comment.isDeleted && canDelete && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsDialogOpen(true)}
                    aria-label="Delete comment"
                    disabled={isDeleting || isLocalDeleting}
                    className="text-destructive hover:text-destructive"
                    data-testid="delete-comment-button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Comment content with markdown support */}
              <div className="text-sm text-foreground">
                <MarkdownPreview source={comment.content} className="prose-sm max-w-none" />
              </div>

              {/* Deleted info */}
              {comment.isDeleted && comment.deletedAt && (
                <div className="text-xs text-destructive mt-2">
                  Deleted on {formatDate(comment.deletedAt)} at{" "}
                  {formatDate(comment.deletedAt, "local", "h:mm a")}
                  {comment.deletedBy && ` by ${shortAddress(comment.deletedBy)}`}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Comment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLocalDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} isLoading={isLocalDeleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
