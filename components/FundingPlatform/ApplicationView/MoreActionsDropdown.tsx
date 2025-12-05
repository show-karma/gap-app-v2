"use client";

import { Menu, Transition } from "@headlessui/react";
import {
  EllipsisHorizontalIcon,
  LinkIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { type FC, Fragment } from "react";
import toast from "react-hot-toast";
import { cn } from "@/utilities/tailwind";

export interface MoreActionsDropdownProps {
  referenceNumber: string;
  onDeleteClick: () => void;
  canDelete: boolean;
  isDeleting?: boolean;
  onEditClick?: () => void;
  canEdit?: boolean;
}

export const MoreActionsDropdown: FC<MoreActionsDropdownProps> = ({
  referenceNumber: _referenceNumber,
  onDeleteClick,
  canDelete,
  isDeleting = false,
  onEditClick,
  canEdit = false,
}) => {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch (_error) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button
        className={cn(
          "inline-flex items-center justify-center rounded-lg p-2",
          "text-gray-700 dark:text-gray-300",
          "bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600",
          "border border-gray-200 dark:border-gray-600",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "transition-colors"
        )}
        aria-label="More actions"
      >
        <EllipsisHorizontalIcon className="w-5 h-5" />
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
          className={cn(
            "absolute right-0 mt-2 w-48 origin-top-right",
            "rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
            "bg-white dark:bg-zinc-800",
            "border border-gray-200 dark:border-gray-700",
            "z-50"
          )}
        >
          <div className="py-1">
            {/* Copy Link */}
            <Menu.Item>
              {({ active }) => (
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-sm",
                    active
                      ? "bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-white"
                      : "text-gray-700 dark:text-gray-300"
                  )}
                >
                  <LinkIcon className="w-4 h-4" />
                  Copy Link
                </button>
              )}
            </Menu.Item>

            {/* Edit Application - Only shown if user has permission */}
            {canEdit && onEditClick && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={onEditClick}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-sm",
                      active
                        ? "bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-white"
                        : "text-gray-700 dark:text-gray-300"
                    )}
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                    Edit Application
                  </button>
                )}
              </Menu.Item>
            )}

            {/* Delete Application - Only shown if user has permission */}
            {canDelete && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <Menu.Item>
                  {({ active }) => (
                    <button
                      type="button"
                      onClick={onDeleteClick}
                      disabled={isDeleting}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-sm",
                        "text-red-600 dark:text-red-400",
                        active && "bg-red-50 dark:bg-red-900/20",
                        isDeleting && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <TrashIcon className="w-4 h-4" />
                      {isDeleting ? "Deleting..." : "Delete Application"}
                    </button>
                  )}
                </Menu.Item>
              </>
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default MoreActionsDropdown;
