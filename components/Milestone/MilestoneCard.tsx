"use client";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { Button } from "@/components/Utilities/Button";
import { formatDate } from "@/utilities/formatDate";
import { ReadMore } from "@/utilities/ReadMore";
import { UnifiedMilestone } from "@/utilities/gapIndexerApi/getAllMilestones";
import { useState } from "react";
import { CalendarIcon, ClockIcon } from "@heroicons/react/24/outline";
import { cn } from "@/utilities/tailwind";
import dynamic from "next/dynamic";
import Image from "next/image";

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

// Extended milestone type that includes multiple grant references
interface MergedMilestone extends UnifiedMilestone {
  mergedGrants?: Array<{
    grantId: string;
    grantTitle?: string;
    communityName?: string;
    communityImage?: string;
  }>;
}

interface MilestoneCardProps {
  milestone: MergedMilestone;
  isAuthorized: boolean;
}

export const MilestoneCard = ({
  milestone,
  isAuthorized,
}: MilestoneCardProps) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleCompleting = (isCompleting: boolean) => {
    setIsCompleting(isCompleting);
  };

  // Extract common milestone information
  const { title, description, completed, type } = milestone;

  // Handle project milestone-specific properties
  const projectMilestone = milestone.source.projectMilestone;
  const attester =
    projectMilestone?.attester ||
    milestone.source.grantMilestone?.milestone.attester ||
    "";
  const createdAt = milestone.createdAt;

  // Handle grant milestone-specific properties
  const grantMilestone = milestone.source.grantMilestone;
  const grantTitle = grantMilestone?.grant.details?.data.title;
  const communityData = grantMilestone?.grant.community?.details?.data;
  const endsAt = milestone.endsAt;

  // Handle completion information
  const completionReason =
    projectMilestone?.completed?.data?.reason ||
    grantMilestone?.milestone.completed?.data?.reason;
  const completionProof =
    projectMilestone?.completed?.data?.proofOfWork ||
    grantMilestone?.milestone.completed?.data?.proofOfWork;

  // Determine border color and tag based on milestone type and status
  const getBorderColor = () => {
    if (completed) return "border-brand-blue";
    return "border-[#D0D5DD] dark:border-zinc-400";
  };

  const getLeftBorderColor = () => {
    if (completed) return "#2ED3B7";
    return "#FDB022";
  };

  const getMilestoneType = () => {
    if (type === "project") return "Roadmap Milestone";
    if (type === "grant") {
      // If we have merged grants, show a generic label
      if (milestone.mergedGrants && milestone.mergedGrants.length > 1) {
        return `Grant Milestone (${milestone.mergedGrants.length} Grants)`;
      }
      return `Grant Milestone${grantTitle ? `: ${grantTitle}` : ""}`;
    }
    return "Milestone";
  };

  const getStatusColor = () => {
    if (completed) return "bg-brand-blue text-white";
    return "bg-[#FFFAEB] text-[#B54708] dark:bg-[#FFFAEB]/10 dark:text-orange-100";
  };

  const getStatusBorder = () => {
    if (completed) return "";
    return "border border-[#FEDF89]";
  };

  const getStatusText = () => {
    return completed ? "Completed" : "Pending";
  };

  // Function to handle completion for project milestones
  const handleProjectMilestoneCompletion = () => {
    if (!projectMilestone) return null;

    return (
      <div className="w-full flex-col flex gap-2 px-4 py-2 bg-[#F8F9FC] dark:bg-zinc-700 rounded-lg">
        {isCompleting ? (
          <ProjectObjectiveCompletion
            objectiveUID={projectMilestone.uid}
            handleCompleting={handleCompleting}
          />
        ) : (
          <>
            {completionReason && (
              <div className="flex flex-col gap-1">
                <ReadMore side="left">{completionReason}</ReadMore>
              </div>
            )}
            {completionProof && (
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
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "border bg-white dark:bg-zinc-800 rounded-xl p-6 gap-3 flex flex-col items-start justify-start",
        getBorderColor()
      )}
    >
      {/* Multiple grants display */}
      {type === "grant" &&
      milestone.mergedGrants &&
      milestone.mergedGrants.length > 0 ? (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-wrap gap-2">
            {[...milestone.mergedGrants]
              .sort((a, b) => {
                // Sort alphabetically by grant title
                const titleA = a.grantTitle || "Untitled Grant";
                const titleB = b.grantTitle || "Untitled Grant";
                return titleA.localeCompare(titleB);
              })
              .map((grant, index) => (
                <div
                  key={grant.grantId}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1"
                >
                  {grant.communityImage && (
                    <div className="w-4 h-4 relative overflow-hidden rounded-full">
                      <Image
                        src={grant.communityImage}
                        alt={grant.communityName || "Community"}
                        width={16}
                        height={16}
                      />
                    </div>
                  )}
                  <span className="font-medium">
                    {grant.grantTitle || "Untitled Grant"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : type === "grant" && grantTitle ? (
        <div className="flex flex-row gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1">
            <span className="font-medium">{grantTitle}</span>
          </p>
        </div>
      ) : null}
      {/* Title and Controls */}
      <div className="flex flex-row gap-3 items-start justify-between w-full">
        <div className="flex flex-row gap-3 items-center max-lg:flex-col-reverse max-lg:items-start max-lg:gap-2 w-full">
          <p
            className="text-xl font-bold text-[#101828] dark:text-zinc-100 pl-4 border-l-4"
            style={{
              borderLeftColor: getLeftBorderColor(),
            }}
          >
            {title}
          </p>
          <p
            className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              getStatusColor(),
              getStatusBorder()
            )}
          >
            {getStatusText()}
          </p>
        </div>

        {isAuthorized && type === "project" && projectMilestone && (
          <ObjectiveOptionsMenu
            objectiveId={projectMilestone.uid}
            completeFn={handleCompleting}
            alreadyCompleted={completed}
          />
        )}
      </div>

      {/* Due date */}
      {type === "grant" && endsAt && (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <span>Due by {formatDate(endsAt * 1000)}</span>
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="flex flex-col my-2">
          <ReadMore side="left">{description}</ReadMore>
        </div>
      )}

      {/* Attribution and Date */}
      <div className="flex flex-row gap-x-4 gap-y-2 items-center justify-between w-full flex-wrap">
        <div className="flex flex-row gap-2 items-center flex-wrap">
          <p className="text-zinc-800 dark:text-zinc-300 text-sm lg:text-base">
            Posted on {formatDate(createdAt)} by
          </p>
          <div className="flex flex-row gap-1 items-center">
            <EthereumAddressToENSAvatar
              address={attester}
              className="h-5 w-5 min-h-5 min-w-5 rounded-full border-1 border-gray-100 dark:border-zinc-900"
            />
            <p className="text-sm text-center font-bold text-black dark:text-zinc-200 max-2xl:text-[13px]">
              <EthereumAddressToENSName address={attester} />
            </p>
          </div>
        </div>
      </div>

      {/* Completion Information */}
      {(isCompleting || completionReason || completionProof) &&
        (type === "project" ? (
          handleProjectMilestoneCompletion()
        ) : (
          <div className="w-full flex-col flex gap-2 px-4 py-2 bg-[#F8F9FC] dark:bg-zinc-700 rounded-lg">
            {completionReason && (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Completion Notes:
                </p>
                <ReadMore side="left">{completionReason}</ReadMore>
              </div>
            )}
            {completionProof && (
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
            )}
          </div>
        ))}
    </div>
  );
};
