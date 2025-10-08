"use client";

import type { StatusHistoryItem } from "./types";

interface StatusItemProps {
  statusItem: StatusHistoryItem;
}

export function StatusItem({ statusItem }: StatusItemProps) {
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
            {formatDateTime(statusItem.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
}
