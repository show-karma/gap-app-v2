"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CommitWeightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  isPending?: boolean;
  onConfirm: () => void;
}

/**
 * Confirmation gate for a ranking commit (DEV-418 U8). Committing weights or a
 * manual order can regenerate (and null) candidate one-pagers, so it is a
 * destructive action per the pre-PR checklist and routes through this dialog.
 * The copy is supplied by the caller (it knows the flip count and pluralizes).
 */
export function CommitWeightsDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isPending = false,
  onConfirm,
}: CommitWeightsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} isLoading={isPending}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
