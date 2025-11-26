"use client";
import { ProjectUpdateForm } from "@/components/Forms/ProjectUpdate";
import { useProgressModalStore } from "@/store/modals/progress";

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
