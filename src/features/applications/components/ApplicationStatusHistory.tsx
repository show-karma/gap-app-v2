"use client";

import { Calendar, CheckCircle, Clock, Eye, FileQuestion, XCircle } from "lucide-react";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

interface StatusHistoryItem {
  status: string;
  timestamp: string;
  reason: string;
}

interface ApplicationStatusHistoryProps {
  statusHistory: StatusHistoryItem[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case "under_review":
      return <Eye className="w-4 h-4 text-blue-500" />;
    case "revision_requested":
      return <FileQuestion className="w-4 h-4 text-purple-500" />;
    case "approved":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "rejected":
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4 text-zinc-500" />;
  }
};

const getStatusBgClass = (status: string, isFirst: boolean) => {
  const base = "relative z-10 flex h-10 w-10 items-center justify-center rounded-full";
  const ring = isFirst ? " ring-4" : "";

  switch (status) {
    case "pending":
      return `${base} bg-yellow-500${isFirst ? " ring-yellow-500/20" : ""}${ring}`;
    case "under_review":
      return `${base} bg-blue-500${isFirst ? " ring-blue-500/20" : ""}${ring}`;
    case "revision_requested":
      return `${base} bg-purple-500${isFirst ? " ring-purple-500/20" : ""}${ring}`;
    case "approved":
      return `${base} bg-green-500${isFirst ? " ring-green-500/20" : ""}${ring}`;
    case "rejected":
      return `${base} bg-red-500${isFirst ? " ring-red-500/20" : ""}${ring}`;
    default:
      return `${base} bg-zinc-300${isFirst ? " ring-zinc-300/20" : ""}${ring}`;
  }
};

const formatStatusLabel = (status: string) => {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export function ApplicationStatusHistory({ statusHistory }: ApplicationStatusHistoryProps) {
  if (!statusHistory || statusHistory.length === 0) {
    return null;
  }

  const sortedHistory = [...statusHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b">
        <h3 className="text-xl font-semibold">Application History</h3>
        <p className="text-sm text-zinc-500">
          {sortedHistory.length} {sortedHistory.length === 1 ? "update" : "updates"}
        </p>
      </div>

      <div className="p-4">
        <div className="relative space-y-6">
          {sortedHistory.map((item, index) => {
            const date = formatDate(item.timestamp);
            const isLast = index === sortedHistory.length - 1;

            return (
              <div key={`${item.timestamp}-${index}`} className="relative flex gap-4">
                <div className="relative">
                  <div className={getStatusBgClass(item.status, index === 0)}>
                    <div className="flex items-center justify-center">
                      {getStatusIcon(item.status)}
                    </div>
                  </div>
                  {!isLast && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-[calc(100%+1.5rem)] bg-zinc-200 dark:bg-zinc-700" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        item.status === "approved" && "bg-green-100 text-green-700",
                        item.status === "rejected" && "bg-red-100 text-red-700",
                        item.status === "pending" && "bg-yellow-100 text-yellow-700",
                        item.status === "under_review" && "bg-blue-100 text-blue-700",
                        item.status === "revision_requested" && "bg-purple-100 text-purple-700"
                      )}
                    >
                      {formatStatusLabel(item.status)}
                    </span>
                    {index === 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        Current
                      </span>
                    )}
                  </div>

                  {item.reason && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 px-2 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800">
                      {item.reason}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-sm text-zinc-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{date}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
