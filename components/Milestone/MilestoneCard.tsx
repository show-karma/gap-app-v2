"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { useMilestoneImpactAnswers } from "@/hooks/useMilestoneImpactAnswers";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";
import { ReadMore } from "@/utilities/ReadMore";
import { cn } from "@/utilities/tailwind";
import { ExternalLink } from "../Utilities/ExternalLink";

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
    import("@/components/Pages/Project/Objective/Options").then((mod) => mod.ObjectiveOptionsMenu),
  {
    ssr: false,
  }
);

const GrantMilestoneOptionsMenu = dynamic(
  () => import("./GrantMilestoneOptionsMenu").then((mod) => mod.GrantMilestoneOptionsMenu),
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

export const MilestoneCard = ({ milestone, isAuthorized }: MilestoneCardProps) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleCompleting = (isCompleting: boolean) => {
    setIsCompleting(isCompleting);
  };

  const { title, description, completed, type } = milestone;

  // Fetch milestone impact data (outputs/metrics) if milestone is completed
  const { data: milestoneImpactData } = useMilestoneImpactAnswers({
    milestoneUID: completed ? milestone.uid : undefined,
  });

  // project milestone-specific properties
  const projectMilestone = milestone.source.projectMilestone;
  const attester =
    projectMilestone?.attester || milestone.source.grantMilestone?.milestone.attester || "";
  const createdAt = milestone.createdAt;

  // grant milestone-specific properties
  const grantMilestone = milestone.source.grantMilestone;
  const grantDetails = grantMilestone?.grant.details as
    | { title?: string; programId?: string }
    | undefined;
  const grantTitle = grantDetails?.title;
  const programId = grantDetails?.programId;
  const communityData = grantMilestone?.grant.community?.details as
    | { name?: string; slug?: string; imageURL?: string }
    | undefined;
  const endsAt = milestone.endsAt;

  // completion information
  const completionReason =
    projectMilestone?.completed?.data?.reason ||
    grantMilestone?.completionDetails?.description ||
    grantMilestone?.milestone.completed?.data?.reason;
  const completionProof =
    projectMilestone?.completed?.data?.proofOfWork ||
    grantMilestone?.completionDetails?.proofOfWork ||
    grantMilestone?.milestone.completed?.data?.proofOfWork;
  const completionDeliverables =
    (projectMilestone?.completed?.data as any)?.deliverables ||
    grantMilestone?.completionDetails?.deliverables ||
    (grantMilestone?.milestone.completed?.data as any)?.deliverables;

  // Determine border color and tag based on milestone type and status
  const getBorderColor = () => {
    if (completed) return "border-brand-blue";
    return "border-gray-300 dark:border-zinc-400";
  };

  const _getLeftBorderColor = () => {
    if (completed) return "#2ED3B7";
    return "#FDB022";
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
            {completionReason ? (
              <div className="flex flex-col gap-1">
                <ReadMore side="left">{completionReason}</ReadMore>
              </div>
            ) : null}
            {completionProof ? (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Proof of Work
                </p>
                <a
                  href={
                    completionProof.includes("http")
                      ? completionProof
                      : `https://${completionProof}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-blue hover:underline break-all"
                >
                  {completionProof}
                </a>
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  };

  // Simple function to determine content of milestone card
  const renderMilestoneContent = () => {
    return (
      <>
        {/* Title and Controls */}
        <div className="flex flex-row gap-3 items-start justify-between w-full">
          <div className="flex flex-row gap-3 items-center max-lg:flex-col-reverse max-lg:items-start max-lg:gap-2 w-full">
            <p className="text-xl font-bold text-[#101828] dark:text-zinc-100">{title}</p>
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

          {isAuthorized && type === "project" && projectMilestone ? (
            <ObjectiveOptionsMenu
              objectiveId={projectMilestone.uid}
              completeFn={handleCompleting}
              alreadyCompleted={!!completed}
            />
          ) : null}

          {isAuthorized && type === "grant" && grantMilestone ? (
            <GrantMilestoneOptionsMenu
              milestone={milestone}
              completeFn={handleCompleting}
              alreadyCompleted={!!completed}
            />
          ) : null}
        </div>

        {/* Due date */}
        {type === "grant" && endsAt ? (
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <span>Due by {formatDate(endsAt)}</span>
          </div>
        ) : null}

        {/* Description */}
        {description ? (
          <div className="flex flex-col my-2">
            <ReadMore side="left">{description}</ReadMore>
          </div>
        ) : null}

        {/* Attribution and Date */}
        <div className="flex flex-row gap-x-4 gap-y-2 items-center justify-between w-full flex-wrap">
          <div className="flex flex-row gap-2 items-center flex-wrap">
            <p className="text-zinc-800 dark:text-zinc-300 text-sm lg:text-base">
              Created on {formatDate(createdAt)} by
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
        {isCompleting ||
        completionReason ||
        completionProof ||
        (completionDeliverables && completionDeliverables.length > 0) ||
        (milestoneImpactData && milestoneImpactData.length > 0) ? (
          type === "project" ? (
            handleProjectMilestoneCompletion()
          ) : type === "grant" && isCompleting ? (
            <div className="w-full flex-col flex gap-2 px-4 py-2 bg-[#F8F9FC] dark:bg-zinc-700 rounded-lg">
              <GrantMilestoneCompletion milestone={milestone} handleCompleting={handleCompleting} />
            </div>
          ) : (
            <div className="w-full flex-col flex gap-2 px-4 py-2 bg-[#F8F9FC] dark:bg-zinc-700 rounded-lg">
              {completionReason ? (
                <div className="flex flex-col gap-1">
                  <ReadMore side="left">{completionReason}</ReadMore>
                </div>
              ) : null}
              {completionProof ? (
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Proof of Work
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
              {completionDeliverables && completionDeliverables.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Deliverables:
                  </p>
                  {completionDeliverables.map((deliverable: any) => (
                    <div
                      key={deliverable.id || deliverable.name}
                      className="border border-gray-200 dark:border-zinc-600 rounded-lg p-3 bg-white dark:bg-zinc-800"
                    >
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {deliverable.name}
                        </p>
                        {deliverable.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {deliverable.description}
                          </p>
                        )}
                        {deliverable.proof && (
                          <a
                            href={
                              deliverable.proof.includes("http")
                                ? deliverable.proof
                                : `https://${deliverable.proof}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-blue hover:underline text-sm break-all"
                          >
                            {deliverable.proof}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {milestoneImpactData && milestoneImpactData.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Metrics:</p>
                  {milestoneImpactData.map((metric: any) => (
                    <div
                      key={metric.id || metric.indicator?.id || metric.name}
                      className="border border-gray-200 dark:border-zinc-600 rounded-lg p-3 bg-white dark:bg-zinc-800"
                    >
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {metric.name || metric.indicator?.name || "Untitled Indicator"}
                        </p>
                        {metric.datapoints && metric.datapoints.length > 0 && (
                          <div className="flex flex-col gap-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Value:{" "}
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                {metric.datapoints[0].value}
                              </span>
                            </p>
                            {metric.datapoints[0].proof && (
                              <a
                                href={
                                  metric.datapoints[0].proof.includes("http")
                                    ? metric.datapoints[0].proof
                                    : `https://${metric.datapoints[0].proof}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-blue hover:underline text-sm break-all"
                              >
                                {metric.datapoints[0].proof}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        ) : null}
      </>
    );
  };

  return (
    <div
      className={cn(
        "border bg-white dark:bg-zinc-800 rounded-xl p-6 gap-3 flex flex-col items-start justify-start",
        getBorderColor()
      )}
    >
      <div className="flex flex-row gap-x-4 gap-y-2 items-center justify-start w-full flex-wrap">
        <span
          className={cn(
            "px-3 py-1.5 rounded-full text-sm w-max flex flex-row gap-2 font-semibold items-center",
            "bg-[#FFEFE0] text-black dark:bg-[#FFEFE0] dark:text-black"
          )}
        >
          <Image src={"/icons/milestone.svg"} alt={"Milestone"} width={20} height={20} />
          Milestone
        </span>
        {/* Multiple grants display */}
        {type === "grant" ? (
          <div className="flex flex-wrap gap-2">
            {milestone.mergedGrants && milestone.mergedGrants.length > 0 ? (
              // Display all merged grants with their images
              [...milestone.mergedGrants]
                .sort((a, b) => {
                  // Sort alphabetically by grant title
                  const titleA = a.grantTitle || "Untitled Grant";
                  const titleB = b.grantTitle || "Untitled Grant";
                  return titleA.localeCompare(titleB);
                })
                .map((grant, index) => (
                  <ExternalLink
                    href={PAGES.COMMUNITY.ALL_GRANTS(communityData?.slug || "", grant.programId)}
                    key={`${grant.grantUID}-${grant.grantTitle}-${milestone.uid}-${milestone.title}-${index}`}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1"
                  >
                    {grant.communityImage ? (
                      <div className="w-4 h-4 relative overflow-hidden rounded-full">
                        <Image
                          src={grant.communityImage}
                          alt={grant.communityName || "Community"}
                          width={16}
                          height={16}
                        />
                      </div>
                    ) : null}
                    <span className="font-medium">{grant.grantTitle || "Untitled Grant"}</span>
                  </ExternalLink>
                ))
            ) : // Single grant display with community image
            grantTitle ? (
              <ExternalLink
                href={PAGES.COMMUNITY.ALL_GRANTS(communityData?.slug || "", programId)}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1"
              >
                {communityData?.imageURL ? (
                  <div className="w-4 h-4 relative overflow-hidden rounded-full">
                    <Image
                      src={communityData.imageURL}
                      alt={communityData.name || "Community"}
                      width={16}
                      height={16}
                    />
                  </div>
                ) : null}
                <span className="font-medium">{grantTitle}</span>
              </ExternalLink>
            ) : null}
          </div>
        ) : null}
      </div>
      {/* Use the extracted render function for the main content */}
      {renderMilestoneContent()}
    </div>
  );
};
