"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReEvaluateInternalAI } from "@/hooks/useReEvaluateInternalAI";

export interface ReEvaluateInternalButtonProps {
  referenceNumber: string;
  onEvaluationComplete?: () => void | Promise<void>;
  disabled?: boolean;
}

/**
 * Re-evaluation trigger for internal AI evaluations. Renders a button
 * that opens a confirmation dialog (this overwrites the prior internal
 * evaluation, which reviewers may have already read) and on confirm
 * runs the evaluation via the existing /evaluate-internal endpoint.
 *
 * Use this in place of the regular AIEvaluationButton when an internal
 * evaluation already exists and we need explicit confirmation before
 * overwriting it.
 */
export const ReEvaluateInternalButton: FC<ReEvaluateInternalButtonProps> = ({
  referenceNumber,
  onEvaluationComplete,
  disabled = false,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const mutation = useReEvaluateInternalAI({ onSuccess: onEvaluationComplete });

  const handleOpen = () => setIsDialogOpen(true);
  const handleClose = () => {
    if (mutation.isPending) return;
    setIsDialogOpen(false);
  };

  const handleConfirm = async () => {
    try {
      await mutation.mutateAsync(referenceNumber);
      toast.success("Internal AI evaluation re-run successfully");
      setIsDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to re-run evaluation";
      toast.error(message);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="secondary"
        disabled={disabled || mutation.isPending}
        aria-busy={mutation.isPending}
        className="flex items-center space-x-2 px-3 py-2 text-sm"
      >
        <ArrowPathIcon className={`w-4 h-4 ${mutation.isPending ? "animate-spin" : ""}`} />
        <span>{mutation.isPending ? "Re-evaluating..." : "Re-evaluate"}</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? handleOpen() : handleClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-run internal AI evaluation?</DialogTitle>
            <DialogDescription>
              This overwrites the existing internal evaluation with a fresh run against current
              application data, the latest configured prompt, and (when configured) the latest Karma
              project state. The previous evaluation will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={mutation.isPending}
              aria-busy={mutation.isPending}
            >
              {mutation.isPending ? "Re-evaluating..." : "Re-evaluate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
