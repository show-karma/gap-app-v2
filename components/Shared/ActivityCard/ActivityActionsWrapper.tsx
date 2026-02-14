import type { IProjectUpdate } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC } from "react";
import { EditUpdateDialog } from "@/components/Pages/Project/Updates/EditUpdateDialog";
import { useUpdateActions } from "@/hooks/useUpdateActions";
import { useProjectStore } from "@/store/project";
import type { ConversionGrantUpdate, UnifiedMilestone } from "@/types/v2/roadmap";
import { shareOnX } from "@/utilities/share/shareOnX";
import { SHARE_TEXTS } from "@/utilities/share/text";
import { ActivityMenu } from "./ActivityMenu";

interface ActivityActionsWrapperProps {
  milestone: UnifiedMilestone;
}

/**
 * Convert UnifiedMilestone to a format compatible with useUpdateActions.
 * This bridges the gap between the V2 unified format and the SDK types.
 */
function convertToUpdateType(
  milestone: UnifiedMilestone
): IProjectUpdate | ConversionGrantUpdate | null {
  const { type, uid, chainID, refUID, projectUpdate, grantUpdate, projectImpact } = milestone;

  if ((type === "activity" || type === "update") && projectUpdate) {
    // Convert to IProjectUpdate-like object
    return {
      type: "ProjectUpdate",
      uid,
      chainID,
      refUID,
      attester: projectUpdate.recipient,
      recipient: projectUpdate.recipient,
      createdAt: projectUpdate.createdAt || "",
      data: {
        type: "ProjectUpdate",
        title: projectUpdate.title,
        text: projectUpdate.description,
      },
    } as unknown as IProjectUpdate;
  }

  if (type === "grant_update" && grantUpdate) {
    // grantUpdate is already in a compatible format (ConversionGrantUpdate or IGrantUpdate)
    if (!("chainID" in grantUpdate)) {
      // Add chainID if missing
      return {
        ...grantUpdate,
        chainID,
      } as ConversionGrantUpdate;
    }
    return grantUpdate as ConversionGrantUpdate;
  }

  if (type === "impact" && projectImpact) {
    // projectImpact is already IProjectImpact which is supported
    return projectImpact as unknown as IProjectUpdate;
  }

  return null;
}

/**
 * Wrapper component that provides Edit/Share/Delete actions for activity-type milestones.
 * Uses useUpdateActions hook which requires specific update object format.
 */
export const ActivityActionsWrapper: FC<ActivityActionsWrapperProps> = ({ milestone }) => {
  const { project } = useProjectStore();
  const { type, title } = milestone;

  // Convert milestone to update format for the hook
  const updateObject = convertToUpdateType(milestone);

  // Use the hook with the converted object (or a dummy if conversion failed)
  const { isDeletingUpdate, isEditDialogOpen, deleteUpdate, handleEdit, closeEditDialog } =
    useUpdateActions(
      updateObject ||
        ({
          type: "ProjectUpdate",
          uid: milestone.uid,
          chainID: milestone.chainID,
          refUID: milestone.refUID,
          attester: "",
          recipient: "",
          createdAt: "",
          data: { type: "ProjectUpdate", title: "", text: "" },
        } as unknown as IProjectUpdate)
    );

  // Determine capabilities based on type
  const canEdit = type === "activity" || type === "update" || type === "impact";
  const canDelete =
    type === "activity" || type === "update" || type === "grant_update" || type === "impact";
  const canShare = true;

  // Share handler
  const handleShare = () => {
    const shareText = SHARE_TEXTS.PROJECT_ACTIVITY(
      title || "Activity",
      (project?.details?.slug || project?.uid) as string
    );
    window.open(shareOnX(shareText), "_blank");
  };

  // Map type to SDK activity type for ActivityMenu
  const getActivityType = () => {
    switch (type) {
      case "activity":
      case "update":
        return "ProjectUpdate";
      case "impact":
        return "ProjectImpact";
      case "grant_update":
        return "GrantUpdate";
      default:
        return "ProjectUpdate";
    }
  };

  // Only render edit dialog for types that support editing
  const showEditDialog = canEdit && (type === "activity" || type === "update" || type === "impact");

  return (
    <>
      <ActivityMenu
        onShare={canShare ? handleShare : undefined}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canDelete && updateObject ? deleteUpdate : undefined}
        canShare={canShare}
        canEdit={canEdit}
        canDelete={canDelete && !!updateObject}
        isDeleting={isDeletingUpdate}
        activityType={getActivityType()}
        deleteTitle={
          <p className="font-normal">
            Are you sure you want to delete <b>{title || "this"}</b>?
          </p>
        }
      />
      {/* Edit Dialog for ProjectUpdate and ProjectImpact - only render once */}
      {showEditDialog && (
        <EditUpdateDialog
          isOpen={isEditDialogOpen}
          onClose={closeEditDialog}
          projectId={project?.uid || ""}
          updateId={milestone.uid}
          updateType={type === "impact" ? "ProjectImpact" : "ProjectUpdate"}
        />
      )}
    </>
  );
};
