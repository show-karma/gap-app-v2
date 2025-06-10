import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import {
  EllipsisVerticalIcon,
  PencilSquareIcon,
  ShareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/Utilities/Button";
import { DeleteDialog } from "@/components/DeleteDialog";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { cn } from "@/utilities/tailwind";

interface ActivityMenuProps {
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  canShare?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  isDeleting?: boolean;
  deleteTitle?: React.ReactNode;
  activityType?: string; // For determining edit capabilities
}

export const ActivityMenu = ({
  onShare,
  onEdit,
  onDelete,
  canShare = false,
  canEdit = false,
  canDelete = false,
  isDeleting = false,
  deleteTitle = "Are you sure you want to delete this item?",
  activityType,
}: ActivityMenuProps) => {
  const buttonClassName = `group border-none ring-none font-normal bg-transparent dark:bg-transparent text-gray-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800 dark:hover:opacity-75 hover:opacity-75 flex w-full items-start justify-start rounded-md px-2 py-2 text-sm flex-row gap-2`;

  // Determine which activities can be edited
  const canActuallyEdit =
    canEdit &&
    (activityType === "ProjectUpdate" || activityType === "ProjectImpact");

  const hasAnyAction = canShare || canActuallyEdit || canDelete;

  if (!hasAnyAction) {
    return null;
  }

  return (
    <div className="flex flex-row gap-2 items-center">
      {/* Share Button */}
      {canShare && onShare && (
        <Button
          className="flex flex-row gap-1 bg-transparent text-sm font-semibold text-gray-600 dark:text-zinc-100 hover:bg-transparent hover:opacity-75"
          onClick={onShare}
        >
          <ShareIcon className="h-5 w-5" />
        </Button>
      )}

      {/* Edit Button - only for ProjectUpdate and ProjectImpact */}
      {canActuallyEdit && onEdit && (
        <Button
          className="flex flex-row gap-1 bg-transparent text-sm font-semibold text-gray-600 dark:text-zinc-100 hover:bg-transparent hover:opacity-75"
          onClick={onEdit}
        >
          <PencilSquareIcon className="h-5 w-5" />
        </Button>
      )}

      {/* Options Menu with only Delete */}
      {canDelete && onDelete && (
        <Menu as="div" className="relative inline-block text-left h-6">
          <Menu.Button className="w-max h-6 bg-transparent hover:bg-zinc-100 hover:dark:bg-zinc-800 text-black dark:text-white p-0 rounded-lg">
            <EllipsisVerticalIcon
              className="h-6 w-6 text-zinc-500"
              aria-hidden="true"
            />
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
                  <DeleteDialog
                    deleteFunction={onDelete}
                    isLoading={isDeleting}
                    title={deleteTitle}
                    buttonElement={{
                      text: "Delete",
                      icon: (
                        <TrashIcon className="h-5 w-5 text-[#D92D20] dark:text-red-500" />
                      ),
                      styleClass: cn(
                        buttonClassName,
                        "text-[#D92D20] dark:text-red-500"
                      ),
                    }}
                  />
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      )}
    </div>
  );
};
