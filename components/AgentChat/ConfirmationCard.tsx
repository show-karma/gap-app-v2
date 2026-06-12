"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ToolResultData } from "@/store/agentChat";
import { flattenPreviewData, formatToolLabel, humanizeLabel } from "./ConfirmationCard.helpers";

interface ConfirmationCardProps {
  toolResult: ToolResultData;
  onApprove: () => void;
  onDeny: () => void;
  disabled?: boolean;
}

export function ConfirmationCard({
  toolResult,
  onApprove,
  onDeny,
  disabled = false,
}: ConfirmationCardProps) {
  const { toolName, data, status } = toolResult;
  const label = formatToolLabel(toolName);
  const rows = flattenPreviewData(data);
  const isResolved = status === "approved" || status === "denied";

  return (
    <div
      className="my-2 rounded-lg border border-border bg-muted/50 p-3 space-y-2.5"
      data-testid="confirmation-card"
    >
      <div className="flex items-center gap-2">
        <Badge variant="outline">Action</Badge>
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>

      {rows.length > 0 && (
        <dl className="text-xs space-y-1">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5">
              <dt className="font-medium text-muted-foreground">{humanizeLabel(row.label)}</dt>
              <dd className="text-foreground break-words">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {isResolved ? (
        <Badge
          variant={status === "approved" ? "default" : "destructive"}
          data-testid="confirmation-status"
        >
          {status === "approved" ? "Approved" : "Denied"}
        </Badge>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onApprove}
            disabled={disabled}
            data-testid="confirm-approve"
          >
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeny}
            disabled={disabled}
            data-testid="confirm-deny"
          >
            Deny
          </Button>
        </div>
      )}
    </div>
  );
}
