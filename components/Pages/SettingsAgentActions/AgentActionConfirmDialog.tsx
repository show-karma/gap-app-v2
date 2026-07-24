"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PendingAgentWrite } from "@/services/pending-agent-writes.service";

export type AgentActionKind = "approve" | "reject";

interface AgentActionConfirmDialogProps {
  write: PendingAgentWrite;
  action: AgentActionKind | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

function prettyBody(body: unknown): string {
  if (body == null) return "";
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    // SUPPRESSED: a body that can't be serialized (circular ref) is not
    // actionable here — we still show the request meta, just not the JSON.
    return String(body);
  }
}

/**
 * Confirmation dialog shown before BOTH approve and reject. It surfaces the
 * FULL staged request — summary, method, path, and the pretty-printed JSON body
 * the write will execute with — so the human is deciding on exactly what runs,
 * not a paraphrase. Approve is the consequential action (it executes the write)
 * and is styled primary; reject is styled destructive.
 */
export function AgentActionConfirmDialog({
  write,
  action,
  isSubmitting,
  onConfirm,
  onOpenChange,
}: AgentActionConfirmDialogProps) {
  const isApprove = action === "approve";
  const body = prettyBody(write.body);

  return (
    <Dialog open={action !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isApprove ? "Approve this agent action?" : "Reject this agent action?"}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? "Approving runs the exact request below as you. Review it before continuing — this cannot be undone."
              : "Rejecting discards this request. The agent will be told the action was declined."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Summary
            </p>
            <p className="mt-1 text-sm text-foreground">{write.summary}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Request
            </p>
            <p className="mt-1 break-all font-mono text-sm text-foreground">
              <span className="font-semibold">{write.method}</span> {write.path}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Body
            </p>
            {body ? (
              <pre className="mt-1 max-h-64 overflow-auto overflow-x-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
                {body}
              </pre>
            ) : (
              <p className="mt-1 text-sm italic text-muted-foreground">No request body.</p>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-row justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={isApprove ? "default" : "destructive"}
            onClick={onConfirm}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            {isApprove ? "Approve & run" : "Reject"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
