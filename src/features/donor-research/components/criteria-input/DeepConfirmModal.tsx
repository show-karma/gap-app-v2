"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

interface DeepConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

/**
 * Deep-mode authorization gate (U13a). The advisor must explicitly tick
 * a checkbox confirming they authorize Karma to contact organizations on
 * their behalf via auto-call + email. Per the plan, this modal cannot be
 * bypassed — the modal is the only path from the form submit to the
 * create-report POST when `mode === 'deep'`.
 */
export function DeepConfirmModal({ open, onClose, onConfirm }: DeepConfirmModalProps) {
  const [ack, setAck] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">
            Confirm Deep mode authorization
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            By submitting this Deep report, you authorize Karma to contact these nonprofit
            organizations on your behalf via auto-call (with AI-voice identification) and email.
            Replies will be ingested into your report over the next 1–3 days.
          </Dialog.Description>

          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-1"
            />
            <span>
              I authorize this outreach on behalf of myself / my firm. I understand my daily Deep
              limit applies.
            </span>
          </label>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAck(false);
                onClose();
              }}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!ack}
              onClick={async () => {
                await onConfirm();
                setAck(false);
              }}
              className="rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Start Deep report
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
