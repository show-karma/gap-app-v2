/* eslint-disable @next/next/no-img-element */

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProjectUpdateForm } from "@/components/Forms/ProjectUpdate";
import { Spinner } from "@/components/Utilities/Spinner";
import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";
import { useProjectStore } from "@/store";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface ProjectUpdateFormBlockProps {
  onClose?: () => void;
  updateId?: string;
}

export const ProjectUpdateFormBlock = ({ onClose, updateId }: ProjectUpdateFormBlockProps) => {
  const project = useProjectStore((state) => state.project);
  const queryClient = useQueryClient();

  // Fetch updates using dedicated hook
  const { rawData, isLoading } = useProjectUpdates(project?.uid || "");

  // Maintain state to force fresh render when updateId changes
  const [currentUpdateId, setCurrentUpdateId] = useState(updateId);

  // Find update being edited from dedicated API data
  const updateBeingEdited = useMemo(() => {
    if (!updateId || !rawData?.projectUpdates) return null;
    return rawData.projectUpdates.find((update) => update.uid === updateId);
  }, [updateId, rawData?.projectUpdates]);

  const router = useRouter();

  // Update the component state when updateId changes
  useEffect(() => {
    if (updateId !== currentUpdateId) {
      setCurrentUpdateId(updateId);
    }
  }, [updateId, currentUpdateId]);

  // Clean up on success - invalidate cache and close dialog
  const handleSuccess = async () => {
    // Invalidate the project updates cache to trigger a refetch
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.PROJECT.UPDATES(project?.uid || ""),
    });
    router.refresh();
    if (onClose) {
      onClose();
    }
  };

  // Show loading state while fetching data in edit mode
  const isEditMode = !!updateId;
  const isDataReady = !isEditMode || (isEditMode && updateBeingEdited);

  return (
    <div className="flex flex-col w-full gap-4">
      <h2 className="text-xl font-bold text-black dark:text-zinc-100 pr-8">
        {updateId ? `Edit "${updateBeingEdited?.title || "Activity"}"` : "Add Activity"}
      </h2>

      {isLoading || !isDataReady ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <ProjectUpdateForm
          key={`form-${currentUpdateId}`}
          afterSubmit={handleSuccess}
          editId={currentUpdateId}
        />
      )}
    </div>
  );
};
