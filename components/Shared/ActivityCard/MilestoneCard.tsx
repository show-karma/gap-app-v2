import {
  CheckCircleIcon,
  PaperClipIcon,
  PencilSquareIcon,
  ShareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Calendar } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { type FC, useCallback, useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { MilestoneVerificationSection } from "@/components/Shared/MilestoneVerification";
import { Button } from "@/components/Utilities/Button";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Badge } from "@/components/ui/badge";
import { useMilestone } from "@/hooks/useMilestone";
import { useMilestoneActions } from "@/hooks/useMilestoneActions";
import { useMilestoneImpactAnswers } from "@/hooks/useMilestoneImpactAnswers";
import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";
import { useGrantInvoiceRequired } from "@/src/features/payout-disbursement/hooks/use-payout-disbursement";
import { getGrantInvoiceDownloadUrl } from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import { useProjectStore } from "@/store";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { formatDate } from "@/utilities/formatDate";
import { queryClient } from "@/utilities/query-client";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { ReadMore } from "@/utilities/ReadMore";
import { shareOnX } from "@/utilities/share/shareOnX";
import { SHARE_TEXTS } from "@/utilities/share/text";
import { cn } from "@/utilities/tailwind";
import { containerClassName } from "../ActivityCard";
import { ActivityActionsWrapper } from "./ActivityActionsWrapper";
import { ActivityAttribution } from "./ActivityAttribution";
import { ActivityStatusHeader } from "./ActivityStatusHeader";
import { GrantAssociation } from "./GrantAssociation";

const ProjectObjectiveCompletion = dynamic(
  () =>
    import("@/components/Forms/ProjectObjectiveCompletion").then(
      (mod) => mod.ProjectObjectiveCompletionForm
    ),
  {
    ssr: false,
  }
);

const ObjectiveSimpleOptionsMenu = dynamic(
  () =>
    import("@/components/Pages/Project/Objective/ObjectiveSimpleOptionsMenu").then(
      (mod) => mod.ObjectiveSimpleOptionsMenu
    ),
  {
    ssr: false,
  }
);

const GrantMilestoneSimpleOptionsMenu = dynamic(
  () =>
    import("@/components/Milestone/GrantMilestoneSimpleOptionsMenu").then(
      (mod) => mod.GrantMilestoneSimpleOptionsMenu
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

// Dynamic import for editing milestone completion form
const MilestoneUpdateForm = dynamic(
  () => import("@/components/Forms/MilestoneUpdate").then((mod) => mod.MilestoneUpdateForm),
  {
    ssr: false,
  }
);

interface MilestoneCardProps {
  milestone: UnifiedMilestone;
  isAuthorized: boolean;
}

/**
 * Get the display label for an activity type.
 * For nested completion updates, always show "Milestone Update"
 */
const getActivityTypeLabel = (type: string): string => {
  switch (type) {
    case "grant_update":
      return "Grant Update";
    case "grant_received":
      return "Grant Received";
    case "project":
    case "activity":
    case "update":
      return "Project Activity";
    case "impact":
      return "Project Impact";
    case "grant":
    case "milestone":
    default:
      return "Milestone Update";
  }
};

export const MilestoneCard: FC<MilestoneCardProps> = ({ milestone, isAuthorized }) => {
  const { isCompleting, handleCompleting, isEditing, handleEditing } = useMilestoneActions();
  const { multiGrantUndoCompletion } = useMilestone();
  const [isUndoing, setIsUndoing] = useState(false);
  const { title, description, completed, type } = milestone;

  // Wrapper for undo completion with loading state
  const handleUndoCompletion = async () => {
    setIsUndoing(true);
    try {
      await multiGrantUndoCompletion(milestone);
    } finally {
      setIsUndoing(false);
    }
  };
  const { project } = useProjectStore();
  const { projectId } = useParams();
  const { refetch } = useProjectUpdates(projectId as string);

  // Fetch milestone impact data (outputs/metrics) if milestone is completed
  const { data: milestoneImpactData } = useMilestoneImpactAnswers({
    milestoneUID: completed ? milestone.uid : undefined,
  });

  // project milestone-specific properties
  const projectMilestone = milestone.source.projectMilestone;

  // grant milestone-specific properties
  const grantMilestone = milestone.source.grantMilestone;
  const grantUID = grantMilestone?.grant.uid;
  const grantDetails = grantMilestone?.grant.details as
    | { title?: string; programId?: string }
    | undefined;
  const grantTitle = grantDetails?.title;
  const _programId = grantDetails?.programId;

  // Check if invoice is required for this grant
  const { data: invoiceCheckData } = useGrantInvoiceRequired(
    isAuthorized && type === "grant" ? grantUID : undefined
  );
  const _communityData = grantMilestone?.grant.community?.details as
    | { name?: string; imageURL?: string }
    | undefined;
  const endsAt = milestone.endsAt;

  const handleViewInvoice = useCallback(async () => {
    if (!grantUID || !milestone.invoiceInfo?.fileKey) return;
    try {
      const url = await getGrantInvoiceDownloadUrl(grantUID, milestone.invoiceInfo.fileKey);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Failed to open invoice");
    }
  }, [grantUID, milestone.invoiceInfo?.fileKey]);

  // completion information
  const completionReason =
    projectMilestone?.completed?.data?.reason || grantMilestone?.milestone.completed?.data?.reason;
  const completionProof =
    projectMilestone?.completed?.data?.proofOfWork ||
    grantMilestone?.milestone.completed?.data?.proofOfWork;
  const completionDate =
    projectMilestone?.completed?.createdAt || grantMilestone?.milestone.completed?.createdAt;
  const completionAttester =
    projectMilestone?.completed?.attester || grantMilestone?.milestone.completed?.attester;
  // V2: verified is an array for both grant and project milestones
  const isVerified =
    Boolean(
      projectMilestone?.verified &&
        Array.isArray(projectMilestone.verified) &&
        projectMilestone.verified.length > 0
    ) ||
    Boolean(
      grantMilestone?.milestone.verified &&
        Array.isArray(grantMilestone.milestone.verified) &&
        grantMilestone.milestone.verified.length > 0
    );
  const verifications =
    (Array.isArray(grantMilestone?.milestone.verified)
      ? grantMilestone.milestone.verified
      : null) ||
    (Array.isArray(projectMilestone?.verified) ? projectMilestone.verified : null) ||
    [];
  const completionDeliverables =
    (projectMilestone?.completed?.data as any)?.deliverables ||
    (grantMilestone?.milestone.completed?.data as any)?.deliverables;

  // Function to render project milestone completion form or details
  const renderMilestoneCompletion = () => {
    if (isCompleting) {
      if (type === "milestone") {
        // Project milestone - use ProjectObjectiveCompletion form
        // Use projectMilestone.uid if available, otherwise fall back to milestone.uid
        return (
          <ProjectObjectiveCompletion
            objectiveUID={projectMilestone?.uid || milestone.uid}
            handleCompleting={handleCompleting}
          />
        );
      } else if (type === "grant") {
        // Grant milestone - use GrantMilestoneCompletion form
        return (
          <GrantMilestoneCompletion
            milestone={milestone}
            handleCompleting={handleCompleting}
            invoiceRequired={invoiceCheckData?.invoiceRequired}
            grantUID={grantUID}
            milestoneLabel={title}
          />
        );
      }
    }

    if (isEditing && type === "grant" && grantMilestone) {
      // For grant milestones, use the existing MilestoneUpdateForm
      return (
        <MilestoneUpdateForm
          milestone={grantMilestone.milestone}
          isEditing={true}
          previousData={grantMilestone.milestone.completed?.data}
          cancelEditing={async (editing: boolean) => {
            handleEditing(editing);
            // Refresh the activities list after successful editing
            if (!editing) {
              // Invalidate all relevant caches
              await Promise.all([
                queryClient.invalidateQueries({
                  queryKey: QUERY_KEYS.PROJECT.UPDATES(projectId as string),
                }),
                queryClient.invalidateQueries({
                  queryKey: ["projectMilestones", project?.uid],
                }),
                refetch(),
              ]);
            }
          }}
        />
      );
    }

    if (isEditing && type === "milestone") {
      return (
        <div className={cn(containerClassName, "flex flex-col gap-4 w-full p-4")}>
          <p className="text-sm text-muted-foreground">
            Project milestone editing is not yet implemented. Please use the revoke and re-complete
            workflow for now.
          </p>
          <Button
            className="w-max bg-transparent border text-muted-foreground hover:bg-accent"
            onClick={async () => {
              handleEditing(false);
              // Refresh the activities list when canceling editing
              await Promise.all([
                queryClient.invalidateQueries({
                  queryKey: QUERY_KEYS.PROJECT.UPDATES(projectId as string),
                }),
                queryClient.invalidateQueries({
                  queryKey: ["projectMilestones", project?.uid],
                }),
                refetch(),
              ]);
            }}
          >
            Cancel
          </Button>
        </div>
      );
    }

    return (
      <div className={cn(containerClassName, "flex flex-col gap-1 w-full")}>
        <div className={"w-full flex-col flex gap-2 px-6 py-6"}>
          {/* UPDATE label - matches Figma design for nested milestone updates */}
          <div className="flex flex-row items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground tracking-wide">UPDATE</p>
            <MilestoneVerificationSection
              milestone={milestone}
              title={`${title} - Reviews`}
              isVerified={isVerified}
              verifications={verifications}
            />
          </div>
          {/* Title - shown prominently after UPDATE label per Figma */}
          {title && (
            <h4 className="text-xl font-semibold text-foreground leading-tight tracking-tight">
              {title}
            </h4>
          )}
          {completionReason ? (
            <div className="flex flex-col gap-1">
              <ReadMore side="left">{completionReason}</ReadMore>
            </div>
          ) : null}
          {milestone.invoiceInfo?.fileKey && grantUID && (
            <button
              type="button"
              className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
              onClick={handleViewInvoice}
            >
              <PaperClipIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300">
                Invoice attached
              </span>
            </button>
          )}
          {completionProof ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">Proof of Work:</p>
              <a
                href={
                  completionProof.includes("http") ? completionProof : `https://${completionProof}`
                }
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
              <p className="text-sm font-semibold text-foreground">Deliverables:</p>
              {completionDeliverables.map((deliverable: any, index: number) => (
                <div key={index} className="border rounded-lg p-3 bg-secondary">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">{deliverable.name}</p>
                    {deliverable.description && (
                      <p className="text-sm text-muted-foreground">{deliverable.description}</p>
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
              <p className="text-sm font-semibold text-foreground">Metrics:</p>
              {milestoneImpactData.map((metric: any, index: number) => (
                <div key={index} className="border rounded-lg p-3 bg-secondary">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">
                      {metric.name || metric.indicator?.name || "Untitled Indicator"}
                    </p>
                    {metric.datapoints && metric.datapoints.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-muted-foreground">
                          Value:{" "}
                          <span className="font-medium text-foreground">
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
        <ActivityAttribution
          date={completionDate || ""}
          attester={completionAttester}
          actions={
            isAuthorized ? (
              <div className="flex flex-row gap-3 max-sm:gap-4 items-center">
                {/* Share Button */}
                <ExternalLink
                  href={shareOnX(
                    type === "grant" && grantMilestone
                      ? SHARE_TEXTS.MILESTONE_COMPLETED(
                          grantTitle || "Grant",
                          (project?.details?.slug || project?.uid) as string,
                          grantMilestone.grant.uid
                        )
                      : SHARE_TEXTS.PROJECT_ACTIVITY(
                          title,
                          (project?.details?.slug || project?.uid) as string
                        )
                  )}
                  className="flex flex-row gap-1 bg-transparent text-sm font-semibold text-muted-foreground hover:bg-transparent hover:opacity-75  h-6 w-6 items-center justify-center"
                >
                  <ShareIcon className="h-5 w-5" />
                </ExternalLink>

                {/* Edit Button */}
                <Button
                  className="flex flex-row gap-1 bg-transparent text-sm font-semibold text-muted-foreground hover:bg-transparent hover:opacity-75  h-6 w-6 p-0 items-center justify-center"
                  onClick={() => handleEditing(true)}
                >
                  <PencilSquareIcon className="h-5 w-5" />
                </Button>

                {/* Revoke Completion Button */}
                <DeleteDialog
                  deleteFunction={handleUndoCompletion}
                  isLoading={isUndoing}
                  title={
                    <p className="font-normal">
                      Are you sure you want to revoke the completion of <b>{milestone.title}</b>?
                    </p>
                  }
                  buttonElement={{
                    text: "",
                    icon: <TrashIcon className="h-5 w-5" />,
                    styleClass:
                      "bg-transparent text-sm font-semibold text-red-500 hover:bg-transparent hover:opacity-75 h-6 w-6 p-0 items-center justify-center",
                  }}
                />
              </div>
            ) : undefined
          }
          isCompleted
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full gap-4">
      {/* Main Milestone Card */}
      <div className={cn(containerClassName, "flex flex-col w-full")}>
        {/* Grants Related Section */}
        <div className="flex flex-col gap-6 w-full px-6 py-6">
          <div className="flex flex-row justify-between items-start gap-3 w-full flex-wrap">
            <div className="flex flex-col gap-2 flex-1 flex-wrap">
              {/* Title */}
              <p className="text-xl font-semibold text-foreground">{title}</p>

              {/* Community/Grant Badge - only shown for grant milestones */}
              {type === "grant" && (
                <div className="flex flex-row items-center gap-2">
                  <span className="text-sm text-muted-foreground">For</span>
                  <GrantAssociation milestone={milestone} />
                </div>
              )}
            </div>

            {/* Right side: Due date and status badges */}
            <div className="flex flex-row items-center gap-4 flex-wrap">
              {/* Due date badge */}
              {endsAt && endsAt > 0 && (
                <Badge variant="secondary" className="flex flex-row items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Due by {formatDate(endsAt * 1000)}</span>
                </Badge>
              )}

              {(type === "milestone" || type === "grant") && (
                <Badge
                  variant="secondary"
                  className={cn(
                    completed
                      ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950 dark:hover:bg-emerald-950"
                      : "bg-orange-50 hover:bg-orange-50 text-orange-700 dark:bg-orange-950 dark:hover:bg-orange-950 dark:text-orange-300"
                  )}
                >
                  {completed ? "Completed" : "Pending"}
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {description ? (
            <div className="flex flex-col">
              <ReadMore side="left">{description}</ReadMore>
            </div>
          ) : null}
        </div>
        {/* Bottom Actions (removed attribution since it's shown in timeline header) */}
        {isAuthorized && (type === "milestone" || type === "grant") && (
          <div className="flex w-full flex-1 flex-row gap-6 items-center justify-between px-5 py-3 border-t">
            {/* Only show completion button for milestone types that support completion */}
            {!completed ? (
              <Button
                className="flex flex-row gap-1 border border-brand-blue text-brand-blue  text-sm font-semibold bg-white hover:bg-white dark:bg-transparent dark:hover:bg-transparent p-3  rounded-md max-sm:px-2 max-sm:py-1"
                onClick={() => handleCompleting(true)}
              >
                Mark Milestone Complete
                <CheckCircleIcon className="h-5 w-5" />
              </Button>
            ) : (
              <div />
            )}

            {/* Options Menu with only Delete - right aligned */}
            {type === "milestone" && projectMilestone ? (
              <ObjectiveSimpleOptionsMenu objectiveId={projectMilestone.uid} />
            ) : type === "grant" && grantMilestone ? (
              <GrantMilestoneSimpleOptionsMenu milestone={milestone} />
            ) : null}
          </div>
        )}
        {/* Bottom Actions for activity/update types - Share, Edit, Delete */}
        {isAuthorized &&
          (type === "activity" ||
            type === "update" ||
            type === "grant_update" ||
            type === "impact") && (
            <div className="flex w-full flex-1 flex-row gap-6 items-center justify-end px-5 py-3 border-t">
              <ActivityActionsWrapper milestone={milestone} />
            </div>
          )}
      </div>
      {isCompleting ||
      isEditing ||
      completionReason ||
      completionProof ||
      completionDeliverables ? (
        <div className="flex flex-col gap-2.5 mt-2 pl-10">
          {/* Timeline header: Only show when viewing existing completion data, not during form input */}
          {!isCompleting && (completionReason || completionProof || completionDeliverables) && (
            <div className="relative flex flex-row items-center justify-between gap-2 flex-wrap">
              {/* Timeline badge - vertically centered relative to header row, aligned with main timeline */}
              <div className="absolute -left-[73px] max-lg:-left-[69px] top-1/2 -translate-y-1/2 w-6 h-6 max-lg:w-5 max-lg:h-5 flex items-center justify-center z-10 bg-blue-50 dark:bg-blue-950 rounded-full ring-2 ring-white dark:ring-zinc-900">
                <div className="w-[3px] h-[3px] rounded-full bg-blue-400" />
              </div>
              {/* Left side: Activity type label */}
              <div className="flex flex-row items-center gap-2.5 flex-wrap">
                <span className="text-sm font-semibold text-foreground">
                  {getActivityTypeLabel(type)}
                </span>
              </div>

              {/* Right side: Posted by */}
              {completionDate && (
                <div className="flex flex-row items-center gap-3 text-sm font-medium leading-5 text-muted-foreground">
                  <span>Posted {formatDate(completionDate)} by</span>
                  {completionAttester && (
                    <div className="flex flex-row items-center gap-3">
                      <EthereumAddressToENSAvatar
                        address={completionAttester}
                        className="h-5 w-5 lg:h-6 lg:w-6 min-h-5 min-w-5 lg:min-h-6 lg:min-w-6 rounded-full"
                      />
                      <span className="text-sm font-semibold leading-5 text-foreground">
                        <EthereumAddressToENSName address={completionAttester} />
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Completion card - aligned with header */}
          <div>{renderMilestoneCompletion()}</div>
        </div>
      ) : null}
    </div>
  );
};
