"use client";
import { ProjectObjectiveForm } from "@/components/Forms/ProjectObjective";
import { Button } from "@/components/Utilities/Button";
import { MESSAGES } from "@/utilities/messages";
import { useParams } from "next/navigation";
import { useState } from "react";

export const SetAnObjective = ({
  hasObjectives,
}: {
  hasObjectives: boolean;
}) => {
  const { projectId } = useParams();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreating = (isCreating: boolean) => {
    setIsCreating(isCreating);
  };

  if (isCreating) return <ProjectObjectiveForm stateHandler={handleCreating} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col border border-dashed border-brand-blue p-6 gap-4 rounded-xl w-full bg-[#F5F8FF] dark:bg-blue-950/20">
        <div className="flex flex-col gap-4 items-start justify-start">
          <p className="text-zinc-900 dark:text-zinc-300 font-normal text-xl">
            {hasObjectives ? "Set an Objective" : "Set your first Objective"}
          </p>
          <p className="text-[#1D2939] dark:text-zinc-300 p-4 border border-[#DCDFEA] rounded-md font-normal text-base bg-transparent">
            Your roadmap needs objectives. Define clear objectives to guide your
            progress and stay on course.
          </p>
        </div>

        <Button
          className="px-5 py-3 border w-max border-brand-blue bg-transparent text-brand-blue font-semibold text-sm hover:bg-brand-blue/10"
          onClick={() => setIsCreating(true)}
        >
          Create
        </Button>
      </div>
    </div>
  );
};
