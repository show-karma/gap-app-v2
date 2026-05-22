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
import { useReEvaluateKarmaProfileAI } from "@/hooks/useReEvaluateKarmaProfileAI";

interface ReEvaluateKarmaProfileButtonProps {
  referenceNumber: string;
  onEvaluationComplete?: () => void | Promise<void>;
  disabled?: boolean;
}

/**
 * Re-run trigger for Karma Profile (track-record) evaluations. Confirms
 * before overwriting the prior verdict since admins may have already read
 * it. The backend short-circuits (no LLM call) when the content
 * fingerprint matches the prior run — so this is cheap when project state
 * hasn't changed.
 */
export const ReEvaluateKarmaProfileButton: FC<ReEvaluateKarmaProfileButtonProps> = ({
  referenceNumber,
  onEvaluationComplete,
  disabled = false,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const mutation = useReEvaluateKarmaProfileAI({ onSuccess: onEvaluationComplete });

  const handleOpen = () => setIsDialogOpen(true);
  const handleClose = () => {
    if (mutation.isPending) return;
    setIsDialogOpen(false);
  };

  const handleConfirm = async () => {
    try {
      await mutation.mutateAsync(referenceNumber);
      toast.success("Track-record evaluation re-run successfully");
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
        className="flex items-center gap-x-2 px-3 py-2 text-sm"
      >
        <ArrowPathIcon className={`w-4 h-4 ${mutation.isPending ? "animate-spin" : ""}`} />
        <span>{mutation.isPending ? "Re-evaluating..." : "Re-evaluate"}</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? handleOpen() : handleClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-run track-record evaluation?</DialogTitle>
            <DialogDescription>
              This overwrites the existing track-record evaluation with a fresh run against the
              latest Karma project state (new completed milestones, new grants, etc.) and the latest
              configured prompt. The previous evaluation will be lost.
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
