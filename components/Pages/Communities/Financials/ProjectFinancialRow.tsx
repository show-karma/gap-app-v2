"use client";

import Link from "next/link";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import type { ProjectFinancialStatus } from "@/types/financials";
import formatCurrency from "@/utilities/formatCurrency";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

interface ProjectFinancialRowProps {
  project: ProjectFinancialStatus;
}

function getProgressBarColor(percentage: number): string {
  if (percentage >= 100) return "bg-green-600 dark:bg-green-500";
  if (percentage > 0) return "bg-blue-600 dark:bg-blue-500";
  return "bg-gray-400 dark:bg-gray-500";
}

export function ProjectFinancialRow({ project }: ProjectFinancialRowProps) {
  const progressBarColor = getProgressBarColor(project.disbursementPercentage);

  return (
    <Link
      href={PAGES.PROJECT.GRANT(project.projectSlug || project.projectUID, project.grantUID)}
      className="flex flex-col gap-3 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-600 hover:shadow-md transition-all"
      data-testid="project-financial-row"
    >
      {/* Header: Logo, Name, and Milestones */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ProfilePicture
            imageURL={project.logoUrl ?? undefined}
            name={project.projectName}
            size="40"
            className="h-10 w-10 min-w-10 min-h-10 border border-gray-200 dark:border-zinc-700 shadow-sm shrink-0"
            alt={project.projectName}
          />
          <span className="text-lg font-medium text-gray-900 dark:text-white truncate">
            {project.projectName}
          </span>
        </div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
          Milestones: {project.milestoneCompletion.toFixed(0)}%
        </span>
      </div>

      {/* Financial Figures: Approved, Disbursed, Remaining */}
      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col">
          <span className="text-sm text-gray-500 dark:text-gray-400">Approved</span>
          <span className="text-base font-semibold text-gray-900 dark:text-white">
            {formatCurrency(Number(project.approved))} {project.currency}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-gray-500 dark:text-gray-400">Disbursed</span>
          <span className="text-base font-semibold text-gray-900 dark:text-white">
            {formatCurrency(Number(project.disbursed))} {project.currency}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-gray-500 dark:text-gray-400">Remaining</span>
          <span className="text-base font-semibold text-gray-900 dark:text-white">
            {formatCurrency(Number(project.remaining))} {project.currency}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-1">
        <div
          className="h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-label={`Disbursement progress: ${project.disbursementPercentage.toFixed(0)}%`}
          aria-valuenow={project.disbursementPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn("h-full rounded-full transition-all", progressBarColor)}
            style={{ width: `${Math.min(project.disbursementPercentage, 100)}%` }}
          />
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {project.disbursementPercentage.toFixed(0)}% disbursed
        </span>
      </div>
    </Link>
  );
}
