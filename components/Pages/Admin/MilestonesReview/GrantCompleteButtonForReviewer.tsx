"use client";

import { Button } from "@/components/Utilities/Button";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC } from "react";
import { useGrantCompletion } from "@/hooks/useGrantCompletion";

interface GrantCompleteButtonForReviewerProps {
  project: { uid: string };
  grant: IGrantResponse;
  text?: string;
  onComplete?: () => void;
}

export const GrantCompleteButtonForReviewer: FC<GrantCompleteButtonForReviewerProps> = ({
  grant,
  project,
  text = "Mark grant as complete",
  onComplete,
}) => {
  const { completeGrant, isCompleting } = useGrantCompletion({ onComplete });

  // Show "Marked as complete" if grant is already completed
  if (grant.completed) {
    return (
      <div className="flex flex-row items-center justify-center gap-2 rounded-md border border-emerald-600 bg-green-100 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-green-100">
        Marked as complete
        <div className="h-5 w-5">
          <CheckCircleIcon className="h-5 w-5" />
        </div>
      </div>
    );
  }

  // Only show button if grant is not completed
  if (!project) return null;

  const handleMarkAsComplete = () => {
    completeGrant(grant, project);
  };

  return (
    <Button
      onClick={handleMarkAsComplete}
      disabled={isCompleting}
      className="hover:opacity-75 flex flex-row items-center justify-center gap-2 rounded-md bg-[#17B26A] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#17B26A] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isCompleting ? "Completing..." : text}
      <div className="h-5 w-5">
        <CheckCircleIcon className="h-5 w-5" />
      </div>
    </Button>
  );
};

