import { CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import { type FC, memo } from "react";
import { MilestoneCardLayout } from "@/components/Shared/ActivityCard/MilestoneCardLayout";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/src/components/navigation/Link";
import type { CommunityMilestoneUpdate } from "@/types/community-updates";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import { MilestoneCompletionInfo } from "./MilestoneCompletionInfo";

const MilestoneAIEvaluationBadge = dynamic(
  () =>
    import("@/components/Milestone/MilestoneAIEvaluationBadge").then(
      (m) => m.MilestoneAIEvaluationBadge
    ),
  { ssr: false }
);

interface CommunityMilestoneCardProps {
  milestone: CommunityMilestoneUpdate;
  allocationAmount?: string;
}

type MilestoneStatusVariant = "completed" | "pastDue" | "pending";

const STATUS_BADGE_CLASSES: Record<MilestoneStatusVariant, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pastDue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

const STATUS_BADGE_LABELS: Record<MilestoneStatusVariant, string> = {
  completed: "Completed",
  pastDue: "Past Due",
  pending: "Pending",
};

const getStatusVariant = (
  status: CommunityMilestoneUpdate["status"],
  dueDate: string | null
): MilestoneStatusVariant => {
  if (status === "completed") return "completed";
  if (dueDate && new Date(dueDate) < new Date()) return "pastDue";
  return "pending";
};

const CommunityMilestoneCardComponent: FC<CommunityMilestoneCardProps> = ({
  milestone,
  allocationAmount,
}) => {
  const isCompleted = milestone.status === "completed";
  const projectSlug = milestone.project.details?.data?.slug || milestone.project.uid;
  const projectTitle = milestone.project.details?.data?.title;
  const grantTitle = milestone.grant?.details?.data?.title || "Project Milestone";

  const statusVariant = getStatusVariant(milestone.status, milestone.details.dueDate);

  const header = (
    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
      <span className="font-bold">{projectTitle}</span>
      {milestone.grant ? (
        <Link
          href={`/project/${projectSlug}/funding/${milestone.grant.uid}`}
          className="hover:text-brand-blue hover:underline"
        >
          {grantTitle}
        </Link>
      ) : (
        <span>{grantTitle}</span>
      )}
    </div>
  );

  const pills = (
    <>
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
          STATUS_BADGE_CLASSES[statusVariant]
        )}
      >
        {isCompleted ? <CheckCircleIcon className="h-3 w-3" /> : <ClockIcon className="h-3 w-3" />}
        {STATUS_BADGE_LABELS[statusVariant]}
      </div>
      {milestone.grantMilestoneIndex != null && milestone.grantMilestoneTotal != null ? (
        <Badge
          variant="secondary"
          className="bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-950"
        >
          Milestone {milestone.grantMilestoneIndex} of {milestone.grantMilestoneTotal}
        </Badge>
      ) : null}
      {allocationAmount ? (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
          {allocationAmount}
        </span>
      ) : null}
      {!isCompleted && milestone.details.dueDate && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Due {formatDate(milestone.details.dueDate)}
        </span>
      )}
      {isCompleted && milestone.uid && milestone.details.completionReason ? (
        <MilestoneAIEvaluationBadge
          milestoneUID={milestone.uid}
          completionReason={milestone.details.completionReason}
        />
      ) : null}
    </>
  );

  const viewLink = milestone.grant
    ? {
        href: `/project/${projectSlug}/funding/${milestone.grant.uid}`,
        label: "View full milestone →",
        external: true,
      }
    : {
        href: `/project/${projectSlug}/updates`,
        label: "View project updates →",
        external: true,
      };

  const attributionDate = isCompleted ? milestone?.updatedAt : milestone?.createdAt;

  return (
    <div className="flex flex-col w-full gap-2.5 md:gap-5">
      <MilestoneCardLayout
        header={header}
        pills={pills}
        title={milestone.details.title}
        description={milestone.details.description}
        viewLink={viewLink}
        attributionDate={attributionDate || undefined}
        attributionIsCompleted={isCompleted}
      />

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
