"use client";

import { Loader2 } from "lucide-react";
import type { PortfolioReportStatus } from "@/types/portfolio-report";

const STATUS_LABEL: Record<PortfolioReportStatus, string> = {
  generating: "Generating",
  draft: "draft",
  failed: "Failed",
  published: "published",
};

const STATUS_CLASSES: Record<PortfolioReportStatus, string> = {
  generating: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  draft: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

interface Props {
  status: PortfolioReportStatus;
}

export function GenerationStatusBadge({ status }: Props) {
  const label = STATUS_LABEL[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {status === "generating" ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : null}
      {label}
    </span>
  );
}
