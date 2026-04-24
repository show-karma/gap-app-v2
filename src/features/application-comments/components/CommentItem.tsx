"use client";

import { Clock, Edit2, Save, Trash2, User, X } from "lucide-react";
import React, { useState } from "react";
import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
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
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import { ROLE_BADGE_CONFIG } from "../constants";
import type { CommentItemProps } from "../types";
import { CommentMarkdownInput } from "./CommentMarkdownInput";

export const CommentItem = React.memo(function CommentItem({
  comment,
  isOwner,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: CommentItemProps) {
  const roleConfig = ROLE_BADGE_CONFIG[comment.authorRole] ?? ROLE_BADGE_CONFIG.community;
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    if (!editContent.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(editContent);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
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
        data-testid="comment-item"
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.authorName || (
                        <EthereumAddressToProfileName address={comment.authorAddress} />
                      )}
                    </span>
                    <Badge variant={roleConfig.variant}>{roleConfig.label}</Badge>
                    {comment.isDeleted && <Badge variant="destructive">Deleted</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(comment.createdAt)}</span>
                    <span>{formatDate(comment.createdAt, "local", "h:mm a")}</span>
                    {comment.editHistory && comment.editHistory.length > 0 && (
                      <span className="italic">(edited)</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!comment.isDeleted && isOwner && !isEditing && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      aria-label="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Content or Edit Form */}
              {isEditing ? (
                <div className="space-y-2">
                  <CommentMarkdownInput
                    value={editContent}
                    onChange={setEditContent}
                    onSubmit={handleSave}
                    placeholder="Edit your comment... (Ctrl+Enter to save)"
                    disabled={isSaving}
                    minHeight={100}
                    maxHeight={250}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} isLoading={isSaving}>
                      <Save className="w-4 h-4" />
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-foreground">
                  <MarkdownPreview source={comment.content} className="prose-sm max-w-none" />
                </div>
              )}

              {/* Deleted info */}
              {comment.isDeleted && comment.deletedAt && (
                <div className="text-xs text-destructive mt-2">
                  Deleted on {formatDate(comment.deletedAt)} at{" "}
                  {formatDate(comment.deletedAt, "local", "h:mm a")}
                  {comment.deletedBy && (
                    <>
                      {" "}
                      by <EthereumAddressToProfileName address={comment.deletedBy} />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} isLoading={isDeleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
