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
}: ActivityMenuProps) => {
  const buttonClassName = `group border-none ring-none font-normal bg-transparent dark:bg-transparent text-gray-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800 dark:hover:opacity-75 hover:opacity-75 flex w-full items-start justify-start rounded-md px-2 py-2 text-sm flex-row gap-2`;

  const hasAnyAction = canShare || canEdit || canDelete;

  if (!hasAnyAction) {
    return null;
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="w-max bg-transparent hover:bg-zinc-100 hover:dark:bg-zinc-800 text-black dark:text-white p-0 rounded-lg">
          <EllipsisVerticalIcon
            className="h-6 w-6 text-zinc-500"
            aria-hidden="true"
          />
        </Menu.Button>
      </div>
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
          className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black/5 focus:outline-none z-10"
        >
          <div className="flex flex-col gap-1 px-1 py-1">
            {canShare && onShare && (
              <Menu.Item>
                <Button className={buttonClassName} onClick={onShare}>
                  <ShareIcon className="w-5 h-5" />
                  Share
                </Button>
              </Menu.Item>
            )}

            {canEdit && onEdit && (
              <Menu.Item>
                <Button className={buttonClassName} onClick={onEdit}>
                  <PencilSquareIcon className="w-5 h-5" />
                  Edit
                </Button>
              </Menu.Item>
            )}

            {canDelete && onDelete && (
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
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};
