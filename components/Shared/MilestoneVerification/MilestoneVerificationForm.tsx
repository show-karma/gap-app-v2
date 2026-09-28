"use client";

import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MilestoneVerificationFormProps {
  milestoneUID: string;
  comment: string;
  onCommentChange: (comment: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const MilestoneVerificationForm: FC<MilestoneVerificationFormProps> = ({
  milestoneUID,
  comment,
  onCommentChange,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const inputId = `verify-comment-${milestoneUID}`;

  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/10">
      <label htmlFor={inputId} className="text-sm font-semibold text-green-900 dark:text-green-200">
        Verify Milestone Completion
      </label>
      <Textarea
        id={inputId}
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
        placeholder="Add verification comment (optional)..."
        rows={3}
        disabled={isSubmitting}
        className="bg-white dark:bg-zinc-800"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onSubmit}
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          Verify
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
