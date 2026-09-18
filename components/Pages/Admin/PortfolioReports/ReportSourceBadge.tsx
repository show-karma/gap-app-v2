"use client";

import { Bot } from "lucide-react";
import { memo } from "react";
import type { ReportSource } from "@/types/portfolio-report";
import { resolveReportSource } from "@/utilities/portfolio-reports/source";
import { cn } from "@/utilities/tailwind";

interface Props {
  source: ReportSource | undefined | null;
  className?: string;
}

/**
 * "External" pill shown next to the status badge for reports/configs an
 * admin's own agent produced. Renders nothing for Karma-generated ones — that
 * is the default and needs no call-out.
 */
function ReportSourceBadgeComponent({ source, className }: Props) {
  if (resolveReportSource(source) !== "external") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        className
      )}
      title="Saved from an external agent"
    >
      <Bot className="h-3 w-3" aria-hidden="true" />
      External
    </span>
  );
}

export const ReportSourceBadge = memo(ReportSourceBadgeComponent);
