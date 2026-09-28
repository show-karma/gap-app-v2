"use client";

import type { FC, KeyboardEvent } from "react";
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
  const hintId = `${inputId}-hint`;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape" && !isSubmitting) {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border bg-secondary p-4">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
          Verify this milestone
        </label>
        <p id={hintId} className="text-xs text-muted-foreground">
          Your verification is recorded on-chain under your wallet. Add a note for the grantee if
          you have one.
        </p>
      </div>
      <Textarea
        id={inputId}
        aria-describedby={hintId}
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Optional note, for example what you checked"
        rows={3}
        autoFocus
        disabled={isSubmitting}
        className="min-h-[72px] bg-background"
      />
      <div className="flex flex-row-reverse flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onSubmit}
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          Verify milestone
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
