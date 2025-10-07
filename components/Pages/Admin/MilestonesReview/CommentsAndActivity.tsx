"use client";

import { useMemo } from "react";
import { Button } from "@/components/Utilities/Button";
import {
  ExclamationCircleIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import { useApplicationComments } from "@/hooks/useApplicationComments";
import { CommentItem } from "./CommentItem";
import { StatusItem } from "./StatusItem";
import type { StatusHistoryItem, TimelineItem } from "./types";

interface CommentsAndActivityProps {
  referenceNumber: string;
  statusHistory: StatusHistoryItem[];
}

export function CommentsAndActivity({
  referenceNumber,
  statusHistory,
}: CommentsAndActivityProps) {
  const { comments, isLoading, error, refetch } = useApplicationComments(referenceNumber);

  // Combine comments with status history for unified timeline
  const timelineItems: TimelineItem[] = useMemo(() => {
    const commentItems = comments.map((c) => ({
      ...c,
      type: "comment" as const
    }));

    const statusItems = statusHistory.map((s) => ({
      ...s,
      type: "status" as const
    }));

    const combined = [...commentItems, ...statusItems];

    return combined.sort((a, b) => {
      const dateA = new Date("createdAt" in a ? a.createdAt : a.timestamp).getTime();
      const dateB = new Date("createdAt" in b ? b.createdAt : b.timestamp).getTime();
      return dateA - dateB;
    });
  }, [comments, statusHistory]);

  const totalItems = useMemo(() => timelineItems.length, [timelineItems]);

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
            onClick={() => refetch()}
          >
            <ArrowPathIcon className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

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
        <div className="max-h-[500px] overflow-y-auto">
          {timelineItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-sm">No comments or status changes to display</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line connecting all items */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-zinc-700" />

              {timelineItems.map((item, index) => (
                <div key={item.type === "comment" ? item.id : `status-${index}`} className="relative pb-8 last:pb-0">
                  {/* Timeline dot */}
                  <div className="absolute left-4 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400 border-2 border-white dark:border-zinc-900" />

                  {/* Content with left padding to account for timeline */}
                  <div className="ml-10">
                    {item.type === "comment" ? (
                      <CommentItem comment={item} />
                    ) : (
                      <StatusItem statusItem={item} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
