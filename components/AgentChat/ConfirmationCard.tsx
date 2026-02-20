"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ToolResultData } from "@/store/agentChat";

/** Human-readable label from a preview tool name, e.g. "preview_update_project" → "Update Project" */
export function formatToolLabel(toolName: string): string {
  return toolName
    .replace(/^preview_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Turn a dotted key path like "changes.missionSummary.proposed" into
 * a human-readable label like "Mission Summary (proposed)".
 */
export function humanizeLabel(raw: string): string {
  const parts = raw.split(".").filter((p) => p !== "changes");

  const qualifier = parts.at(-1);
  const isQualifier = qualifier === "current" || qualifier === "proposed";
  const fieldParts = isQualifier ? parts.slice(0, -1) : parts;

  const fieldName = fieldParts
    .map((p) =>
      p
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    )
    .join(" > ");

  if (isQualifier) {
    return `${fieldName} (${qualifier})`;
  }
  return fieldName;
}

/** Flatten a nested data object into "key: value" display rows (max 10 levels deep) */
export function flattenPreviewData(
  data: Record<string, unknown>,
  prefix = "",
  depth = 0
): Array<{ label: string; value: string }> {
  const MAX_DEPTH = 10;
  const rows: Array<{ label: string; value: string }> = [];

  for (const [key, val] of Object.entries(data)) {
    const label = prefix ? `${prefix}.${key}` : key;

    if (val !== null && typeof val === "object" && !Array.isArray(val) && depth < MAX_DEPTH) {
      rows.push(...flattenPreviewData(val as Record<string, unknown>, label, depth + 1));
    } else {
      rows.push({ label, value: String(val ?? "") });
    }
  }

  return rows;
}

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
