import { FC } from "react";
import Link from "next/link";
import { cn } from "@/utilities/tailwind";
import { formatDate } from "@/utilities/formatDate";
import { ReadMore } from "@/utilities/ReadMore";
import { CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import { ActivityAttribution } from "@/components/Shared/ActivityCard/ActivityAttribution";
import { containerClassName } from "@/components/Shared/ActivityCard";

interface CommunityMilestoneCardProps {
  milestone: {
    uid: string;
    communityUID: string;
    status: "pending" | "completed";
    details: {
      title: string;
      description: string;
      dueDate: string | null;
    };
    project: {
      uid: string;
      details: {
        data: {
          title: string;
          slug: string;
        };
      };
    };
    grant?: {
      uid: string;
      details: {
        data: {
          title: string;
        };
      };
    };
    createdAt: string;
    updatedAt: string;
  };
}

export const CommunityMilestoneCard: FC<CommunityMilestoneCardProps> = ({
  milestone,
}) => {
  const isCompleted = milestone.status === "completed";
  const projectSlug = milestone.project.details.data.slug;
  const projectTitle = milestone.project.details.data.title;
  const grantTitle = milestone.grant?.details?.data?.title || "Project Milestone";

  return (
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
            href={`/project/${projectSlug}/grants/${milestone.grant.uid}`}
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
      <ActivityAttribution
        createdAt={isCompleted ? milestone.updatedAt : milestone.createdAt}
        attester=""
        isCompleted={isCompleted}
      />
    </div>
  );
};