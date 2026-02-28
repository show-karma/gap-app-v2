"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/utilities/tailwind";

interface ApplicationStatusChipProps {
  status: string;
  size?: "sm" | "md" | "lg";
  onlyShowApproved?: boolean;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  canceled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  resubmitted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  revision_requested: "bg-secondary text-secondary-foreground",
  under_review: "bg-primary/10 text-primary",
  submitted: "bg-primary/10 text-primary",
  draft: "bg-muted text-muted-foreground",
};

const SIZE_CLASSES: Record<string, string> = {
  sm: "text-[10px] px-1.5 py-0",
  md: "text-xs px-2.5 py-0.5",
  lg: "text-sm px-3 py-1",
};

function getStatusStyle(status: string): string {
  const normalized = status.toLowerCase().replace(/-/g, "_");
  return STATUS_STYLES[normalized] ?? "bg-muted text-muted-foreground";
}

function formatStatus(status: string): string {
  const lower = status.toLowerCase();
  const labels: Record<string, string> = {
    pending: "Pending",
    resubmitted: "Resubmitted",
    approved: "Approved",
    accepted: "Accepted",
    rejected: "Rejected",
    canceled: "Cancelled",
    cancelled: "Cancelled",
    submitted: "Submitted",
    under_review: "Under Review",
    revision_requested: "Revision Requested",
    draft: "Draft",
  };
  return (
    labels[lower] ??
    status
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
  );
}

export function ApplicationStatusChip({
  status,
  size = "md",
  onlyShowApproved = false,
  className,
}: ApplicationStatusChipProps) {
  if (onlyShowApproved && status !== "approved") {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent font-medium capitalize",
        getStatusStyle(status),
        SIZE_CLASSES[size],
        className
      )}
    >
      {formatStatus(status)}
    </Badge>
  );
}
