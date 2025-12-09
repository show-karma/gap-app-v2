import { CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { type FC, memo } from "react";
import { containerClassName } from "@/components/Shared/ActivityCard";
import { ActivityAttribution } from "@/components/Shared/ActivityCard/ActivityAttribution";
import type { CommunityMilestoneUpdate } from "@/types/community-updates";
import { formatDate } from "@/utilities/formatDate";
import { ReadMore } from "@/utilities/ReadMore";
import { cn } from "@/utilities/tailwind";
import { MilestoneCompletionInfo } from "./MilestoneCompletionInfo";

interface CommunityMilestoneCardProps {
  milestone: CommunityMilestoneUpdate;
}

const CommunityMilestoneCardComponent: FC<CommunityMilestoneCardProps> = ({ milestone }) => {
  const isCompleted = milestone.status === "completed";
  const projectDetails = milestone.project.details as { slug?: string; title?: string } | undefined;
  const projectSlug = projectDetails?.slug;
  const projectTitle = projectDetails?.title;
  const grantDetails = milestone.grant?.details as { title?: string } | undefined;
  const grantTitle = grantDetails?.title || "Project Milestone";

  return (
    <div className="flex flex-col w-full gap-2.5 md:gap-5">
      <div className={cn(containerClassName, "flex flex-col w-full")}>
        <div className="flex flex-col gap-3 w-full px-5 py-4">
          {/* Project and Grant Info */}
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Link
                href={`/project/${projectSlug}`}
                className="font-medium hover:text-brand-blue hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {projectTitle}
              </Link>
              <span>•</span>
              <span>{grantTitle}</span>
            </div>
          </div>

          {/* Status and Due Date */}
          <div className="flex flex-row items-center gap-3">
            <div
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                isCompleted
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              )}
            >
              {isCompleted ? (
                <CheckCircleIcon className="h-3 w-3" />
              ) : (
                <ClockIcon className="h-3 w-3" />
              )}
              {isCompleted ? "Completed" : "Pending"}
            </div>
            {!isCompleted && milestone.details.dueDate && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Due {formatDate(milestone.details.dueDate)}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-[#101828] dark:text-zinc-100">
            {milestone.details.title}
          </h3>

          {/* Description */}
          {milestone.details.description && (
            <div className="flex flex-col my-2">
              <ReadMore side="left">{milestone.details.description}</ReadMore>
            </div>
          )}

          {/* View Full Milestone Link */}
          {milestone.grant ? (
            <Link
              href={`/project/${projectSlug}/funding/${milestone.grant.uid}`}
              className="text-brand-blue hover:underline text-sm font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              View full milestone →
            </Link>
          ) : (
            <Link
              href={`/project/${projectSlug}/updates`}
              className="text-brand-blue hover:underline text-sm font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              View project updates →
            </Link>
          )}
        </div>

        {/* Attribution */}
        {(isCompleted ? milestone?.updatedAt : milestone?.createdAt) ? (
          <ActivityAttribution
            date={isCompleted ? milestone?.updatedAt : milestone?.createdAt}
            attester=""
            isCompleted={isCompleted}
          />
        ) : null}
      </div>

      {isCompleted && milestone.details.completionReason && (
        <div className="flex flex-col w-full pl-8 md:pl-[120px]">
          <MilestoneCompletionInfo
            completionReason={milestone.details.completionReason}
            completionDate={milestone.details.completionDate}
            completedBy={milestone.details.completedBy}
          />
        </div>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const CommunityMilestoneCard = memo(CommunityMilestoneCardComponent);
