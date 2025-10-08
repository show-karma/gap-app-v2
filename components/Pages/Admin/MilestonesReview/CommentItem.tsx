"use client";

import type { ApplicationComment } from "@/services/comments";
import { shortAddress } from "@/utilities/shortAddress";
import { formatDate } from "@/utilities/formatDate";

interface CommentItemProps {
  comment: ApplicationComment;
}

export function CommentItem({ comment }: CommentItemProps) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
          <div className="flex items-center gap-2 mb-1">
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

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {formatDateTime(comment.createdAt)}
            {comment.editHistory && comment.editHistory.length > 0 && (
              <span className="italic ml-1">(edited)</span>
            )}
          </p>

          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {comment.content}
          </p>

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
