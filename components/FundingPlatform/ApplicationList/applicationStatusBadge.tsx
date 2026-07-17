import { formatApplicationStatus } from "@/utilities/application-status";
import { cn } from "@/utilities/tailwind";

/**
 * Tailwind classes per application status. Single source of truth shared by the
 * applications table row and the "My Applications" inbox list item.
 */
const applicationStatusColors: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  resubmitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  under_review: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  revision_requested: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

/** Rounded status pill used in the applications table and inbox. */
export const ApplicationStatusBadge = ({
  status,
  className,
}: {
  status: string;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex px-2 py-1 rounded-full text-xs font-medium",
      applicationStatusColors[status] ||
        "bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-zinc-200",
      className
    )}
  >
    {formatApplicationStatus(status)}
  </span>
);
