import { FolderOpenIcon } from "@heroicons/react/24/outline";
import { cn } from "@/utilities/tailwind";

interface NoProgramsEmptyStateProps {
  title?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NoProgramsEmptyState({
  title = "No programs yet",
  action,
  className,
}: NoProgramsEmptyStateProps) {
  return (
    <div className={cn("text-center py-12", className)}>
      <FolderOpenIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      {action}
    </div>
  );
}
