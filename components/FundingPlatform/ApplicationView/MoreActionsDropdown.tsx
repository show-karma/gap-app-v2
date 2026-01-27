"use client";

import {
  ClipboardDocumentCheckIcon,
  EllipsisHorizontalIcon,
  LinkIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { FC } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utilities/tailwind";

export interface MoreActionsDropdownProps {
  referenceNumber: string;
  onDeleteClick: () => void;
  canDelete: boolean;
  isDeleting?: boolean;
  onEditClick?: () => void;
  canEdit?: boolean;
  onEditPostApprovalClick?: () => void;
  canEditPostApproval?: boolean;
}

export const MoreActionsDropdown: FC<MoreActionsDropdownProps> = ({
  referenceNumber: _referenceNumber,
  onDeleteClick,
  canDelete,
  isDeleting = false,
  onEditClick,
  canEdit = false,
  onEditPostApprovalClick,
  canEditPostApproval = false,
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "text-gray-700 dark:text-gray-300",
            "bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600",
            "border border-gray-200 dark:border-gray-600"
          )}
          aria-label="More actions"
        >
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={cn(
          "w-48",
          "bg-white dark:bg-zinc-800",
          "border border-gray-200 dark:border-gray-700"
        )}
      >
        {/* Copy Link */}
        <DropdownMenuItem
          onClick={handleCopyLink}
          className="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer"
        >
          <LinkIcon className="w-4 h-4" />
          Copy Link
        </DropdownMenuItem>

        {/* Edit Application - Only shown if user has permission */}
        {canEdit && onEditClick && (
          <DropdownMenuItem
            onClick={onEditClick}
            className="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer"
          >
            <PencilSquareIcon className="w-4 h-4" />
            Edit Application
          </DropdownMenuItem>
        )}

        {/* Edit Post-Approval Data - Only shown for approved applications with post-approval data */}
        {canEditPostApproval && onEditPostApprovalClick && (
          <DropdownMenuItem
            onClick={onEditPostApprovalClick}
            className="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer"
          >
            <ClipboardDocumentCheckIcon className="w-4 h-4" />
            Edit Post-Approval
          </DropdownMenuItem>
        )}

        {/* Delete Application - Only shown if user has permission */}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDeleteClick}
              disabled={isDeleting}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer",
                "text-red-600 dark:text-red-400",
                "focus:text-red-600 focus:dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20",
                isDeleting && "opacity-50 cursor-not-allowed"
              )}
            >
              <TrashIcon className="w-4 h-4" />
              {isDeleting ? "Deleting..." : "Delete Application"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MoreActionsDropdown;
