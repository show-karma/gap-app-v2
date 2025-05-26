import { FC } from "react";
import Link from "next/link";
import { useMilestoneActions } from "@/hooks/useMilestoneActions";
import { ActivityStatus } from "./ActivityStatus";
import { ActivityStatusHeader } from "./ActivityStatusHeader";
import { ActivityAttribution } from "./ActivityAttribution";
import { GrantAssociation } from "./GrantAssociation";
import { ReadMore } from "@/utilities/ReadMore";
import { formatDate } from "@/utilities/formatDate";
import { UnifiedMilestone } from "@/types/roadmap";
import dynamic from "next/dynamic";

const ProjectObjectiveCompletion = dynamic(
  () =>
    import("@/components/Forms/ProjectObjectiveCompletion").then(
      (mod) => mod.ProjectObjectiveCompletionForm
    ),
  {
    ssr: false,
  }
);

const ObjectiveOptionsMenu = dynamic(
  () =>
    import("@/components/Pages/Project/Objective/Options").then(
      (mod) => mod.ObjectiveOptionsMenu
    ),
  {
    ssr: false,
  }
);

const GrantMilestoneOptionsMenu = dynamic(
  () =>
    import("@/components/Milestone/GrantMilestoneOptionsMenu").then(
      (mod) => mod.GrantMilestoneOptionsMenu
    ),
  {
    ssr: false,
  }
);

const GrantMilestoneCompletion = dynamic(
  () =>
    import("@/components/Forms/GrantMilestoneCompletion").then(
      (mod) => mod.GrantMilestoneCompletionForm
    ),
  {
    ssr: false,
  }
);

interface MilestoneCardProps {
  milestone: UnifiedMilestone;
  isAuthorized: boolean;
}

export const MilestoneCard: FC<MilestoneCardProps> = ({
  milestone,
  isAuthorized,
}) => {
  const { isCompleting, handleCompleting } = useMilestoneActions();
  const { title, description, completed, type } = milestone;

  // project milestone-specific properties
  const projectMilestone = milestone.source.projectMilestone;
  const attester =
    projectMilestone?.attester ||
    milestone.source.grantMilestone?.milestone.attester ||
    "";
  const createdAt = milestone.createdAt;

  // grant milestone-specific properties
  const grantMilestone = milestone.source.grantMilestone;
  const grantTitle = grantMilestone?.grant.details?.data.title;
  const programId = grantMilestone?.grant.details?.data.programId;
  const communityData = grantMilestone?.grant.community?.details?.data;
  const endsAt = milestone.endsAt;

  // completion information
  const completionReason =
    projectMilestone?.completed?.data?.reason ||
    grantMilestone?.milestone.completed?.data?.reason;
  const completionProof =
    projectMilestone?.completed?.data?.proofOfWork ||
    grantMilestone?.milestone.completed?.data?.proofOfWork;

  // Get the left border color based on completion status
  const getLeftBorderColor = () => {
    if (completed) return "#2ED3B7";
    return "#FDB022";
  };

  // Function to render project milestone completion form or details
  const renderMilestoneCompletion = () => {
    if (isCompleting) {
      if (type === "project" && projectMilestone) {
        return (
          <ProjectObjectiveCompletion
            objectiveUID={projectMilestone.uid}
            handleCompleting={handleCompleting}
          />
        );
      } else if (type === "grant") {
        return (
          <GrantMilestoneCompletion
            milestone={milestone}
            handleCompleting={handleCompleting}
          />
        );
      }
    }

    return (
      <>
        {completionReason ? (
          <div className="flex flex-col gap-1">
            <ReadMore side="left">{completionReason}</ReadMore>
          </div>
        ) : null}
        {completionProof ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Proof of Work:
            </p>
            <a
              href={completionProof}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue hover:underline break-all"
            >
              {completionProof}
            </a>
          </div>
        ) : null}
      </>
    );
  };

  return (
    <>
      {/* Grants Related Section */}
      <GrantAssociation milestone={milestone} />{" "}
      <div className="flex flex-col gap-3 w-full px-5 py-4">
        <div className="flex flex-col gap-3 w-full">
          {/* Show grants related if they exist */}
          {/* Activity Pill with Due Date and Status */}{" "}
          <ActivityStatusHeader
            activityType="Milestone"
            dueDate={
              type === "grant" && endsAt ? formatDate(endsAt * 1000) : null
            }
            showCompletionStatus={true}
            completed={!!completed}
            completionStatusClassName="text-xs px-2 py-1"
          />
          {/* Title */}
          <p className="text-xl font-bold text-[#101828] dark:text-zinc-100">
            {title}
          </p>
        </div>

        {/* Description */}
        {description ? (
          <div className="flex flex-col my-2">
            <ReadMore side="left">{description}</ReadMore>
          </div>
        ) : null}
      </div>
      {/* Bottom Attribution with Actions */}
      <ActivityAttribution
        createdAt={createdAt}
        attester={attester}
        actions={
          isAuthorized ? (
            <div className="flex">
              {type === "project" && projectMilestone ? (
                <ObjectiveOptionsMenu
                  objectiveId={projectMilestone.uid}
                  completeFn={handleCompleting}
                  alreadyCompleted={!!completed}
                />
              ) : type === "grant" && grantMilestone ? (
                <GrantMilestoneOptionsMenu
                  milestone={milestone}
                  completeFn={handleCompleting}
                  alreadyCompleted={!!completed}
                />
              ) : null}
            </div>
          ) : undefined
        }
      />
      {/* Completion Information */}
      {isCompleting || completionReason || completionProof ? (
        <div className="w-full flex-col flex gap-2 px-4 py-2 bg-[#F8F9FC] dark:bg-zinc-700 rounded-lg">
          {renderMilestoneCompletion()}
        </div>
      ) : null}
    </>
  );
};
