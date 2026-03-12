"use client";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import { useState } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Button } from "@/components/Utilities/Button";
import { useMilestone } from "@/hooks/useMilestone";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { cn } from "@/utilities/tailwind";

const MilestoneEditDialog = dynamic(
  () => import("@/components/Milestone/MilestoneEditDialog").then((mod) => mod.MilestoneEditDialog),
  { ssr: false }
);

// Common button styling
const buttonClassName = `group border-none ring-none font-normal bg-transparent dark:bg-transparent text-gray-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800 dark:hover:opacity-75 hover:opacity-75 flex w-full items-start justify-start rounded-md px-2 py-2 text-sm flex-row gap-2`;

interface GrantMilestoneSimpleOptionsMenuProps {
  milestone: UnifiedMilestone;
}

export const GrantMilestoneSimpleOptionsMenu = ({
  milestone,
}: GrantMilestoneSimpleOptionsMenuProps) => {
  const { isDeleting, multiGrantDelete } = useMilestone();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Wrap the multiGrantDelete function to ensure it returns void
  const handleDelete = async () => {
    await multiGrantDelete(milestone);
  };

  return (
    <div className="flex flex-row items-center gap-1">
      <Button
        className={cn(buttonClassName, "w-max p-2")}
        onClick={() => setIsEditDialogOpen(true)}
      >
        <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
      </Button>
      <DeleteDialog
        title={
          milestone.mergedGrants && milestone.mergedGrants.length > 1
            ? "Are you sure you want to delete these milestones?"
            : "Are you sure you want to delete this milestone?"
        }
        deleteFunction={handleDelete}
        isLoading={isDeleting}
        buttonElement={{
          icon: (
            <TrashIcon className={"h-5 w-5 text-[#D92D20] dark:text-red-500"} aria-hidden="true" />
          ),
          text: "",
          styleClass: cn(buttonClassName, "text-[#D92D20] dark:text-red-500 w-max"),
        }}
      />
      <MilestoneEditDialog
        milestone={milestone}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
      />
    </div>
  );
};
