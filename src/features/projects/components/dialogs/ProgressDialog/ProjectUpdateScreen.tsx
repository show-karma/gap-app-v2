"use client";
import { ProjectUpdateForm } from "@/features/projects/components/forms/project-update-form";
import { useProgressModalStore } from "@/features/modals/lib/stores/progress";

export const ProjectUpdateScreen = () => {
  const { closeProgressModal } = useProgressModalStore();

  return (
    <div className="flex flex-col gap-2">
      <ProjectUpdateForm
        afterSubmit={() => {
          closeProgressModal();
        }}
      />
    </div>
  );
};
