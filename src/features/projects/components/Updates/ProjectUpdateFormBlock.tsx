/* eslint-disable @next/next/no-img-element */
import { useProjectStore } from "@/store";
import { useRouter } from "next/navigation";
import { ProjectUpdateForm } from "@/components/Forms/ProjectUpdate";
import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

interface ProjectUpdateFormBlockProps {
  onClose?: () => void;
  updateId?: string;
}

export const ProjectUpdateFormBlock = ({
  onClose,
  updateId,
}: ProjectUpdateFormBlockProps) => {
  const project = useProjectStore((state) => state.project);
  // Maintain state to force fresh render when updateId changes
  const [currentUpdateId, setCurrentUpdateId] = useState(updateId);
  const updateBeingEdited = updateId
    ? project?.updates.find((update) => update.uid === updateId)
    : null;
  const router = useRouter();

  // Update the component state when updateId changes
  useEffect(() => {
    if (updateId !== currentUpdateId) {
      setCurrentUpdateId(updateId);
    }
  }, [updateId, currentUpdateId]);

  // Clean up on success
  const handleSuccess = () => {
    router.refresh();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="flex flex-col w-full gap-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-black dark:text-zinc-100">
          {updateId
            ? `Edit "${updateBeingEdited?.data?.title || "Activity"}"`
            : "Add Activity"}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      <ProjectUpdateForm
        key={`form-${currentUpdateId}`}
        afterSubmit={handleSuccess}
        editId={currentUpdateId}
      />
    </div>
  );
};
