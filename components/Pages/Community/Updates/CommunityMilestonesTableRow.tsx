import { CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import { type FC, memo } from "react";
import { Link } from "@/src/components/navigation/Link";
import type { CommunityMilestoneUpdate } from "@/types/community-updates";
import { formatDate } from "@/utilities/formatDate";
import {
  getEffectiveMilestoneStatus,
  MILESTONE_STATUS_LABEL,
} from "@/utilities/milestones/getEffectiveMilestoneStatus";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { STATUS_BADGE_CLASSES } from "./milestoneStatusStyles";

interface CommunityMilestonesTableRowProps {
  milestone: CommunityMilestoneUpdate;
  allocationAmount?: string;
}

const cellClasses = "px-4 py-3 align-top";
const placeholder = <span className="text-sm text-gray-400 dark:text-gray-500">—</span>;

const CommunityMilestonesTableRowComponent: FC<CommunityMilestonesTableRowProps> = ({
  milestone,
  allocationAmount,
}) => {
  const isCompleted = milestone.status === "completed";
  const projectSlug = milestone.project.details?.data?.slug || milestone.project.uid;
  const projectTitle = milestone.project.details?.data?.title;
  const grantTitle = milestone.grant?.details?.data?.title || "Project Milestone";

  const effectiveStatus = getEffectiveMilestoneStatus(milestone.status, milestone.details.dueDate);

  const grantHref = milestone.grant
    ? PAGES.PROJECT.GRANT(projectSlug, milestone.grant.uid)
    : undefined;

  const viewHref = grantHref ?? PAGES.PROJECT.UPDATES(projectSlug);

  const hasMilestonePosition =
    milestone.grantMilestoneIndex != null && milestone.grantMilestoneTotal != null;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
      {/* Milestone title + description */}
      <td className={cn(cellClasses, "max-w-[280px]")}>
        <div className="flex flex-col gap-1">
          <Link
            href={viewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-900 dark:text-white hover:text-brand-blue hover:underline line-clamp-2"
          >
            {milestone.details.title}
          </Link>
          {milestone.details.description ? (
            <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {milestone.details.description}
            </span>
          ) : null}
        </div>
      </td>

      {/* Project */}
      <td className={cn(cellClasses, "max-w-[180px]")}>
        {projectTitle ? (
          <Link
            href={PAGES.PROJECT.OVERVIEW(projectSlug)}
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-brand-blue hover:underline line-clamp-2"
          >
            {projectTitle}
          </Link>
        ) : (
          placeholder
        )}
      </td>

      {/* Grant / Program */}
      <td className={cn(cellClasses, "max-w-[180px]")}>
        {grantHref ? (
          <Link
            href={grantHref}
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-brand-blue hover:underline line-clamp-2"
          >
            {grantTitle}
          </Link>
        ) : (
          <span className="text-sm text-gray-600 dark:text-gray-300">{grantTitle}</span>
        )}
      </td>

      {/* Status */}
      <td className={cellClasses}>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
            STATUS_BADGE_CLASSES[effectiveStatus]
          )}
        >
          {isCompleted ? (
            <CheckCircleIcon className="h-3 w-3" />
          ) : (
            <ClockIcon className="h-3 w-3" />
          )}
          {MILESTONE_STATUS_LABEL[effectiveStatus]}
        </div>
      </td>

      {/* Due date */}
      <td className={cellClasses}>
        {milestone.details.dueDate ? (
          <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {formatDate(milestone.details.dueDate)}
          </span>
        ) : (
          placeholder
        )}
      </td>

      {/* Allocation amount */}
      <td className={cellClasses}>
        {allocationAmount ? (
          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 whitespace-nowrap">
            {allocationAmount}
          </span>
        ) : (
          placeholder
        )}
      </td>

      {/* Milestone X of Y */}
      <td className={cellClasses}>
        {hasMilestonePosition
          ? (() => {
              const index = milestone.grantMilestoneIndex as number;
              const total = milestone.grantMilestoneTotal as number;
              const progressPct = total > 0 ? Math.min(100, Math.max(0, (index / total) * 100)) : 0;
              return (
                <div className="flex flex-col gap-1 min-w-[88px]">
                  <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap tabular-nums">
                    {index} of {total}
                  </span>
                  <div
                    aria-hidden="true"
                    className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700"
                  >
                    <div
                      className={cn(
                        "h-full origin-left rounded-full transition-[width] duration-300 ease-out",
                        progressPct >= 100
                          ? "bg-green-500 dark:bg-green-400"
                          : "bg-brand-blue dark:bg-blue-400"
                      )}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })()
          : placeholder}
      </td>

      {/* Completion date */}
      <td className={cellClasses}>
        {milestone.details.completionDate ? (
          <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {formatDate(milestone.details.completionDate)}
          </span>
        ) : (
          placeholder
        )}
      </td>
    </tr>
  );
};

export const CommunityMilestonesTableRow = memo(CommunityMilestonesTableRowComponent);
