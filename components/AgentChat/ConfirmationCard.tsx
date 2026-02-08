"use client";

import type { ToolResultData } from "@/store/agentChat";

/** Human-readable label from a preview tool name, e.g. "preview_update_project" → "Update Project" */
export function formatToolLabel(toolName: string): string {
  return toolName
    .replace(/^preview_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Flatten a nested data object into "key: value" display rows */
export function flattenPreviewData(
  data: Record<string, unknown>,
  prefix = ""
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];

  for (const [key, val] of Object.entries(data)) {
    const label = prefix ? `${prefix}.${key}` : key;

    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      rows.push(...flattenPreviewData(val as Record<string, unknown>, label));
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
      className="my-2 rounded-lg border border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-950 p-3"
      data-testid="confirmation-card"
    >
      <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
        Proposed: {label}
      </p>

      {rows.length > 0 && (
        <dl className="text-xs space-y-1 mb-3">
          {rows.map((row) => (
            <div key={row.label} className="flex gap-2">
              <dt className="font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">
                {row.label}:
              </dt>
              <dd className="text-gray-900 dark:text-gray-100 break-all">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {isResolved ? (
        <p
          className={`text-xs font-medium ${
            status === "approved"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
          data-testid="confirmation-status"
        >
          {status === "approved" ? "Approved" : "Denied"}
        </p>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={disabled}
            className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="confirm-approve"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={onDeny}
            disabled={disabled}
            className="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="confirm-deny"
          >
            Deny
          </button>
        </div>
      )}
    </div>
  );
}
