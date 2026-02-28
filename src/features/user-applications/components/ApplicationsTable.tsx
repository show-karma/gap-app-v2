"use client";

import { Edit, Eye, FileText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/utilities/tailwind";
import { formatDate } from "@/utilities/formatDate";
import type { Application, ApplicationStatus } from "@/types/whitelabel-entities";
import type { UserApplicationsSortBy } from "../types";

interface ApplicationsTableProps {
  applications: Application[];
  communityId: string;
  isLoading?: boolean;
  sortBy: UserApplicationsSortBy;
  sortOrder: "asc" | "desc";
  onSort: (column: UserApplicationsSortBy) => void;
  emptyMessage?: string;
  emptyDescription?: string;
}

function getStatusColor(status: ApplicationStatus): string {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "pending":
    case "resubmitted":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "under_review":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "revision_requested":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function formatStatusLabel(status: ApplicationStatus): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

const columns: Array<{
  key: UserApplicationsSortBy | "actions";
  label: string;
  sortable: boolean;
}> = [
  { key: "createdAt", label: "Reference", sortable: false },
  { key: "programName", label: "Program", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "submittedAt", label: "Submitted", sortable: true },
  { key: "actions", label: "Actions", sortable: false },
];

export function ApplicationsTable({
  applications,
  communityId,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  emptyMessage = "No applications found",
  emptyDescription = "You haven't submitted any applications yet.",
}: ApplicationsTableProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">
          {emptyMessage}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium text-muted-foreground">
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() =>
                      onSort(col.key as UserApplicationsSortBy)
                    }
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {col.label}
                    {sortBy === col.key && (
                      <span className="text-xs">
                        {sortOrder === "asc" ? "\u2191" : "\u2193"}
                      </span>
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {applications.map((app) => (
            <tr key={app.referenceNumber} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">
                  {app.referenceNumber}
                </p>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {app.programTitle || "Program"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    getStatusColor(app.status),
                  )}
                >
                  {formatStatusLabel(app.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(app.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Link
                    href={`/community/${communityId}/applications/${app.referenceNumber}`}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="View application"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  {app.status === "revision_requested" && (
                    <Link
                      href={`/community/${communityId}/applications/${app.referenceNumber}/edit`}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="Edit application"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
