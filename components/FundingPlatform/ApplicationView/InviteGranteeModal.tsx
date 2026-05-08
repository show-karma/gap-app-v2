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
import { cn } from "@/utilities/tailwind";

const inviteGranteeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
});

type InviteGranteeFormData = z.infer<typeof inviteGranteeSchema>;

export interface InvitedGrantee {
  name: string;
  email: string;
}

interface InviteGranteeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteGrantee: (data: InvitedGrantee) => Promise<unknown>;
  isInviting?: boolean;
  onInvited: (grantee: InvitedGrantee) => void;
}

const InviteGranteeModal: FC<InviteGranteeModalProps> = ({
  isOpen,
  onClose,
  onInviteGrantee,
  isInviting = false,
  onInvited,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteGranteeFormData>({
    resolver: zodResolver(inviteGranteeSchema),
    defaultValues: { name: "", email: "" },
  });

  const onSubmit = useCallback(
    async (data: InviteGranteeFormData) => {
      try {
        await onInviteGrantee(data);
        onInvited(data);
        reset();
        onClose();
      } catch {
        // Error handled by parent hook callback (shows toast)
      }
    },
    [onInviteGrantee, onInvited, reset, onClose]
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
          <DialogTitle>Invite Grantee</DialogTitle>
          <DialogDescription>
            Add a grantee to this application&apos;s team. They&apos;ll be able to receive
            @-mentions and notifications about this application.
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
              htmlFor="grantee-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Name *
            </label>
            <Input
              id="grantee-name"
              {...register("name")}
              placeholder="Grantee name"
              disabled={isInviting}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label
              htmlFor="grantee-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email *
            </label>
            <Input
              id="grantee-email"
              type="email"
              {...register("email")}
              placeholder="grantee@example.com"
              disabled={isInviting}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
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
                "Invite Grantee"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteGranteeModal;
