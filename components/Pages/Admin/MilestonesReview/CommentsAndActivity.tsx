"use client";

import { Button } from "@/components/Utilities/Button";
import {
  ExclamationCircleIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { fetchApplicationComments, type ApplicationComment } from "@/services/comments";

interface StatusHistoryItem {
  status: string;
  timestamp: string;
  reason?: string;
}

interface CommentsAndActivityProps {
  referenceNumber: string;
  statusHistory: StatusHistoryItem[];
  currentUserAddress?: string;
}

type TimelineItem =
  | (ApplicationComment & { type: "comment" })
  | (StatusHistoryItem & { type: "status" });

export function CommentsAndActivity({
  referenceNumber,
  statusHistory,
  currentUserAddress,
}: CommentsAndActivityProps) {
  const [comments, setComments] = useState<ApplicationComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadComments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedComments = await fetchApplicationComments(referenceNumber);
        setComments(fetchedComments);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadComments();
  }, [referenceNumber]);

  // Combine comments with status history for unified timeline
  const timelineItems: TimelineItem[] = [
    ...comments.map((c) => ({ ...c, type: "comment" as const })),
    ...statusHistory.map((s) => ({ ...s, type: "status" as const })),
  ].sort((a, b) => {
    const dateA = new Date(
      "createdAt" in a ? a.createdAt : a.timestamp
    ).getTime();
    const dateB = new Date(
      "createdAt" in b ? b.createdAt : b.timestamp
    ).getTime();
    return dateA - dateB; // Chronological order (oldest first)
  });

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement API call to add comment
      // Note: This would require authentication setup
      console.log("Adding comment:", newComment);
      setNewComment("");
      // Refetch comments after adding
      const fetchedComments = await fetchApplicationComments(referenceNumber);
      setComments(fetchedComments);
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refetch = async () => {
    setError(null);
    try {
      const fetchedComments = await fetchApplicationComments(referenceNumber);
      setComments(fetchedComments);
    } catch (err) {
      setError(err as Error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <ExclamationCircleIcon className="w-5 h-5" />
            <span>Failed to load comments: {error.message}</span>
          </div>
          <Button
            className="flex items-center gap-2 px-3 py-2 text-sm"
            onClick={refetch}
          >
            <ArrowPathIcon className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const totalItems = timelineItems.length;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <ChatBubbleLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <div>
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Comments & Activity
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {timelineItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-sm">Be the first to add a comment</p>
            </div>
          ) : (
            timelineItems.map((item, index) => {
              if (item.type === "comment") {
                return (
                  <CommentItem
                    key={item.id}
                    comment={item}
                    currentUserAddress={currentUserAddress}
                  />
                );
              } else {
                return (
                  <StatusItem key={`status-${index}`} statusItem={item} />
                );
              }
            })
          )}
        </div>

        {/* Comment Input */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            disabled={isSubmitting}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-end mt-2">
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
              className="px-4 py-2 text-sm"
            >
              {isSubmitting ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  currentUserAddress,
}: {
  comment: ApplicationComment;
  currentUserAddress?: string;
}) {
  const isUserComment =
    currentUserAddress &&
    comment.authorAddress.toLowerCase() === currentUserAddress.toLowerCase();

  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
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
              {comment.authorName || truncateAddress(comment.authorAddress)}
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
            {formatDate(comment.createdAt)}
            {comment.editHistory && comment.editHistory.length > 0 && (
              <span className="italic ml-1">(edited)</span>
            )}
          </p>

          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {comment.content}
          </p>

          {comment.isDeleted && comment.deletedAt && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Deleted on {formatDate(comment.deletedAt)}
              {comment.deletedBy && ` by ${truncateAddress(comment.deletedBy)}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusItem({ statusItem }: { statusItem: StatusHistoryItem }) {
  const getStatusIcon = (status: string) => {
    // Import icons as needed
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300";
      case "under_review":
        return "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300";
      case "revision_requested":
        return "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300";
      case "approved":
        return "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300";
      case "rejected":
        return "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300";
      default:
        return "bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div
      className={`p-4 rounded-lg border-l-4 ${getStatusColor(statusItem.status)}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">{formatStatus(statusItem.status)}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Status Changed
            </span>
          </div>

          {statusItem.reason && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {statusItem.reason}
            </p>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(statusItem.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
}
