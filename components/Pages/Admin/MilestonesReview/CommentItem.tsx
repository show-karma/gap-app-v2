"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { ApplicationComment } from "@/services/comments";
import { shortAddress } from "@/utilities/shortAddress";
import { PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface CommentItemProps {
  comment: ApplicationComment;
  currentUserAddress?: string;
  isAdmin?: boolean;
  onEdit?: (commentId: string, content: string) => Promise<ApplicationComment>;
  onDelete?: (commentId: string) => Promise<void>;
}

export function CommentItem({
  comment,
  currentUserAddress,
  isAdmin = false,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync editContent when comment changes
  useEffect(() => {
    setEditContent(comment.content);
  }, [comment.content]);

  const formatDateTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Memoized computed values
  const isAuthor = useMemo(
    () => currentUserAddress?.toLowerCase() === comment.authorAddress?.toLowerCase(),
    [currentUserAddress, comment.authorAddress]
  );

  const canEdit = useMemo(
    () => !comment.isDeleted && isAuthor && !!onEdit,
    [comment.isDeleted, isAuthor, onEdit]
  );

  const canDelete = useMemo(
    () => !comment.isDeleted && (isAuthor || isAdmin) && !!onDelete,
    [comment.isDeleted, isAuthor, isAdmin, onDelete]
  );

  const handleSaveEdit = useCallback(async () => {
    if (!onEdit || editContent.trim() === comment.content) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onEdit(comment.id, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to edit comment:", error);
      // Reset content on error
      setEditContent(comment.content);
    } finally {
      setIsUpdating(false);
    }
  }, [onEdit, editContent, comment.content, comment.id]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;

    // Different confirmation messages for admins vs regular users
    const confirmMessage = isAdmin && !isAuthor
      ? "Are you sure you want to delete this comment?"
      : "Are you sure you want to delete your comment?";

    if (!window.confirm(confirmMessage)) return;

    setIsUpdating(true);
    try {
      await onDelete(comment.id);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    } finally {
      setIsUpdating(false);
    }
  }, [onDelete, comment.id, isAdmin, isAuthor]);

  const handleCancelEdit = useCallback(() => {
    setEditContent(comment.content);
    setIsEditing(false);
  }, [comment.content]);

  const handleStartEdit = useCallback(() => {
    setEditContent(comment.content);
    setIsEditing(true);
  }, [comment.content]);

  return (
    <div
      className={`p-4 rounded-lg border ${
        comment.isDeleted
          ? "opacity-60 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
          : comment.authorRole === "admin"
          ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
          : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-zinc-600 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
          {(comment.authorName || comment.authorAddress).charAt(0).toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-black dark:text-white">
                {comment.authorName || shortAddress(comment.authorAddress)}
              </span>
              {comment.authorRole === "admin" && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Admin
                </span>
              )}
              {comment.isDeleted && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                  Deleted
                </span>
              )}
            </div>

            {/* Action Buttons */}
            {!isEditing && !comment.isDeleted && (canEdit || canDelete) && (
              <div className="flex items-center gap-1">
                {canEdit && (
                  <button
                    onClick={handleStartEdit}
                    disabled={isUpdating}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Edit comment"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={isUpdating}
                    className="p-1 rounded text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete comment"
                  >
                    {isUpdating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {formatDateTime(comment.createdAt)}
            {comment.editHistory && comment.editHistory.length > 0 && (
              <span className="italic ml-1">(edited)</span>
            )}
          </p>

          {/* Content or Edit Form */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                disabled={isUpdating}
                rows={3}
                className="block w-full rounded-lg border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || isUpdating}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-3 w-3 mr-1" />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-zinc-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <XMarkIcon className="h-3 w-3 mr-1" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          )}

          {comment.isDeleted && comment.deletedAt && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Deleted on {formatDateTime(comment.deletedAt)}
              {comment.deletedBy && ` by ${shortAddress(comment.deletedBy)}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
