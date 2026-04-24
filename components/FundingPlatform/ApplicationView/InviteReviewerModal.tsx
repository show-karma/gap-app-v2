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
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { slackHandleSchema } from "@/utilities/validation/slack-handle";
import { telegramUsernameSchema } from "@/utilities/validation/telegram-username";

const inviteSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  telegram: telegramUsernameSchema.optional(),
  slack: slackHandleSchema.optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteReviewerModalProps {
  programId: string;
  isOpen: boolean;
  onClose: () => void;
  onInvited?: (reviewer: { name: string; email: string }) => void;
}

const InviteReviewerModal: FC<InviteReviewerModalProps> = ({
  programId,
  isOpen,
  onClose,
  onInvited,
}) => {
  const { addReviewer, isAdding } = useMilestoneReviewers(programId);

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
        await addReviewer(data);
        onInvited?.({
          name: data.name,
          email: data.email,
        });
        reset();
        onClose();
      } catch {
        // Error handled by useMilestoneReviewers (shows toast)
      }
    },
    [addReviewer, onInvited, reset, onClose]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (isAdding) return;
        reset();
        onClose();
      }
    },
    [reset, onClose, isAdding]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Milestone Reviewer</DialogTitle>
          <DialogDescription>
            Add a new reviewer who will be able to verify milestones for this program.
          </DialogDescription>
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
              disabled={isAdding}
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
              disabled={isAdding}
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
              disabled={isAdding}
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
              disabled={isAdding}
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
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? (
                <>
                  <Spinner className="h-4 w-4 mr-2 border-2" />
                  Inviting...
                </>
              ) : (
                "Invite Reviewer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteReviewerModal;
