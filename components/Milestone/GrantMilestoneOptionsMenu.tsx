"use client";
import { Menu, Transition } from "@headlessui/react";
import { CheckCircleIcon, EllipsisVerticalIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Fragment } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Button } from "@/components/Utilities/Button";
import { useMilestone } from "@/hooks/useMilestone";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { cn } from "@/utilities/tailwind";

// Common button styling
const buttonClassName = `group border-none ring-none font-normal bg-transparent dark:bg-transparent text-gray-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800 dark:hover:opacity-75 hover:opacity-75 flex w-full items-start justify-start rounded-md px-2 py-2 text-sm flex-row gap-2`;

interface GrantMilestoneOptionsMenuProps {
  milestone: UnifiedMilestone;
  completeFn: (completeState: boolean) => void;
  alreadyCompleted: boolean;
}

export const GrantMilestoneOptionsMenu = ({
  milestone,
  completeFn,
  alreadyCompleted,
}: GrantMilestoneOptionsMenuProps) => {
  const { isDeleting, multiGrantDelete } = useMilestone();

  // Wrap the multiGrantDelete function to ensure it returns void
  const handleDelete = async () => {
    await multiGrantDelete(milestone);
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="w-max bg-transparent hover:bg-zinc-100 hover:dark:bg-zinc-800 text-black dark:text-white p-0 rounded-lg">
        <EllipsisVerticalIcon className="h-6 w-6 text-zinc-500" aria-hidden="true" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          modal
          className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black/5 focus:outline-none z-50"
        >
          <div className="flex flex-col gap-1 px-1 py-1">
            <Menu.Item>
              <Button
                className={buttonClassName}
                onClick={() => completeFn(true)}
                disabled={alreadyCompleted}
              >
                <CheckCircleIcon className="w-5 h-5" />
                Mark as Complete
              </Button>
            </Menu.Item>
            <Menu.Item>
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
                    <TrashIcon
                      className={"h-5 w-5 text-[#D92D20] dark:text-red-500"}
                      aria-hidden="true"
                    />
                  ),
                  text: "Delete",
                  styleClass: cn(buttonClassName, "text-[#D92D20] dark:text-red-500"),
                }}
              />
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};
