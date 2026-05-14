"use client";

import { UserGroupIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onAddNew: () => void;
}

const EmptyState: FC<EmptyStateProps> = ({ onAddNew }) => {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-4 py-12 text-center"
      data-testid="reviewer-picker-empty-state"
    >
      <UserGroupIcon className="h-16 w-16 text-gray-300 dark:text-gray-600" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
          No community reviewers yet
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          No reviewers have been added to any program in this community. Add someone below.
        </p>
      </div>
      <Button onClick={onAddNew} data-testid="empty-state-add-new">
        + Add new reviewer
      </Button>
    </div>
  );
};

export default EmptyState;
