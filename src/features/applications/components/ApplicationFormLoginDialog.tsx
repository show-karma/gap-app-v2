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

interface ApplicationFormLoginDialogProps {
  open: boolean;
  onCancel: () => void;
  onConnect: () => void;
}

export function ApplicationFormLoginDialog({
  open,
  onCancel,
  onConnect,
}: ApplicationFormLoginDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Wallet Required</DialogTitle>
          <DialogDescription>
            You need to connect your wallet to submit an application. This ensures your application
            is securely linked to your wallet address.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConnect}>Connect Wallet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
