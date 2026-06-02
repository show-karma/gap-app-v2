"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import React, { type FC } from "react";
import type { IFundingApplication } from "@/types/funding-platform";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import { getAIScore } from "../helper/getAIScore";
import { ApplicationStatusBadge } from "./applicationStatusBadge";

interface ApplicationInboxListItemProps {
  application: IFundingApplication;
  isSelected: boolean;
  onSelect: (referenceNumber: string) => void;
  onHover?: (referenceNumber: string) => void;
}

const ApplicationInboxListItemComponent: FC<ApplicationInboxListItemProps> = ({
  application,
  isSelected,
  onSelect,
  onHover,
}) => {
  const referenceNumber = application.referenceNumber;
  const title = application.resolvedProjectName || referenceNumber;
  const aiScore = getAIScore(application);

  return (
    <button
      type="button"
      onClick={() => onSelect(referenceNumber)}
      onMouseEnter={() => onHover?.(referenceNumber)}
      aria-pressed={isSelected}
      className={cn(
        "group w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
        isSelected
          ? "border-brand-blue bg-blue-50/70 dark:border-brand-blue dark:bg-blue-950/20"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 truncate font-mono text-[11px] text-gray-400 dark:text-zinc-500">
            {referenceNumber}
          </p>
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        <ApplicationStatusBadge status={application.status} className="shrink-0" />
      </div>

      {application.applicantEmail && (
        <p className="mt-2 truncate text-xs text-gray-500 dark:text-gray-400">
          {application.applicantEmail}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 dark:text-zinc-500">
        <span>Submitted {formatDate(application.createdAt)}</span>
        {aiScore !== null && (
          <span className="inline-flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400">
            <SparklesIcon className="h-3 w-3" aria-hidden="true" />
            {aiScore}
          </span>
        )}
      </div>
    </button>
  );
};

export const ApplicationInboxListItem = React.memo(ApplicationInboxListItemComponent);
ApplicationInboxListItem.displayName = "ApplicationInboxListItem";
