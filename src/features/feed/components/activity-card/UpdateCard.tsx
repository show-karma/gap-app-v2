import { FC } from "react";
import Link from "next/link";
import { useProjectStore } from "@/features/projects/lib/store";
import { ActivityStatus } from "./ActivityStatus";
import { ActivityStatusHeader } from "./ActivityStatusHeader";
import { ActivityMenu } from "./ActivityMenu";
import { ActivityAttribution } from "./ActivityAttribution";
import { ReadMore } from "@/components/ui/read-more";
import { PAGES } from "@/config/pages";
import { ProjectActivityBlock } from "@/features/projects/components/updates/ProjectActivityBlock";
import { EditUpdateDialog } from "@/features/projects/components/updates/EditUpdateDialog";
import { formatDate } from "@/lib/format/date";
import {
  IGrantUpdate,
  IMilestoneResponse,
  IProjectImpact,
  IProjectMilestoneResponse,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { ActivityType } from "./ActivityTypes";
import { useUpdateActions } from "@/features/grants/hooks/use-update-actions";

type UpdateType =
  | IProjectUpdate
  | IGrantUpdate
  | IMilestoneResponse
  | IProjectImpact
  | IProjectMilestoneResponse;

interface UpdateCardProps {
  update: UpdateType;
  index: number;
  isAuthorized: boolean;
}

export const UpdateCard: FC<UpdateCardProps> = ({
  update,
  index,
  isAuthorized,
}) => {
  const { project } = useProjectStore();
  const {
    isDeletingUpdate,
    isEditDialogOpen,
    deleteUpdate,
    handleShare,
    handleEdit,
    closeEditDialog,
    canShare,
  } = useUpdateActions(update);

  const getUpdateContent = () => {
    switch (update.type) {
      case "ProjectUpdate":
      case "GrantUpdate":
        return update.data.text;
      case "Milestone":
        return "description" in update.data ? update.data.description : "";
      case "ProjectMilestone":
        return update.data.text || "";
      case "ProjectImpact":
        const data = update.data as IProjectImpact["data"];
        const { impact, proof, work } = data;
        return `### Work \n${work} \n\n### Impact \n${impact} \n\n### Proof \n${proof}`;
      default:
        return "";
    }
  };

  const getReadMoreSideButton = () => {
    if (update.type === "ProjectImpact") {
      return (
        <Link
          href={PAGES.PROJECT.IMPACT.ROOT(
            project?.details?.data.slug || project?.uid || ""
          )}
          className="underline text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline"
        >
          See impact
        </Link>
      );
    }

    if (
      update.type === "ProjectMilestone" &&
      "completed" in update &&
      update.completed?.data.proofOfWork
    ) {
      return (
        <Link
          href={update.completed.data.proofOfWork}
          className="underline text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          View proof
        </Link>
      );
    }

    return null;
  };

  const canEdit =
    update.type === "ProjectUpdate" || update.type === "ProjectImpact";
  const canDelete =
    update.type === "ProjectUpdate" ||
    update.type === "ProjectImpact" ||
    update.type === "GrantUpdate" ||
    update.type === "Milestone" ||
    update.type === "ProjectMilestone";

  // Get due date for milestones
  const getDueDate = () => {
    if (update.type === "Milestone" || update.type === "ProjectMilestone") {
      const milestoneData = update.data as any;
      if (milestoneData.endsAt) {
        return formatDate(milestoneData.endsAt * 1000);
      }
      if (milestoneData.endDate) {
        return formatDate(milestoneData.endDate);
      }
    }
    return null;
  };

  // Get completion status for milestones
  const getCompletionStatus = () => {
    if (update.type === "Milestone" || update.type === "ProjectMilestone") {
      const milestoneData = update.data as any;
      return (
        milestoneData.completed ||
        (milestoneData.completed &&
          typeof milestoneData.completed === "object" &&
          Object.keys(milestoneData.completed).length > 0)
      );
    }
    return false;
  };

  const startDate = (update as any).data?.startDate;
  const endDate = (update as any).data?.endDate;

  return (
    <div className="flex flex-col gap-0 w-full">
      {/* Grants Related Section */}
      {/* Show grants related if they exist */}
      <div className="flex flex-col gap-3 w-full px-5 py-4">
        <div className="flex flex-col gap-3 w-full">
          {/* Activity Pill with Due Date and Status */}{" "}
          <ActivityStatusHeader
            activityType={update.type as ActivityType}
            dueDate={getDueDate()}
            showCompletionStatus={
              update.type === "Milestone" || update.type === "ProjectMilestone"
            }
            completed={getCompletionStatus()}
            completionStatusClassName="text-xs px-2 py-1"
            update={update}
            index={index}
          />
          {/* Title */}
          {update.type !== "ProjectImpact" &&
            update.data &&
            "title" in update.data &&
            update.data.title && (
              <p className="text-xl font-bold text-[#101828] dark:text-zinc-100">
                {update.data.title}
              </p>
            )}
          {/* Date range for activities */}
          {(startDate || endDate) && (
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <span>
                {`${startDate ? formatDate(startDate) : ""} ${
                  startDate && endDate ? "-" : ""
                } ${endDate ? formatDate(endDate) : ""}`}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col my-2 w-full">
          <ReadMore
            side="left"
            markdownClass="text-black dark:text-zinc-200 font-normal text-base"
            readLessText="Read less"
            readMoreText="Read more"
            othersideButton={getReadMoreSideButton()}
          >
            {getUpdateContent()}
          </ReadMore>
        </div>
        {update.type === "ProjectUpdate" &&
        ((update as IProjectUpdate).data?.indicators?.length ||
          (update as IProjectUpdate).data?.deliverables?.length) ? (
          <div className="w-full flex-col flex gap-2 px-4 py-2 bg-[#F8F9FC] dark:bg-zinc-700 rounded-lg">
            <ProjectActivityBlock activity={update as IProjectUpdate} />
          </div>
        ) : null}
        {/* Bottom Attribution with Actions */}
        {isAuthorized &&
          (update.type === "ProjectUpdate" ||
            update.type === "ProjectImpact") && (
            <EditUpdateDialog
              isOpen={isEditDialogOpen}
              onClose={closeEditDialog}
              projectId={project?.uid || ""}
              updateId={update.uid}
              updateType={update.type as "ProjectUpdate" | "ProjectImpact"}
            />
          )}
      </div>
      <ActivityAttribution
        createdAt={update.createdAt}
        attester={update.attester}
        // startDate={(update as any).data?.startDate}
        // endDate={(update as any).data?.endDate}
        actions={
          isAuthorized ? (
            <ActivityMenu
              onShare={canShare ? handleShare : undefined}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? deleteUpdate : undefined}
              canShare={canShare}
              canEdit={canEdit}
              canDelete={canDelete}
              isDeleting={isDeletingUpdate}
              activityType={update.type}
              deleteTitle={
                <p className="font-normal">
                  Are you sure you want to delete <b>{update.data.title}</b>{" "}
                  update?
                </p>
              }
            />
          ) : undefined
        }
      />
    </div>
  );
};
