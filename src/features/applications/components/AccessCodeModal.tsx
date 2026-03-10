"use client";

import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface AccessCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

export function AccessCodeModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  error,
}: AccessCodeModalProps) {
  const [accessCode, setAccessCode] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAccessCode("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!accessCode.trim()) return;
    await onSubmit(accessCode.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" data-testid="lock-icon" />
            Access Code Required
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This application requires an access code to unlock. Enter the code shared with you by
            the program administrator.
          </p>
          <div className="space-y-2">
            <label htmlFor="access-code-modal-input" className="text-sm font-medium">
              Access Code
            </label>
            <Input
              id="access-code-modal-input"
              placeholder="Enter code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={isLoading}
              className="font-mono"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!accessCode.trim() || isLoading}
            isLoading={isLoading}
          >
            Unlock Form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
