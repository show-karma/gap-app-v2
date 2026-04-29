"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type FC, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ReviewerType } from "@/hooks/useReviewerAssignment";
import { cn } from "@/utilities/tailwind";
import { slackHandleSchema } from "@/utilities/validation/slack-handle";
import { telegramUsernameSchema } from "@/utilities/validation/telegram-username";

const inviteSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  telegram: telegramUsernameSchema.optional(),
  slack: slackHandleSchema.optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export interface InvitedReviewer {
  name: string;
  email: string;
  publicAddress?: string;
}

interface InviteReviewerModalProps {
  programId: string;
  isOpen: boolean;
  onClose: () => void;
  reviewerType?: ReviewerType;
  onInviteReviewer: (data: InviteFormData) => Promise<InvitedReviewer>;
  isInviting?: boolean;
  onInvited?: (reviewer: InvitedReviewer) => void;
}

const InviteReviewerModal: FC<InviteReviewerModalProps> = ({
  programId: _programId,
  isOpen,
  onClose,
  reviewerType = ReviewerType.MILESTONE,
  onInviteReviewer,
  isInviting = false,
  onInvited,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      name: "",
      email: "",
      telegram: "",
      slack: "",
    },
  });

  const onSubmit = useCallback(
    async (data: InviteFormData) => {
      try {
        const reviewer = await onInviteReviewer(data);
        onInvited?.(reviewer);
        reset();
        onClose();
      } catch {
        // Error handled by parent hook callback (shows toast)
      }
    },
    [onInviteReviewer, onInvited, reset, onClose]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (isInviting) return;
        reset();
        onClose();
      }
    },
    [reset, onClose, isInviting]
  );

  const reviewerTypeLabel =
    reviewerType === ReviewerType.APP ? "application reviewer" : "milestone reviewer";
  const inviteActionLabel =
    reviewerType === ReviewerType.APP ? "Invite Application Reviewer" : "Invite Reviewer";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[425px]",
          isInviting &&
            "[&_[data-testid=modal-close-button]]:pointer-events-none [&_[data-testid=modal-close-button]]:opacity-30"
        )}
      >
        <DialogHeader>
          <DialogTitle>{inviteActionLabel}</DialogTitle>
          <DialogDescription>Add a new {reviewerTypeLabel} for this program.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(onSubmit)(e);
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="reviewer-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Name *
            </label>
            <Input
              id="reviewer-name"
              {...register("name")}
              placeholder="Reviewer name"
              disabled={isInviting}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label
              htmlFor="reviewer-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email *
            </label>
            <Input
              id="reviewer-email"
              type="email"
              {...register("email")}
              placeholder="reviewer@example.com"
              disabled={isInviting}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label
              htmlFor="reviewer-telegram"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Telegram (optional)
            </label>
            <Input
              id="reviewer-telegram"
              {...register("telegram")}
              placeholder="username"
              aria-describedby="reviewer-telegram-helper"
              disabled={isInviting}
            />
            <p
              id="reviewer-telegram-helper"
              className="mt-1 text-xs text-gray-500 dark:text-gray-400"
            >
              Reviewer&apos;s Telegram @username (without @). Used to tag them in group
              notifications.
            </p>
            {errors.telegram && (
              <p className="mt-1 text-xs text-red-500">{errors.telegram.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="reviewer-slack"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Slack (optional)
            </label>
            <Input
              id="reviewer-slack"
              {...register("slack")}
              placeholder="username"
              aria-describedby="reviewer-slack-helper"
              disabled={isInviting}
            />
            <p id="reviewer-slack-helper" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Reviewer&apos;s Slack handle (without @). Used to tag them in team channels.
            </p>
            {errors.slack && <p className="mt-1 text-xs text-red-500">{errors.slack.message}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isInviting}>
              {isInviting ? (
                <>
                  <Spinner className="h-4 w-4 mr-2 border-2" />
                  Inviting...
                </>
              ) : (
                inviteActionLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteReviewerModal;
