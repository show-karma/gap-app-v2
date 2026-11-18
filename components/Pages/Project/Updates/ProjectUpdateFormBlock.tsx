/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { ProjectUpdateForm } from "@/components/Forms/ProjectUpdate";
import { Spinner } from "@/components/Utilities/Spinner";
import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";
import { useProjectStore } from "@/store";

interface ProjectUpdateFormBlockProps {
  onClose?: () => void;
  updateId?: string;
}

export const ProjectUpdateFormBlock = ({ onClose, updateId }: ProjectUpdateFormBlockProps) => {
  const project = useProjectStore((state) => state.project);

  // Fetch updates using dedicated hook
  const { rawData, isLoading } = useProjectUpdates(project?.uid || "");

  // Maintain state to force fresh render when updateId changes
  const [currentUpdateId, setCurrentUpdateId] = useState(updateId);

  // Find update being edited from dedicated API data
  const updateBeingEdited = useMemo(() => {
    if (!updateId || !rawData?.projectUpdates) return null;
    return rawData.projectUpdates.find((update) => update.uid === updateId);
  }, [updateId, rawData?.projectUpdates]);

  // Update the component state when updateId changes
  useEffect(() => {
    if (updateId !== currentUpdateId) {
      setCurrentUpdateId(updateId);
    }
  }, [updateId, currentUpdateId]);

  // ProjectUpdateForm has already written the indexed feed into every cached
  // project-updates query (uid and slug keys alike) before calling this, so
  // closing is all that is left.
  const handleSuccess = () => {
    onClose?.();
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
