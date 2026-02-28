"use client";

import { Calendar, FileText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/utilities/tailwind";
import { formatDate } from "@/utilities/formatDate";
import type { Application, ApplicationStatus } from "@/types/whitelabel-entities";

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
    case "draft":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function formatStatusLabel(status: ApplicationStatus): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getProjectTitle(application: Application): string {
  const data = application.applicationData;
  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, "");
    if (
      normalizedKey.includes("projectname") ||
      normalizedKey.includes("projecttitle") ||
      normalizedKey.includes("title")
    ) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }
  return application.referenceNumber;
}

interface ApplicationCardProps {
  application: Application;
  communityId: string;
}

export function ApplicationCard({
  application,
  communityId,
}: ApplicationCardProps) {
  const projectTitle = getProjectTitle(application);
  const isSubmitted =
    application.status === "pending" || application.status === "resubmitted";

  return (
    <Link
      href={`/community/${communityId}/applications/${application.referenceNumber}`}
      className="block h-full"
    >
      <div className="flex h-full min-h-[200px] flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-lg font-semibold text-foreground">
              {projectTitle}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {application.referenceNumber}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              getStatusColor(application.status),
            )}
          >
            {formatStatusLabel(application.status)}
          </span>
        </div>

        <div className="mt-3 flex-1">
          {application.applicationData.projectDescription ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {String(application.applicationData.projectDescription)}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {isSubmitted ? "Submitted" : "Created"}{" "}
              {formatDate(application.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-primary">
            <FileText className="h-4 w-4" />
            View
          </div>
        </div>
      </div>
    </Link>
  );
}
