"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PendingAgentWrite } from "@/services/pending-agent-writes.service";
import { renderRelativeTime } from "@/utilities/formatRelativeTime";
import { cn } from "@/utilities/tailwind";
import { AgentActionConfirmDialog, type AgentActionKind } from "./AgentActionConfirmDialog";

interface PendingActionRowProps {
  write: PendingAgentWrite;
  isBusy: boolean;
  isHighlighted: boolean;
  onApprove: (write: PendingAgentWrite) => Promise<void>;
  onReject: (write: PendingAgentWrite) => Promise<void>;
}

export const PendingActionRow = memo(function PendingActionRow({
  write,
  isBusy,
  isHighlighted,
  onApprove,
  onReject,
}: PendingActionRowProps) {
  const [action, setAction] = useState<AgentActionKind | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rowRef = useRef<HTMLLIElement>(null);

  // Deep-link target (approvalUrl `?item=<id>`): scroll the highlighted row into
  // view once when it mounts / becomes the target.
  useEffect(() => {
    if (isHighlighted) {
      rowRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const handleConfirm = async () => {
    const current = action;
    if (!current) return;
    setIsSubmitting(true);
    try {
      if (current === "approve") {
        await onApprove(write);
      } else {
        await onReject(write);
      }
    } finally {
      setIsSubmitting(false);
      setAction(null);
    }
  };

  return (
    <li
      ref={rowRef}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card p-5",
        isHighlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {write.label}
          </span>
          {write.clientName ? (
            <span className="text-xs text-muted-foreground">via {write.clientName}</span>
          ) : null}
        </div>
        <h3 className="text-base font-semibold text-foreground">{write.summary}</h3>
        <p className="break-all font-mono text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{write.method}</span> {write.path}
        </p>
        <p className="text-xs text-muted-foreground">
          Requested {renderRelativeTime(write.createdAt)} · Expires{" "}
          {renderRelativeTime(write.expiresAt)}
        </p>
      </div>

      <div className="flex flex-row justify-end gap-3">
        <Button variant="outline" size="sm" disabled={isBusy} onClick={() => setAction("reject")}>
          Reject
        </Button>
        <Button size="sm" disabled={isBusy} onClick={() => setAction("approve")}>
          Approve
        </Button>
      </div>

      <AgentActionConfirmDialog
        write={write}
        action={action}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirm}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setAction(null);
        }}
      />
    </li>
  );
});
