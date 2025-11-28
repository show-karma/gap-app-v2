import { PencilSquareIcon, ShareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Button } from "@/components/Utilities/Button";
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
  const buttonClassName = `group shadow-none justify-center items-center flex h-max border-none ring-none font-normal bg-transparent dark:bg-transparent text-gray-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800 dark:hover:opacity-75 hover:opacity-75 flex w-full items-start justify-start rounded-md px-2 py-2 text-sm flex-row gap-2`;

  // Determine which activities can be edited
  const canActuallyEdit =
    canEdit && (activityType === "ProjectUpdate" || activityType === "ProjectImpact");

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
        <DeleteDialog
          deleteFunction={onDelete}
          isLoading={isDeleting}
          title={deleteTitle}
          buttonElement={{
            text: "",
            icon: <TrashIcon className="h-6 w-6 text-[#D92D20] dark:text-red-500" />,
            styleClass: cn(buttonClassName, "text-[#D92D20] dark:text-red-500 w-max p-0"),
          }}
        />
      )}
    </div>
  );
};
