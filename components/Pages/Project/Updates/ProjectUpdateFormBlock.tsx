/* eslint-disable @next/next/no-img-element */
import { useProjectStore } from "@/store";

import { useQueryState } from "nuqs";
import { useRouter, useSearchParams } from "next/navigation";
import { ProjectUpdateForm } from "@/components/Forms/ProjectUpdate";
import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

interface ProjectUpdateFormBlockProps {
  onClose?: () => void;
}

export const ProjectUpdateFormBlock = ({
  onClose,
}: ProjectUpdateFormBlockProps) => {
  const [, changeTab] = useQueryState("tab");
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const project = useProjectStore((state) => state.project);
  const updateBeingEdited = editId
    ? project?.updates.find((update) => update.uid === editId)
    : null;
  const router = useRouter();

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
          {editId ? "Edit Activity" : "Add Activity"}
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

      <ProjectUpdateForm afterSubmit={handleSuccess} />
    </div>
  );
};
